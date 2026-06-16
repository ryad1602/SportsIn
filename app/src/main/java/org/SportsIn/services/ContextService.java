// Service central de "L'Avantage du Terrain" : bonus contextuels, classification DNA,
// mise à jour de l'Aura équipe, activation du Terrain Mastery.
package org.SportsIn.services;

import org.SportsIn.dto.ContextBonusDTO;
import org.SportsIn.dto.TerrainMasteryDTO;
import org.SportsIn.model.Arene;
import org.SportsIn.model.TerrainType;
import org.SportsIn.model.user.Equipe;
import org.SportsIn.repository.AreneRepository;
import org.SportsIn.repository.EquipeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Cœur de la feature "L'Avantage du Terrain".
 * Formule : Score final = Score brut × (1 + Géo + Temporel + Synergie Aura + Affinité + Mastery)
 */
@Service
public class ContextService {

    private static final int    AURA_HISTORY_SIZE    = 10;
    private static final double AURA_THRESHOLD       = 0.70;
    private static final double AURA_SYNERGY_BONUS   = 0.10;
    private static final double AFFINITY_MATCH_BONUS  = 0.10;
    private static final double AFFINITY_OPPOSED_MALUS = -0.10;

    private final AreneRepository       areneRepository;
    private final EquipeRepository      equipeRepository;
    private final GooglePlacesService   googlePlacesService;
    private final TerrainMasteryService terrainMasteryService;

    @Value("${google.places.api.key:}")
    private String googlePlacesApiKey;

    public ContextService(AreneRepository areneRepository,
                          EquipeRepository equipeRepository,
                          GooglePlacesService googlePlacesService,
                          TerrainMasteryService terrainMasteryService) {
        this.areneRepository       = areneRepository;
        this.equipeRepository      = equipeRepository;
        this.googlePlacesService   = googlePlacesService;
        this.terrainMasteryService = terrainMasteryService;
    }

    /** Utilisé par {@link ContextInfluenceModifier} dans le pipeline d'influence. */
    public double computeContextModifier(Long teamId, String areneId) {
        return buildContextBonus(teamId, areneId).getTotalScoreBonus();
    }

    /**
     * Construit le DTO complet des bonus contextuels (utilisé par le controller REST).
     * teamId peut être null pour ignorer aura/affinité/mastery.
     */
    public ContextBonusDTO buildContextBonus(Long teamId, String areneId) {
        Arene arene = areneRepository.findById(areneId).orElse(null);
        ContextBonusDTO dto = new ContextBonusDTO();
        dto.setAreneId(areneId);

        if (arene == null) {
            dto.setDnaType("NEUTRE");
            return dto;
        }

        dto.setAreneName(arene.getNom());

        TerrainType terrain = resolveTerrain(arene);
        dto.setDnaType(terrain.name());
        dto.setGeoBonus(terrain.getGeoScoreBonus());

        dto.setTerrainSource(arene.getDnaType() != null ? "GOOGLE_PLACES" : "FALLBACK");
        dto.setTerrainConfidence(arene.getDnaConfidence());
        dto.setNearbyPlacesCount(arene.getDnaPlacesCount());
        dto.setTopEvidence(arene.getDnaEvidence());
        dto.setSportPrincipal(arene.getSportPrincipal());

        int hour = LocalTime.now().getHour();
        double timeBonus = terrain.getTimeBonus(hour);
        dto.setTimeBonus(timeBonus);
        dto.setTimePeriod(terrain.getTimePeriodLabel(hour));

        if (teamId != null) {
            equipeRepository.findById(teamId).ifPresent(equipe -> {
                // Aura recalculée depuis l'historique pour éviter les valeurs DB corrompues
                List<String> history = equipe.getCaptureHistory();
                String aura = computeAuraFromHistory(history);
                if (!java.util.Objects.equals(aura, equipe.getCurrentAura())) {
                    equipe.setCurrentAura(aura);
                    equipeRepository.save(equipe);
                }
                dto.setTeamAura(aura);
                boolean synergy = aura != null && terrain != TerrainType.NEUTRE && terrain.name().equals(aura);
                dto.setAurasynergy(synergy);
                dto.setSynergyBonus(synergy ? AURA_SYNERGY_BONUS : 0.0);

                String affinity = equipe.getAffinityType();
                dto.setTeamAffinity(affinity);
                if (affinity != null && terrain != TerrainType.NEUTRE) {
                    try {
                        TerrainType affinityTerrain = TerrainType.valueOf(affinity);
                        if (affinityTerrain == terrain) {
                            dto.setAffinityMatch(true);
                            dto.setAffinityBonus(AFFINITY_MATCH_BONUS);
                        } else if (affinityTerrain.getOpposite() == terrain) {
                            dto.setOpposedTerrain(true);
                            dto.setAffinityBonus(AFFINITY_OPPOSED_MALUS);
                        }
                    } catch (IllegalArgumentException ignored) {}
                }

                TerrainMasteryDTO mastery = terrainMasteryService.getTerrainMastery(teamId);
                if (mastery != null && mastery.isActive() && terrain.name().equals(mastery.getType())) {
                    dto.setMasteryBonus(0.20);
                    dto.setMasteryActive(true);
                    dto.setMasteryRemainingMinutes(mastery.getRemainingMinutes());
                }
            });
        }

        dto.setTotalScoreBonus(
            dto.getGeoBonus()
            + dto.getTimeBonus()
            + dto.getSynergyBonus()
            + dto.getAffinityBonus()
            + dto.getMasteryBonus()
        );
        return dto;
    }

    /** Met à jour l'Aura après une capture, puis vérifie l'activation du Terrain Mastery. */
    @Transactional
    public void updateTeamAura(Long teamId, String areneId) {
        Equipe equipe = equipeRepository.findById(teamId).orElse(null);
        if (equipe == null) return;

        List<String> history = new ArrayList<>(equipe.getCaptureHistory());
        history.remove(areneId); // chaque arène ne compte qu'une fois
        history.add(0, areneId);
        if (history.size() > AURA_HISTORY_SIZE) {
            history = history.subList(0, AURA_HISTORY_SIZE);
        }
        equipe.setCaptureHistory(history);

        String newAura = computeAuraFromHistory(history);
        String oldAura = equipe.getCurrentAura();
        equipe.setCurrentAura(newAura);
        equipeRepository.save(equipe);

        if (!java.util.Objects.equals(oldAura, newAura)) {
            if (newAura != null) {
                System.out.println(">>> NOUVELLE AURA ! L'équipe '" + equipe.getNom()
                        + "' a développé l'aura : " + newAura);
            } else {
                System.out.println(">>> Aura perdue pour l'équipe '" + equipe.getNom() + "'");
            }
        }

        terrainMasteryService.checkAndActivateMastery(teamId, areneId);
    }

    /** Au démarrage : teste la clé Google Places sur un point connu (Parc des Princes). */
    @PostConstruct
    public void diagnosticApiKey() {
        boolean hasKey = googlePlacesApiKey != null && !googlePlacesApiKey.isBlank();
        if (!hasKey) {
            System.out.println("[ContextService] ⚠️  Clé Google Places absente — classification par nom uniquement.");
            return;
        }
        try {
            TerrainType t = googlePlacesService.identifyArenaType(48.8414, 2.2530);
            System.out.println("[ContextService] ✅ Google Places API opérationnelle → Parc des Princes = " + t.name());
        } catch (Exception e) {
            System.err.println("[ContextService] ❌ Google Places API inaccessible : " + e.getMessage());
            System.err.println("[ContextService]    → Activer la facturation sur console.cloud.google.com");
        }
    }

    @PostConstruct
    @Transactional
    public void cleanStaleAuras() {
        List<Equipe> teams = equipeRepository.findAll();
        int fixed = 0;
        for (Equipe equipe : teams) {
            String computed = computeAuraFromHistory(equipe.getCaptureHistory());
            if (!java.util.Objects.equals(computed, equipe.getCurrentAura())) {
                System.out.println("[ContextService] Aura corrompue pour '" + equipe.getNom()
                        + "' : DB=" + equipe.getCurrentAura() + " → recalculée=" + computed);
                equipe.setCurrentAura(computed);
                equipeRepository.save(equipe);
                fixed++;
            }
        }
        if (fixed > 0) System.out.println("[ContextService] ✅ " + fixed + " aura(s) recalculée(s).");
    }

    /** Migre les anciens types DNA obsolètes, puis identifie les arènes sans dnaType via Google Places. */
    @PostConstruct
    @Transactional
    public void initializeArenaDnaTypes() {
        java.util.Map<String, String> migrations = java.util.Map.of(
            "AQUATIQUE",  "ABYSSE",
            "LEGENDAIRE", "OLYMPE",
            "SAUVAGE",    "EDEN",
            "URBAIN",     "NEXUS",
            "ABYSSAL",    "ABYSSE",
            "OLYMPIEN",   "OLYMPE",
            "REFUGE",     "EDEN",
            "TITAN",      "NEXUS"
        );
        List<Arene> all = areneRepository.findAll();
        int migrated = 0;
        for (Arene arene : all) {
            String current = arene.getDnaType();
            if (current != null && migrations.containsKey(current)) {
                arene.setDnaType(migrations.get(current));
                areneRepository.save(arene);
                migrated++;
                System.out.println("[ContextService] Migration DNA : '" + arene.getNom()
                        + "' " + current + " → " + arene.getDnaType());
            }
        }
        if (migrated > 0) {
            System.out.println("[ContextService] ✅ " + migrated + " arène(s) migrée(s).");
        }

        if (googlePlacesApiKey == null || googlePlacesApiKey.isBlank()) {
            System.out.println("[ContextService] ℹ️ Clé Google Places absente → types de data.sql conservés.");
            return;
        }

        List<Arene> allArenes = areneRepository.findAll();

        List<Arene> withoutType = allArenes.stream()
                .filter(a -> a.getDnaType() == null || a.getDnaType().isBlank())
                .collect(java.util.stream.Collectors.toList());

        // Limité à 12/boot pour ne pas saturer le quota Google Places
        List<Arene> withoutEvidence = allArenes.stream()
                .filter(a -> a.getDnaType() != null && !a.getDnaType().isBlank()
                        && (a.getDnaEvidence() == null || a.getDnaEvidence().isBlank()))
                .limit(12)
                .collect(java.util.stream.Collectors.toList());

        if (withoutType.isEmpty() && withoutEvidence.isEmpty()) {
            System.out.println("[ContextService] ℹ️ Toutes les arènes ont un type DNA et une evidence → skip.");
            return;
        }

        // Synchrone : peu nombreuses en pratique
        int count = 0;
        for (Arene arene : withoutType) {
            try {
                TerrainType type = identifyAndSaveArenaType(arene.getId(), false);
                System.out.println("[ContextService]   " + arene.getNom() + " → " + type.name());
                count++;
            } catch (Exception e) {
                System.err.println("[ContextService] ⚠️  Erreur pour '" + arene.getNom() + "': " + e.getMessage());
            }
        }
        if (count > 0) {
            System.out.println("[ContextService] ✅ " + count + " arène(s) identifiée(s) (type absent).");
        }

        // En arrière-plan : chaque appel API prend ~5-10s, ne pas tenir le lock SQLite pendant 60+s.
        if (!withoutEvidence.isEmpty()) {
            final List<Arene> toIdentify = new ArrayList<>(withoutEvidence);
            Thread bgThread = new Thread(() -> {
                System.out.println("[ContextService] 🔍 " + toIdentify.size()
                        + " arène(s) sans evidence → identification en arrière-plan...");
                for (Arene arene : toIdentify) {
                    try {
                        identifyAndSaveArenaType(arene.getId(), true);
                        System.out.println("[ContextService]   ✓ evidence : " + arene.getNom());
                    } catch (Exception e) {
                        System.err.println("[ContextService] ⚠️ evidence '" + arene.getNom() + "': " + e.getMessage());
                    }
                }
                System.out.println("[ContextService] ✅ Evidence background terminée.");
            }, "dna-evidence-init");
            bgThread.setDaemon(true);
            bgThread.start();
        }
    }

    /** Identifie et sauvegarde le type de terrain (idempotent). */
    @Transactional
    public TerrainType identifyAndSaveArenaType(String areneId) {
        return identifyAndSaveArenaType(areneId, false);
    }

    /** force=true re-appelle Google Places même si le dnaType est déjà connu. */
    @Transactional
    public TerrainType identifyAndSaveArenaType(String areneId, boolean force) {
        Arene arene = areneRepository.findById(areneId).orElse(null);
        if (arene == null) return TerrainType.NEUTRE;

        if (!force && arene.getDnaType() != null && !arene.getDnaType().isBlank()) {
            return TerrainType.valueOf(arene.getDnaType());
        }

        GooglePlacesService.ClassificationDebug debug =
                googlePlacesService.classifyArena(arene.getLatitude(), arene.getLongitude());

        TerrainType finalType;
        String dnaEvidence;

        if (debug.finalType != TerrainType.NEUTRE) {
            finalType  = debug.finalType;
            dnaEvidence = googlePlacesService.buildHumanEvidence(debug.finalType, debug.topEvidence);
        } else {
            // API indisponible ou aucun signal → fallback sur le nom
            TerrainType nameType = googlePlacesService.classifyByName(arene.getNom());
            finalType   = nameType;
            boolean apiError = "ERROR".equals(debug.status) || "NO_KEY".equals(debug.status);
            String origin = apiError ? "API indisponible" : "Aucun signal GPS";
            dnaEvidence = nameType == TerrainType.NEUTRE
                ? "Classé NEUTRE — Aucun signal détecté (" + origin + ")"
                : "Classé " + nameType.name() + " — Identifié d'après le nom du lieu (" + origin + ")";
        }

        arene.setDnaType(finalType.name());
        arene.setDnaConfidence(debug.confidence);
        arene.setDnaPlacesCount(debug.inspectedPlaces);
        arene.setDnaEvidence(dnaEvidence);

        // Ne pas écraser une valeur déjà fixée manuellement
        if (debug.detectedSport != null && arene.getSportPrincipal() == null) {
            arene.setSportPrincipal(debug.detectedSport);
        }

        areneRepository.save(arene);
        System.out.println("[ContextService] Arène '" + arene.getNom() + "' → " + finalType.name()
                + " (conf=" + Math.round(debug.confidence * 100) + "%, lieux=" + debug.inspectedPlaces
                + ", status=" + debug.status + ")" + (force ? " [forcé]" : ""));
        return finalType;
    }

    private TerrainType resolveTerrain(Arene arene) {
        if (arene.getDnaType() != null && !arene.getDnaType().isBlank()) {
            try {
                return TerrainType.valueOf(arene.getDnaType());
            } catch (IllegalArgumentException ignored) {
                System.out.println("[ContextService] Type inconnu '" + arene.getDnaType()
                        + "' pour '" + arene.getNom() + "' → ré-identification...");
                GooglePlacesService.ClassificationDebug debug =
                        googlePlacesService.classifyArena(arene.getLatitude(), arene.getLongitude());
                arene.setDnaType(debug.finalType.name());
                arene.setDnaConfidence(debug.confidence);
                arene.setDnaPlacesCount(debug.inspectedPlaces);
                areneRepository.save(arene);
                return debug.finalType;
            }
        }
        return googlePlacesService.identifyArenaType(arene.getLatitude(), arene.getLongitude());
    }

    private String computeAuraFromHistory(List<String> areneIds) {
        List<String> distinct = areneIds.stream().distinct().collect(Collectors.toList());
        int needed = (int) Math.ceil(AURA_HISTORY_SIZE * AURA_THRESHOLD); // = 7
        Map<String, Long> typeCounts = distinct.stream()
                .map(id -> areneRepository.findById(id).orElse(null))
                .filter(a -> a != null && a.getDnaType() != null && !a.getDnaType().isBlank())
                .collect(Collectors.groupingBy(Arene::getDnaType, Collectors.counting()));

        for (Map.Entry<String, Long> entry : typeCounts.entrySet()) {
            if (entry.getValue() >= needed) {
                return entry.getKey();
            }
        }
        return null;
    }

    /** Recalcule l'aura depuis l'historique et synchronise la DB si la valeur stockée est obsolète. */
    public String computeCurrentAura(Long teamId) {
        Equipe equipe = equipeRepository.findById(teamId).orElse(null);
        if (equipe == null) return null;
        String computed = computeAuraFromHistory(equipe.getCaptureHistory());
        if (!java.util.Objects.equals(computed, equipe.getCurrentAura())) {
            equipe.setCurrentAura(computed);
            equipeRepository.save(equipe);
        }
        return computed;
    }

    /** Détails de progression vers l'Aura, utilisé par GET /api/context/team/{teamId}/aura. */
    public Map<String, Object> buildAuraDetails(Long teamId) {
        Equipe equipe = equipeRepository.findById(teamId).orElse(null);
        if (equipe == null) return java.util.Collections.emptyMap();

        List<String> history = equipe.getCaptureHistory().stream().distinct().collect(Collectors.toList());
        Map<String, Long> typeCounts = history.stream()
                .map(id -> areneRepository.findById(id).orElse(null))
                .filter(a -> a != null && a.getDnaType() != null && !a.getDnaType().isBlank())
                .collect(Collectors.groupingBy(Arene::getDnaType, Collectors.counting()));

        String dominantType = null;
        long dominantCount = 0;
        for (Map.Entry<String, Long> e : typeCounts.entrySet()) {
            if (e.getValue() > dominantCount) {
                dominantCount = e.getValue();
                dominantType = e.getKey();
            }
        }

        int historySize = history.size();
        int needed = Math.max(0, (int) Math.ceil(AURA_HISTORY_SIZE * AURA_THRESHOLD) - (int) dominantCount);
        int progressPercent = historySize == 0 ? 0
                : (int) Math.min(100, (dominantCount * 100.0) / (AURA_HISTORY_SIZE * AURA_THRESHOLD));

        String computedAura = computeAuraFromHistory(history);
        if (!java.util.Objects.equals(computedAura, equipe.getCurrentAura())) {
            equipe.setCurrentAura(computedAura);
            equipeRepository.save(equipe);
        }

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("typeBreakdown",   typeCounts);
        result.put("dominantType",    dominantType);
        result.put("dominantCount",   dominantCount);
        result.put("historySize",     historySize);
        result.put("threshold",       (int)(AURA_HISTORY_SIZE * AURA_THRESHOLD));
        result.put("neededForAura",   needed);
        result.put("progressPercent", progressPercent);
        result.put("auraActive",      computedAura != null);
        return result;
    }
}
