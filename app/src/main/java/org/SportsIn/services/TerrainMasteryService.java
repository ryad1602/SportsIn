// Gère l'activation et l'expiration du Terrain Mastery :
// 5+ captures du même type parmi les 10 dernières -> +20% influence, -50% cooldown missions, pendant 6h.
package org.SportsIn.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.SportsIn.dto.TerrainMasteryDTO;
import org.SportsIn.model.Arene;
import org.SportsIn.model.user.Equipe;
import org.SportsIn.repository.AreneRepository;
import org.SportsIn.repository.EquipeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TerrainMasteryService {

    private static final int CAPTURES_THRESHOLD = 5;
    private static final long MASTERY_DURATION_MS = 6 * 60 * 60 * 1000;
    private static final int MASTERY_BONUS_PERCENT = 20;
    private static final double MASTERY_COOLDOWN_REDUCTION = 0.50;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final EquipeRepository equipeRepository;
    private final AreneRepository areneRepository;

    public TerrainMasteryService(EquipeRepository equipeRepository, AreneRepository areneRepository) {
        this.equipeRepository = equipeRepository;
        this.areneRepository = areneRepository;
    }

    /** Appelé après chaque capture pour vérifier si le Terrain Mastery doit être activé. */
    @Transactional
    public void checkAndActivateMastery(Long teamId, String recentlyCapuredAreneId) {
        Equipe equipe = equipeRepository.findById(teamId).orElse(null);
        if (equipe == null) return;

        TerrainMasteryDTO currentMastery = parseTerrainMastery(equipe);
        if (currentMastery != null && currentMastery.isActive() && System.currentTimeMillis() < currentMastery.getExpiresAtMs()) {
            return;
        }

        List<String> captureHistory = equipe.getCaptureHistory();
        if (captureHistory.isEmpty()) return;

        Map<String, Integer> terrainCounts = countCapturesByTerrain(captureHistory);

        for (Map.Entry<String, Integer> entry : terrainCounts.entrySet()) {
            if (entry.getValue() >= CAPTURES_THRESHOLD) {
                String terrainType = entry.getKey();
                if (!terrainType.equals("NEUTRE")) {
                    activateMastery(equipe, terrainType);
                    System.out.println("[TerrainMasteryService] Team " + equipe.getNom() + " activated Terrain Mastery: " + terrainType);
                    return;
                }
            }
        }
    }

    /** Compte les captures par type de terrain (via Arene.dnaType) dans l'historique. */
    private Map<String, Integer> countCapturesByTerrain(List<String> captureHistory) {
        Map<String, Integer> counts = new HashMap<>();
        for (String areneId : captureHistory) {
            Arene arene = areneRepository.findById(areneId).orElse(null);
            if (arene != null) {
                String dnaType = arene.getDnaType() != null ? arene.getDnaType() : "NEUTRE";
                counts.put(dnaType, counts.getOrDefault(dnaType, 0) + 1);
            }
        }
        return counts;
    }

    private void activateMastery(Equipe equipe, String terrainType) {
        long now = System.currentTimeMillis();
        long expiresAt = now + MASTERY_DURATION_MS;

        Map<String, Object> masteryData = new HashMap<>();
        masteryData.put("type", terrainType);
        masteryData.put("activatedAt", now);
        masteryData.put("expiresAt", expiresAt);

        try {
            String json = MAPPER.writeValueAsString(masteryData);
            equipe.setTerrainMasteryJson(json);
            equipeRepository.save(equipe);
        } catch (Exception e) {
            System.err.println("[TerrainMasteryService] Error serializing mastery: " + e.getMessage());
        }
    }

    public TerrainMasteryDTO getTerrainMastery(Long teamId) {
        Equipe equipe = equipeRepository.findById(teamId).orElse(null);
        if (equipe == null) return null;
        return parseTerrainMastery(equipe);
    }

    /** Parse terrainMasteryJson, retourne null si absent ou expiré (et nettoie la DB dans ce cas). */
    private TerrainMasteryDTO parseTerrainMastery(Equipe equipe) {
        String json = equipe.getTerrainMasteryJson();
        if (json == null || json.isEmpty()) {
            return null;
        }

        try {
            JsonNode node = MAPPER.readTree(json);
            String type = node.get("type").asText();
            long activatedAt = node.get("activatedAt").asLong();
            long expiresAt = node.get("expiresAt").asLong();

            if (System.currentTimeMillis() > expiresAt) {
                equipe.setTerrainMasteryJson(null);
                equipeRepository.save(equipe);
                return null;
            }

            return new TerrainMasteryDTO(true, type, activatedAt, expiresAt);
        } catch (Exception e) {
            System.err.println("[TerrainMasteryService] Error parsing mastery JSON: " + e.getMessage());
            return null;
        }
    }

    public static int getMasteryBonusPercent() {
        return MASTERY_BONUS_PERCENT;
    }

    public static double getMasteryCooldownReduction() {
        return MASTERY_COOLDOWN_REDUCTION;
    }
}
