// Endpoints REST : /api/context/arene/{id}, /api/context/team/{id}/aura,
// /api/context/arenes/identify-all, /api/context/api-metrics
package org.SportsIn.controller;

import org.SportsIn.dto.ContextBonusDTO;
import org.SportsIn.model.TerrainType;
import org.SportsIn.model.user.Equipe;
import org.SportsIn.repository.AreneRepository;
import org.SportsIn.repository.EquipeRepository;
import org.SportsIn.services.APIMetricsService;
import org.SportsIn.services.ContextService;
import org.SportsIn.services.GooglePlacesService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Expose les informations contextuelles (terrain + météo + aura) du système
 * "L'Avantage du Terrain".
 */
@RestController
@RequestMapping("/api/context")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class ContextController {

    private final ContextService      contextService;
    private final AreneRepository     areneRepository;
    private final EquipeRepository    equipeRepository;
    private final GooglePlacesService googlePlacesService;
    private final APIMetricsService   apiMetricsService;

    @Value("${google.places.api.key:}")
    private String googlePlacesKey;

    public ContextController(ContextService contextService,
                             AreneRepository areneRepository,
                             EquipeRepository equipeRepository,
                             GooglePlacesService googlePlacesService,
                             APIMetricsService apiMetricsService) {
        this.contextService      = contextService;
        this.areneRepository     = areneRepository;
        this.equipeRepository    = equipeRepository;
        this.googlePlacesService = googlePlacesService;
        this.apiMetricsService   = apiMetricsService;
    }

    /** GET /api/context/arene/{areneId}?teamId={teamId} — bonus contextuels pour l'équipe sur cette arène. */
    @GetMapping("/arene/{areneId}")
    public ResponseEntity<?> getContextForArena(
            @PathVariable String areneId,
            @RequestParam(required = false) Long teamId) {

        if (!areneRepository.existsById(areneId)) {
            return ResponseEntity.notFound().build();
        }

        ContextBonusDTO dto = contextService.buildContextBonus(teamId, areneId);
        return ResponseEntity.ok(dto);
    }

    /** POST /api/context/arene/{areneId}/identify — force l'identification via Google Places. */
    @PostMapping("/arene/{areneId}/identify")
    public ResponseEntity<?> identifyArena(@PathVariable String areneId) {
        if (!areneRepository.existsById(areneId)) {
            return ResponseEntity.notFound().build();
        }

        TerrainType type = contextService.identifyAndSaveArenaType(areneId);
        Map<String, String> result = new LinkedHashMap<>();
        result.put("areneId", areneId);
        result.put("dnaType", type.name());
        return ResponseEntity.ok(result);
    }

    /** GET /api/context/arene/{areneId}/surroundings — lieux Google Places autour du stade. */
    @GetMapping("/arene/{areneId}/surroundings")
    public ResponseEntity<?> getArenaSurroundings(
            @PathVariable String areneId,
            @RequestParam(required = false, defaultValue = "500") int radius,
            @RequestParam(required = false, defaultValue = "10") int max) {

        var areneOpt = areneRepository.findById(areneId);
        if (areneOpt.isEmpty()) return ResponseEntity.notFound().build();

        var arene = areneOpt.get();
        try {
            List<GooglePlacesService.NearbyPlace> places = googlePlacesService
                    .inspectNearbyPlaces(arene.getLatitude(), arene.getLongitude(), radius, max);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("status", "OK");
            response.put("areneId", arene.getId());
            response.put("areneName", arene.getNom());
            response.put("center", Map.of("lat", arene.getLatitude(), "lng", arene.getLongitude()));
            response.put("radius", radius);
            response.put("count", places.size());
            response.put("places", places);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("status", "ERROR");
            response.put("areneId", arene.getId());
            response.put("areneName", arene.getNom());
            response.put("error", e.getMessage());
            return ResponseEntity.status(502).body(response);
        }
    }

    /** GET /api/context/arene/{areneId}/classification-debug — détail des scores de classification. */
    @GetMapping("/arene/{areneId}/classification-debug")
    public ResponseEntity<?> getArenaClassificationDebug(
            @PathVariable String areneId,
            @RequestParam(required = false, defaultValue = "500") int radius,
            @RequestParam(required = false, defaultValue = "20") int max) {

        var areneOpt = areneRepository.findById(areneId);
        if (areneOpt.isEmpty()) return ResponseEntity.notFound().build();

        var arene = areneOpt.get();
        GooglePlacesService.ClassificationDebug debug = googlePlacesService.inspectClassification(
                arene.getLatitude(),
                arene.getLongitude(),
                radius,
                max
        );

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("areneId", arene.getId());
        response.put("areneName", arene.getNom());
        response.put("center", Map.of("lat", arene.getLatitude(), "lng", arene.getLongitude()));
        response.put("result", debug);
        return ResponseEntity.ok(response);
    }

    /** GET /api/context/team/{teamId}/aura — aura actuelle, historique et progression. */
    @GetMapping("/team/{teamId}/aura")
    public ResponseEntity<?> getTeamAura(@PathVariable Long teamId) {
        Equipe equipe = equipeRepository.findById(teamId).orElse(null);
        if (equipe == null) return ResponseEntity.notFound().build();

        String currentAura = contextService.computeCurrentAura(teamId);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("teamId",       equipe.getId());
        response.put("teamName",     equipe.getNom());
        response.put("currentAura",  currentAura);
        response.put("captureCount", equipe.getCaptureHistory().size());
        response.put("auraProgress", contextService.buildAuraDetails(teamId));
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/context/arenes/identify-all?force=false — identifie les arènes sans dnaType,
     * ou toutes si force=true (utile pour re-classer après ajout d'une vraie clé API).
     */
    @PostMapping("/arenes/identify-all")
    public ResponseEntity<?> identifyAllArenas(
            @RequestParam(required = false, defaultValue = "false") boolean force) {

        List<Map<String, String>> results = areneRepository.findAll().stream()
                .filter(a -> force || a.getDnaType() == null || a.getDnaType().isBlank())
                .map(a -> {
                    TerrainType type = contextService.identifyAndSaveArenaType(a.getId(), force);
                    Map<String, String> entry = new LinkedHashMap<>();
                    entry.put("areneId", a.getId());
                    entry.put("nom",     a.getNom());
                    entry.put("dnaType", type.name());
                    return entry;
                })
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "identified", results.size(),
                "results",    results
        ));
    }

    /** GET /api/context/diagnostic — teste l'API Google Places sur un point connu (Parc des Princes). */
    @GetMapping("/diagnostic")
    public ResponseEntity<?> diagnostic() {
        final double TEST_LAT = 48.8414;
        final double TEST_LNG = 2.2530;

        Map<String, Object> gpResult = new LinkedHashMap<>();
        gpResult.put("keyPresent", googlePlacesKey != null && !googlePlacesKey.isBlank());
        try {
            TerrainType type = googlePlacesService.identifyArenaType(TEST_LAT, TEST_LNG);
            gpResult.put("status", "OK");
            gpResult.put("terrainType", type.name());
            gpResult.put("detail", "Identification réussie");
        } catch (Exception e) {
            gpResult.put("status", "ERROR");
            gpResult.put("detail", e.getMessage());
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("googlePlaces", gpResult);
        response.put("hint", "Si status=ERROR, vérifier la clé dans application.properties "
                + "et que l'API Places est activée dans Google Cloud Console.");
        return ResponseEntity.ok(response);
    }

    /** GET /api/context/api-metrics — usage de l'API Google Places (appels, confiance, distribution). */
    @GetMapping("/api-metrics")
    public ResponseEntity<?> getAPIMetrics() {
        return ResponseEntity.ok(apiMetricsService.getMetricsReport());
    }
}
