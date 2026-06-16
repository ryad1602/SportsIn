package org.SportsIn.services;

import org.SportsIn.model.EvaluationResult;
import org.SportsIn.model.MetricValue;
import org.SportsIn.model.Session;
import org.SportsIn.model.SessionRepository;
import org.SportsIn.model.SessionState;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SessionService {

    // Un écart brut >= ce seuil est irréversible par les bonus
    private static final double RAW_DOMINANCE_THRESHOLD = 2.0;

    private final SessionRepository sessionRepository;
    private final TerritoryService territoryService;
    private final XpGrantService xpGrantService;
    private final RuleEvaluationService ruleEvaluationService;
    private final ContextService contextService;

    public SessionService(SessionRepository sessionRepository,
                          TerritoryService territoryService,
                          XpGrantService xpGrantService,
                          RuleEvaluationService ruleEvaluationService,
                          ContextService contextService) {
        this.sessionRepository = sessionRepository;
        this.territoryService = territoryService;
        this.xpGrantService = xpGrantService;
        this.ruleEvaluationService = ruleEvaluationService;
        this.contextService = contextService;
    }

    public void processSessionCompletion(String sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session non trouvée avec l'ID: " + sessionId));

        String pointId = session.getPointId();

        Map<String, Double> rawScores = captureRawScores(session);

        // score final = brut × (1 + modifier)
        applyContextBonusesToScores(session, pointId);

        EvaluationResult verdict = ruleEvaluationService.evaluateVictory(session);
        if (verdict == null || verdict.getWinnerParticipantId() == null) {
            System.out.println("La session " + sessionId + " s'est terminée sans vainqueur.");
            session.setState(SessionState.TERMINATED);
            sessionRepository.save(session);
            return;
        }

        Long boostedWinnerId;
        try {
            boostedWinnerId = Long.parseLong(verdict.getWinnerParticipantId());
        } catch (NumberFormatException e) {
            System.err.println("Erreur: ID gagnant invalide: " + verdict.getWinnerParticipantId());
            return;
        }

        Long winnerTeamId = resolveEffectiveWinner(session, boostedWinnerId, rawScores);

        // Attribution d'XP
        xpGrantService.grantMatchXp(winnerTeamId, true);
        for (var participant : session.getParticipants()) {
            try {
                Long participantId = Long.parseLong(participant.getId());
                if (!participantId.equals(winnerTeamId)) {
                    xpGrantService.grantMatchXp(participantId, false);
                }
            } catch (NumberFormatException ignored) {}
        }

        if (pointId != null && canCaptureArena(session, winnerTeamId, rawScores, pointId)) {
            territoryService.updateTerritoryControl(pointId, winnerTeamId);
        }

        session.setWinnerParticipantId(winnerTeamId.toString());
        session.setState(SessionState.TERMINATED);
        sessionRepository.save(session);

        System.out.println("Session " + sessionId + " terminée. Vainqueur: équipe " + winnerTeamId);
    }

    /** Si le leader au score brut a 2+ points d'écart, les bonus seuls ne peuvent pas le détrôner. */
    private Long resolveEffectiveWinner(Session session, Long boostedWinnerId, Map<String, Double> rawScores) {
        if (contextService == null || rawScores.size() < 2) return boostedWinnerId;

        String rawLeaderId = null;
        double rawLeaderScore = -Double.MAX_VALUE;

        for (var participant : session.getParticipants()) {
            double raw = rawScores.getOrDefault(participant.getId(), 0.0);
            if (raw > rawLeaderScore) {
                rawLeaderScore = raw;
                rawLeaderId = participant.getId();
            }
        }

        if (rawLeaderId == null) return boostedWinnerId;

        // Trouver le score brut du second
        final double finalRawLeaderScore = rawLeaderScore;
        double rawSecondScore = rawScores.values().stream()
                .filter(s -> s != finalRawLeaderScore)
                .mapToDouble(Double::doubleValue)
                .max()
                .orElse(0.0);

        double rawMargin = rawLeaderScore - rawSecondScore;
        Long rawLeaderIdLong = Long.parseLong(rawLeaderId);

        if (rawMargin >= RAW_DOMINANCE_THRESHOLD && !rawLeaderIdLong.equals(boostedWinnerId)) {
            System.out.printf(">>> Garde-fou activé: écart brut %.1f ≥ %.0f — score brut l'emporte sur les bonus%n",
                    rawMargin, RAW_DOMINANCE_THRESHOLD);
            return rawLeaderIdLong;
        }

        return boostedWinnerId;
    }

    /** Vainqueur sur terrain opposé (modifier < perdant) : garde ses XP mais ne capture pas l'arène. */
    private boolean canCaptureArena(Session session, Long winnerTeamId, Map<String, Double> rawScores, String areneId) {
        if (contextService == null) return true;

        Long loserTeamId = session.getParticipants().stream()
                .filter(p -> { try { return !Long.valueOf(p.getId()).equals(winnerTeamId); } catch (NumberFormatException e) { return false; } })
                .findFirst()
                .map(p -> Long.valueOf(p.getId()))
                .orElse(null);

        if (loserTeamId == null) return true;

        double winnerModifier = contextService.computeContextModifier(winnerTeamId, areneId);
        double loserModifier  = contextService.computeContextModifier(loserTeamId, areneId);

        if (winnerModifier >= loserModifier) return true;

        System.out.printf(">>> Capture refusée : terrain opposé — vainqueur (%.0f%%) < défenseur (%.0f%%)%n",
                winnerModifier * 100, loserModifier * 100);
        return false;
    }

    private Map<String, Double> captureRawScores(Session session) {
        Map<String, Double> raw = new HashMap<>();
        if (session.getResult() == null || session.getResult().getMetrics() == null) return raw;
        for (MetricValue m : session.getResult().getMetrics()) {
            raw.put(m.getParticipantId(), m.getValue());
        }
        return raw;
    }

    private void applyContextBonusesToScores(Session session, String areneId) {
        if (contextService == null || areneId == null || session.getResult() == null) return;
        List<MetricValue> metrics = session.getResult().getMetrics();
        if (metrics == null || metrics.isEmpty()) return;

        for (MetricValue metric : metrics) {
            try {
                Long teamId = Long.parseLong(metric.getParticipantId());
                double modifier = contextService.computeContextModifier(teamId, areneId);
                double rawScore = metric.getValue();
                double boostedScore = rawScore * (1.0 + modifier);
                metric.setValue(boostedScore);
                System.out.printf(">>> DNA bonus équipe %d : score brut=%.1f × (1+%.2f) = %.1f%n",
                        teamId, rawScore, modifier, boostedScore);
            } catch (NumberFormatException ignored) {}
        }
    }
}
