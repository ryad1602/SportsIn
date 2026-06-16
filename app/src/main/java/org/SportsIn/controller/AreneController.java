package org.SportsIn.controller;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.SportsIn.model.Arene;
import org.SportsIn.model.TerrainType;
import org.SportsIn.services.AreneService;
import org.SportsIn.services.ContextService;
import org.SportsIn.services.GooglePlacesService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/arenes")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class AreneController {

    private static final int DEFAULT_MAX_NEW_ARENAS = 10;

    private final AreneService          areneService;
    private final ContextService        contextService;
    private final GooglePlacesService   googlePlacesService;

    /**
     * Coordonnées des 10 principales villes françaises utilisées pour la découverte
     * automatique de stades via Google Places.
     */
    private static final double[][] FRENCH_CITIES = {
            {48.8566,  2.3522},   // Paris
            {45.7640,  4.8357},   // Lyon
            {43.2965,  5.3698},   // Marseille
            {44.8378, -0.5792},   // Bordeaux
            {50.6292,  3.0573},   // Lille
            {43.6047,  1.4442},   // Toulouse
            {43.7102,  7.2620},   // Nice
            {47.2184, -1.5536},   // Nantes
            {48.5734,  7.7521},   // Strasbourg
            {48.1173, -1.6778},   // Rennes
    };

    public AreneController(AreneService areneService,
                           ContextService contextService,
                           GooglePlacesService googlePlacesService) {
        this.areneService        = areneService;
        this.contextService      = contextService;
        this.googlePlacesService = googlePlacesService;
    }

    @GetMapping
    public ResponseEntity<List<Arene>> getAll() {
        return ResponseEntity.ok(areneService.getAll());
    }

        /**
         * GET /api/arenes/quality-report
         *
         * Donne une vue rapide de qualité de la feature découverte/typage.
         */
        @GetMapping("/quality-report")
        public ResponseEntity<?> qualityReport() {
        List<Arene> all = areneService.getAll();

        long missingEvidence = all.stream()
            .filter(a -> a.getDnaEvidence() == null || a.getDnaEvidence().isBlank())
            .count();
        long missingSport = all.stream()
            .filter(a -> a.getSportPrincipal() == null || a.getSportPrincipal().isBlank())
            .count();

        Map<String, Long> byDnaType = all.stream()
            .collect(Collectors.groupingBy(
                a -> a.getDnaType() == null || a.getDnaType().isBlank() ? "UNSET" : a.getDnaType(),
                LinkedHashMap::new,
                Collectors.counting()
            ));

        Map<String, Long> bySport = all.stream()
            .collect(Collectors.groupingBy(
                a -> a.getSportPrincipal() == null || a.getSportPrincipal().isBlank() ? "UNSET" : a.getSportPrincipal(),
                LinkedHashMap::new,
                Collectors.counting()
            ));

        List<Map<String, Object>> lowConfidence = all.stream()
            .filter(a -> a.getDnaConfidence() < 0.70)
            .sorted(Comparator.comparingDouble(Arene::getDnaConfidence))
            .limit(10)
            .map(a -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", a.getId());
                row.put("nom", a.getNom());
                row.put("dnaType", a.getDnaType());
                row.put("sportPrincipal", a.getSportPrincipal());
                row.put("dnaConfidence", a.getDnaConfidence());
                row.put("dnaEvidence", a.getDnaEvidence());
                return row;
            })
            .collect(Collectors.toList());

        double avgConfidence = all.stream()
            .map(Arene::getDnaConfidence)
            .filter(Objects::nonNull)
            .mapToDouble(Double::doubleValue)
            .average()
            .orElse(0.0);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totalArenes", all.size());
        out.put("avgDnaConfidence", Math.round(avgConfidence * 1000.0) / 1000.0);
        out.put("missingEvidence", missingEvidence);
        out.put("missingSportPrincipal", missingSport);
        out.put("byDnaType", byDnaType);
        out.put("bySportPrincipal", bySport);
        out.put("lowConfidenceSample", lowConfidence);

        return ResponseEntity.ok(out);
        }

    @GetMapping("/{id}")
    public ResponseEntity<Arene> getById(@NonNull @PathVariable String id) {
        return areneService.getById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/equipe/{equipeId}")
    public ResponseEntity<List<Arene>> getByEquipe(@NonNull @PathVariable Long equipeId) {
        return ResponseEntity.ok(areneService.getByEquipe(equipeId));
    }

    @GetMapping("/sport/{sport}")
    public ResponseEntity<List<Arene>> getBySport(@NonNull @PathVariable String sport) {
        return ResponseEntity.ok(areneService.getBySport(sport));
    }

    @PostMapping
    public ResponseEntity<Arene> create(@NonNull @RequestBody Arene arene) {
        Arene saved = areneService.create(arene);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Arene> update(@NonNull @PathVariable String id, @NonNull @RequestBody Arene areneDetails) {
        return areneService.update(id, areneDetails)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@NonNull @PathVariable String id) {
        if (areneService.delete(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * DELETE /api/arenes
     *
     * Supprime toutes les arènes de la base.
     * Utile avant une redécouverte propre des terrains.
     */
    @DeleteMapping
    public ResponseEntity<?> deleteAll() {
        long deleted = areneService.deleteAll();
        return ResponseEntity.ok(Map.of(
                "deleted", deleted,
                "message", deleted + " arène(s) supprimée(s)"
        ));
    }

    // -----------------------------------------------------------------------
    // DÉCOUVERTE DE STADES VIA GOOGLE PLACES
    // -----------------------------------------------------------------------

    /**
     * POST /api/arenes/discover
     *
     * Découvre des stades à proximité d'un point GPS via Google Places (type=stadium)
     * et les ajoute automatiquement en base s'ils ne sont pas encore connus.
     *
     * Le placeId Google est utilisé comme ID de l'arène : garantit la déduplication
     * (un même stade ne peut pas être ajouté deux fois).
     *
        * Après l'ajout, le type DNA (ABYSSE/OLYMPE/EDEN/NEXUS) est identifié
     * automatiquement pour chaque nouveau stade via Google Places.
     *
     * Corps de requête (optionnel, défaut = Paris) :
     * { "lat": 48.85, "lng": 2.35, "radiusMeters": 5000 }
     *
     * Réponse : { "added": N, "alreadyKnown": M, "arenas": [...] }
     */
    @PostMapping("/discover")
    public ResponseEntity<?> discoverNear(@RequestBody(required = false) Map<String, Object> body) {
        // Lit les paramètres de recherche depuis le corps de requête (ou utilise Paris par défaut)
        double lat    = body != null && body.containsKey("lat")
                ? ((Number) body.get("lat")).doubleValue() : 48.8566;
        double lng    = body != null && body.containsKey("lng")
                ? ((Number) body.get("lng")).doubleValue() : 2.3522;
        int radius    = body != null && body.containsKey("radiusMeters")
                ? ((Number) body.get("radiusMeters")).intValue() : 5000;
        int maxNewArenes = body != null && body.containsKey("maxNewArenes")
            ? ((Number) body.get("maxNewArenes")).intValue() : DEFAULT_MAX_NEW_ARENAS;

        return ResponseEntity.ok(runDiscovery(List.of(new double[]{lat, lng}), radius, maxNewArenes));
    }

    /**
     * POST /api/arenes/discover-france
     *
     * Recherche des stades dans les 10 principales villes françaises (Paris, Lyon,
     * Marseille, Bordeaux, Lille, Toulouse, Nice, Nantes, Strasbourg, Rennes)
     * et les ajoute en base s'ils ne sont pas encore connus.
     *
     * Rayon de recherche : 3 km par ville (suffisant pour couvrir le centre-ville).
     * Réponse : { "added": N, "alreadyKnown": M, "arenas": [...] }
     */
    @PostMapping("/discover-france")
    public ResponseEntity<?> discoverFrance(@RequestBody(required = false) Map<String, Object> body) {
        int radius = body != null && body.containsKey("radiusMeters")
                ? ((Number) body.get("radiusMeters")).intValue() : 10000;
        int maxNewArenes = body != null && body.containsKey("maxNewArenes")
                ? ((Number) body.get("maxNewArenes")).intValue() : DEFAULT_MAX_NEW_ARENAS;

        List<double[]> cities = new ArrayList<>();
        for (double[] c : FRENCH_CITIES) cities.add(c);
        // Rayon 10 km par ville par défaut ; ajout plafonné pour éviter l'explosion de volume.
        return ResponseEntity.ok(runDiscovery(cities, radius, maxNewArenes));
    }

    /**
     * Mappe un sport détecté (libre) vers une valeur acceptée par la contrainte SQL actuelle.
     * Sprint 3 étendra cette liste (NATATION, ATHLETISME…).
     */
    private static String mapToValidSport(String detected) {
        if (detected == null) return "FOOTBALL";
        return switch (detected) {
            case "BASKET", "TENNIS", "MUSCULATION",
                 "NATATION", "ATHLETISME", "CYCLISME", "GOLF",
                 "RUGBY", "VOLLEYBALL", "HANDBALL", "SPORT_COMBAT",
                 "BOWLING", "PATINAGE", "SKI" -> detected;
            default -> "FOOTBALL";
        };
    }

    /**
     * Exécute la découverte pour une liste de coordonnées.
     * Pour chaque stade trouvé via Google Places :
     *  - vérifie s'il existe déjà en base (via placeId)
     *  - si non : persiste l'arène, identifie son type DNA, l'enregistre
     *
     * @param coords  liste de { lat, lng }
     * @param radius  rayon de recherche en mètres
     * @return map avec "added", "alreadyKnown", "arenas"
     */
    private Map<String, Object> runDiscovery(List<double[]> coords, int radius, int maxNewArenes) {
        List<Map<String, Object>> addedArenas       = new ArrayList<>();
        List<String>              alreadyKnownNames = new ArrayList<>();
        int safeLimit = Math.max(1, Math.min(DEFAULT_MAX_NEW_ARENAS, maxNewArenes));

        for (double[] coord : coords) {
            if (addedArenas.size() >= safeLimit) break;

            List<GooglePlacesService.DiscoveredStadium> found =
                    googlePlacesService.discoverStadiumsNear(coord[0], coord[1], radius);

            for (GooglePlacesService.DiscoveredStadium stadium : found) {
                if (addedArenas.size() >= safeLimit) break;

                // Le placeId sert d'ID unique — pas de doublon possible
                if (areneService.getById(stadium.placeId).isPresent()) {
                    alreadyKnownNames.add(stadium.name);
                    continue;
                }

                // Classifie le terrain : DNA + sport principal en un seul appel Google Places
                GooglePlacesService.ClassificationDebug debug =
                        googlePlacesService.classifyArena(stadium.lat, stadium.lng);

                String detectedType;
                String dnaEvidence;
                if (debug.finalType != TerrainType.NEUTRE) {
                    detectedType = debug.finalType.name();
                    dnaEvidence  = googlePlacesService.buildHumanEvidence(debug.finalType, debug.topEvidence);
                } else {
                    TerrainType nameType = googlePlacesService.classifyByName(stadium.name);
                    detectedType = nameType.name();
                    dnaEvidence  = nameType == TerrainType.NEUTRE
                        ? "Classé NEUTRE — Aucun signal détecté (API indisponible)"
                        : "Classé " + nameType.name() + " — Identifié d'après le nom du lieu (API indisponible)";
                }

                // Sport principal inféré, mappé aux valeurs actuellement acceptées en BDD
                String inferredFromDiscoveredPlace =
                    GooglePlacesService.inferSportPrincipal(stadium.types, stadium.name);
                String sport = mapToValidSport(inferredFromDiscoveredPlace != null
                    ? inferredFromDiscoveredPlace
                    : debug.detectedSport);

                Arene arene = new Arene(stadium.placeId, stadium.name, stadium.lat, stadium.lng);
                arene.setSportsDisponibles(List.of(sport));
                arene.setDnaType(detectedType);
                arene.setDnaConfidence(debug.confidence);
                arene.setDnaPlacesCount(debug.inspectedPlaces);
                arene.setSportPrincipal(sport);
                arene.setDnaEvidence(dnaEvidence);

                Arene saved = areneService.create(arene);
                System.out.println("[AreneController] Nouveau terrain : '" + saved.getNom()
                        + "' DNA=" + detectedType + " sport=" + saved.getSportPrincipal());

                Map<String, Object> info = new LinkedHashMap<>();
                info.put("id",            saved.getId());
                info.put("nom",           saved.getNom());
                info.put("lat",           saved.getLatitude());
                info.put("lng",           saved.getLongitude());
                info.put("dnaType",       detectedType);
                info.put("sport",         saved.getSportPrincipal());
                info.put("dnaEvidence",   saved.getDnaEvidence());
                addedArenas.add(info);
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("added",        addedArenas.size());
        response.put("alreadyKnown", alreadyKnownNames.size());
        response.put("maxNewArenes", safeLimit);
        response.put("arenas",       addedArenas);
        if (!alreadyKnownNames.isEmpty()) {
            response.put("alreadyKnownNames", alreadyKnownNames);
        }
        return response;
    }

    /**
     * POST /api/arenes/reset-and-discover
     *
     * Supprime toutes les arènes puis relance immédiatement une redécouverte.
     * Corps optionnel:
     * { "scope": "FRANCE"|"NEAR", "lat": 48.8566, "lng": 2.3522, "radiusMeters": 5000 }
     *
     * Par défaut : scope=FRANCE, radiusMeters=10000.
     */
    @PostMapping("/reset-and-discover")
    public ResponseEntity<?> resetAndDiscover(@RequestBody(required = false) Map<String, Object> body) {
        long deleted = areneService.deleteAll();

        String scope = body != null && body.containsKey("scope")
                ? String.valueOf(body.get("scope")) : "FRANCE";
        int radius = body != null && body.containsKey("radiusMeters")
                ? ((Number) body.get("radiusMeters")).intValue() : 10000;
        int maxNewArenes = body != null && body.containsKey("maxNewArenes")
            ? ((Number) body.get("maxNewArenes")).intValue() : DEFAULT_MAX_NEW_ARENAS;

        Map<String, Object> discovery;
        if ("NEAR".equalsIgnoreCase(scope)) {
            double lat = body != null && body.containsKey("lat")
                    ? ((Number) body.get("lat")).doubleValue() : 48.8566;
            double lng = body != null && body.containsKey("lng")
                    ? ((Number) body.get("lng")).doubleValue() : 2.3522;
                discovery = runDiscovery(List.of(new double[]{lat, lng}), radius, maxNewArenes);
        } else {
            List<double[]> cities = new ArrayList<>();
            for (double[] c : FRENCH_CITIES) cities.add(c);
                discovery = runDiscovery(cities, radius, maxNewArenes);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("deleted", deleted);
        response.put("scope", scope.toUpperCase());
        response.put("radiusMeters", radius);
        response.put("maxNewArenes", Math.max(1, Math.min(DEFAULT_MAX_NEW_ARENAS, maxNewArenes)));
        response.put("discovery", discovery);
        return ResponseEntity.ok(response);
    }

        /**
         * POST /api/arenes/reset-and-discover/dry-run
         *
         * Simule un reset + redécouverte sans écrire en base.
         * Utile pour estimer le résultat avant suppression réelle.
         * Corps optionnel:
         * { "scope": "FRANCE"|"NEAR", "lat": 48.8566, "lng": 2.3522, "radiusMeters": 5000 }
         */
        @PostMapping("/reset-and-discover/dry-run")
        public ResponseEntity<?> resetAndDiscoverDryRun(@RequestBody(required = false) Map<String, Object> body) {
        String scope = body != null && body.containsKey("scope")
            ? String.valueOf(body.get("scope")) : "FRANCE";
        int radius = body != null && body.containsKey("radiusMeters")
            ? ((Number) body.get("radiusMeters")).intValue() : 10000;
        int maxNewArenes = body != null && body.containsKey("maxNewArenes")
            ? ((Number) body.get("maxNewArenes")).intValue() : DEFAULT_MAX_NEW_ARENAS;

        Map<String, Object> preview;
        if ("NEAR".equalsIgnoreCase(scope)) {
            double lat = body != null && body.containsKey("lat")
                ? ((Number) body.get("lat")).doubleValue() : 48.8566;
            double lng = body != null && body.containsKey("lng")
                ? ((Number) body.get("lng")).doubleValue() : 2.3522;
            preview = previewDiscovery(List.of(new double[]{lat, lng}), radius, maxNewArenes);
        } else {
            List<double[]> cities = new ArrayList<>();
            for (double[] c : FRENCH_CITIES) cities.add(c);
            preview = previewDiscovery(cities, radius, maxNewArenes);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("dryRun", true);
        response.put("scope", scope.toUpperCase());
        response.put("radiusMeters", radius);
        response.put("maxNewArenes", Math.max(1, Math.min(DEFAULT_MAX_NEW_ARENAS, maxNewArenes)));
        response.put("currentArenesCount", areneService.getAll().size());
        response.put("preview", preview);
        return ResponseEntity.ok(response);
        }

        /**
         * Simule la découverte sans persister les arènes.
         */
        private Map<String, Object> previewDiscovery(List<double[]> coords, int radius, int maxNewArenes) {
        List<Map<String, Object>> simulatedArenas = new ArrayList<>();
        int alreadyKnown = 0;
        int safeLimit = Math.max(1, Math.min(DEFAULT_MAX_NEW_ARENAS, maxNewArenes));

        for (double[] coord : coords) {
            if (simulatedArenas.size() >= safeLimit) break;

            List<GooglePlacesService.DiscoveredStadium> found =
                googlePlacesService.discoverStadiumsNear(coord[0], coord[1], radius);

            for (GooglePlacesService.DiscoveredStadium stadium : found) {
            if (simulatedArenas.size() >= safeLimit) break;

            if (areneService.getById(stadium.placeId).isPresent()) {
                alreadyKnown++;
                continue;
            }

            GooglePlacesService.ClassificationDebug debug =
                googlePlacesService.classifyArena(stadium.lat, stadium.lng);

            String detectedType;
            String dnaEvidence;
            if (debug.finalType != TerrainType.NEUTRE) {
                detectedType = debug.finalType.name();
                dnaEvidence  = googlePlacesService.buildHumanEvidence(debug.finalType, debug.topEvidence);
            } else {
                TerrainType nameType = googlePlacesService.classifyByName(stadium.name);
                detectedType = nameType.name();
                dnaEvidence  = nameType == TerrainType.NEUTRE
                    ? "Classé NEUTRE — Aucun signal détecté (API indisponible)"
                    : "Classé " + nameType.name() + " — Identifié d'après le nom du lieu (API indisponible)";
            }

            String inferredFromDiscoveredPlace =
                GooglePlacesService.inferSportPrincipal(stadium.types, stadium.name);
            String sport = mapToValidSport(inferredFromDiscoveredPlace != null
                ? inferredFromDiscoveredPlace
                : debug.detectedSport);

            Map<String, Object> info = new LinkedHashMap<>();
            info.put("id", stadium.placeId);
            info.put("nom", stadium.name);
            info.put("lat", stadium.lat);
            info.put("lng", stadium.lng);
            info.put("dnaType", detectedType);
            info.put("sport", sport);
            info.put("dnaEvidence", dnaEvidence);
            info.put("terrainConfidence", debug.confidence);
            info.put("nearbyPlacesCount", debug.inspectedPlaces);
            simulatedArenas.add(info);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("wouldAdd", simulatedArenas.size());
        result.put("alreadyKnown", alreadyKnown);
        result.put("maxNewArenes", safeLimit);
        result.put("arenas", simulatedArenas);
        return result;
        }

    /**
     * POST /api/arenes/fix-neutre
     *
     * Correction ponctuelle : réidentifie les stades dont le dnaType est NEUTRE
     * en appelant Google Places pour obtenir leur vrai type environnemental.
     *
     * Idempotent : peut être appelé plusieurs fois sans effet de bord.
     */
    @PostMapping("/fix-neutre")
    public ResponseEntity<?> fixNeutre() {
        List<Arene> neutres = areneService.getAll().stream()
                .filter(a -> "NEUTRE".equals(a.getDnaType())
                        && (a.getId().startsWith("ChIJ") || a.getId().length() > 20))
                .toList();

        long fixed = neutres.stream()
                .peek(a -> {
                    TerrainType rawType = googlePlacesService
                            .identifyArenaType(a.getLatitude(), a.getLongitude());
                    String identified = (rawType == TerrainType.NEUTRE)
                            ? googlePlacesService.classifyByName(a.getNom()).name()
                            : rawType.name();
                    a.setDnaType(identified);
                    areneService.create(a);
                })
                .count();
        return ResponseEntity.ok(Map.of(
                "fixed", fixed,
                "message", fixed + " stade(s) réidentifié(s) via Google Places (NEUTRE → type réel)"
        ));
    }

    /**
     * POST /api/arenes/restore-originals
     *
     * Restaure les types DNA des 6 arènes originales de data.sql qui ont pu être
     * écrasés lors d'un appel identify-all?force=true.
     *
     * Types géographiques vérifiés manuellement :
     *   - Stade Louis II (Monaco, bord de mer)       → ABYSSE
     *   - Parc des Princes (Paris, stade iconique)   → OLYMPE
     *   - Groupama Stadium (Lyon, zone urbaine)      → NEXUS
     *   - Stade de la Beaujoire (Nantes, Loire)      → ABYSSE
     *   - Stade Francis Le Blé (Brest, port atlan.)  → ABYSSE
     *   - Stade Vélodrome (Marseille, quartier urb.) → NEXUS
     */
    @PostMapping("/restore-originals")
    public ResponseEntity<?> restoreOriginals() {
        // Types corrects des 6 arènes de base (vérifiés géographiquement)
        Map<String, String> originals = new java.util.LinkedHashMap<>();
        originals.put("stade_louis_ii",       "ABYSSE");
        originals.put("parc_princes",         "OLYMPE");
        originals.put("groupama_stadium",     "NEXUS");
        originals.put("stade_beaujoire",      "ABYSSE");
        originals.put("stade_francis_le_ble", "ABYSSE");
        originals.put("velodrome",            "NEXUS");

        List<Map<String, Object>> results = new ArrayList<>();
        for (Map.Entry<String, String> e : originals.entrySet()) {
            if (areneService.getById(e.getKey()).isEmpty()) continue;
            String finalType = e.getValue();
            String source    = "hardcoded";
            try {
                // Tente une re-classification Google Places (v5) pour obtenir type + evidence
                TerrainType identified = contextService.identifyAndSaveArenaType(e.getKey(), true);
                if (identified != TerrainType.NEUTRE) {
                    finalType = identified.name();
                    source    = "google_places";
                } else {
                    // API a retourné NEUTRE (pas de signal) → on force le type connu
                    Arene a = areneService.getById(e.getKey()).get();
                    a.setDnaType(e.getValue());
                    areneService.create(a);
                }
            } catch (Exception ex) {
                // API indisponible → force le type hardcodé sans toucher à l'evidence
                Arene a = areneService.getById(e.getKey()).get();
                a.setDnaType(e.getValue());
                areneService.create(a);
                System.err.println("[AreneController] Fallback hardcodé pour " + e.getKey() + " : " + ex.getMessage());
            }
            System.out.println("[AreneController] Restauré : " + e.getKey() + " → " + finalType + " (" + source + ")");
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("areneId", e.getKey());
            r.put("dnaType", finalType);
            r.put("source",  source);
            results.add(r);
        }
        return ResponseEntity.ok(Map.of(
                "restored", results.size(),
                "message",  results.size() + " arène(s) restaurée(s)",
                "details",  results
        ));
    }
}
