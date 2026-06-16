// Identification du type de terrain DNA via Google Places API (mode strict :
// en cas d'échec API, retourne NEUTRE + log d'erreur, jamais de simulation).
package org.SportsIn.services;

import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.SportsIn.model.TerrainType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Identifie le type de terrain d'une arène via l'API Google Places Nearby Search.
 *
 * Mode strict API : si la clé API est absente/invalide ou si l'API échoue,
 * le type retourné est NEUTRE.
 */
@Service
public class GooglePlacesService {

    private static final int    DEFAULT_CLASSIFICATION_RADIUS      = 1000;
    private static final int    DEFAULT_CLASSIFICATION_MAX_RESULTS = 20;
    private static final double MIN_TOP_SCORE    = 0.12;
    private static final double MIN_SCORE_MARGIN = 0.04;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Value("${google.places.api.key:}")
    private String apiKey;

    // Whitelist des types "terrain sportif" — élimine hôtels, restos, pharmacies...
    static final Set<String> SPORTS_PLACE_TYPES = Set.of(
            "stadium", "sports_complex", "gym", "fitness_center",
            "athletic_field", "sports_club", "basketball_court",
            "tennis_court", "swimming_pool", "water_park",
            "bowling_alley", "golf_course", "ski_resort",
            "ice_skating_rink", "boxing_gym", "dojo"
    );

        // Rejeté si combiné uniquement avec un signal sportif faible (ex: hôtel "avec salle de sport").
        private static final Set<String> NON_ARENA_TYPES = Set.of(
            "lodging", "hotel", "restaurant", "meal_takeaway", "cafe", "bar", "night_club",
            "pharmacy", "hospital", "doctor", "store", "shopping_mall", "supermarket",
            "convenience_store", "bakery", "bank", "atm"
        );

        private static final Set<String> WEAK_SPORT_TYPES = Set.of(
            "gym", "fitness_center", "sports_club"
        );

    // Passes Google Places pour la découverte de terrains sportifs.
    private static final List<String> DISCOVERY_VENUE_TYPES = List.of(
            "stadium", "sports_complex", "gym", "fitness_center",
            "basketball_court", "tennis_court", "swimming_pool", "athletic_field"
    );

    // Types distinctifs par DNA (types génériques comme restaurant/église/hôpital exclus).
    private static final Set<String> ABYSSE_TYPES = Set.of(
            "natural_feature", "lake", "river", "beach", "marina",
            "aquarium", "spa", "swimming_pool", "water_park", "harbor"
    );
    // gym/fitness_center/sports_complex exclus : trop génériques, biaisent vers OLYMPE.
    private static final Set<String> OLYMPE_TYPES = Set.of(
            "stadium",
            "museum", "art_gallery", "tourist_attraction", "monument",
            "amusement_park", "zoo"
    );
    private static final Set<String> EDEN_TYPES = Set.of(
            "park", "campground", "rv_park",
            "botanical_garden", "nature_reserve", "national_park"
    );
    private static final Set<String> NEXUS_TYPES = Set.of(
            "train_station", "subway_station", "transit_station",
            "bus_station", "light_rail_station", "airport",
            "ferry_terminal", "taxi_stand"
    );

    // Patterns de noms — analyse gratuite, sans appel API.

    private static final Pattern ABYSSE_NAME_PATTERN = Pattern.compile(
            "\\b(seine|marne|canal|port|quai|lac|plage|piscine|aqua|rivière|fleuve|" +
            "bassin|berge|bord.?de.?l.?eau|fontaine|nautique|maritime|harbor|marina|" +
            "rhin|loire|garonne|rhône|rhone|oise|durance|isle|allier|cher|saône|saone|" +
            "isère|isere|var|vilaine|moselle|somme|escaut|yonne|loing|vienne|creuse|" +
            "charente|gironde|landes|étang|etang|lagune|estuaire|delta|rade|baie|crique|" +
            "plongée|plongee|voile|kayak|canoë|canoe|surf|natation|aquatique|haliotika)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern EDEN_NAME_PATTERN = Pattern.compile(
            "\\b(parc|jardin|bois|forêt|foret|square|arboretum|prairie|verdure|" +
            "botanique|vert|nature|pelouse|hippodrome|golf|gazon|plaine|colline|" +
            "parc.?des|jardins|butte|promenade|espace.?vert|camping|réserve|reserve|" +
            "national|naturel|écologique|ecologique|silva|sylva|bocage|haie|lande|" +
            "maquis|garrigue|marais|marécage|marecage|tourbière|tourbiere|étangs|etangs)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern NEXUS_NAME_PATTERN = Pattern.compile(
            "\\b(gare|métro|metro|station|aéroport|aeroport|tram|tramway|rer|sncf|ratp|" +
            "terminal|autoroute|périphérique|peripherique|halle|entrepôt|entrepot|" +
            "zone.?industrielle|zi\\b|zac\\b|usine|fabrique|atelier|hangar|dépôt|depot|" +
            "fret|logistique|cargo|transitaire|messagerie|plateforme|hub|intermodal|" +
            "ferroutage|multimodal|port.?sec|chantier|btp|béton|beton|acier|métallurgie|" +
            "metallurgie|chimie|pétrochimie|petrochimie|raffinerie|centrale|incinérateur|" +
            "incinérateur|incineration|déchetterie|dechetterie|recyclage)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern OLYMPE_NAME_PATTERN = Pattern.compile(
            "\\b(musée|musee|museum|monument|palais|château|chateau|opéra|opera|" +
            "théâtre|theatre|galerie|cathédrale|cathedrale|basilique|arc.?de.?triomphe|" +
            "tour.?eiffel|panthéon|pantheon|louvre|invalides|académie|stade|arena|arène|" +
            "vélodrome|velodrome|gymnase|omnisports|polyvalente|salle.?des.?fêtes|" +
            "mairie|hôtel.?de.?ville|préfecture|prefecture|université|universite|campus|" +
            "faculté|faculte|centre.?culturel|bibliothèque|bibliotheque|conservatoire|" +
            "cité|cite|zénith|zenith|bercy|accor|orange|allianz|groupama|ulrich|parc.?des.?princes|" +
            "allianz.?riviera|vélodrome|velodrome|stade.?de.?france|tribune|enceinte)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    // Stades simulés — fallback si Google Places API indisponible.
    private static final List<DiscoveredStadium> SIMULATED_STADIUMS = List.of(
        new DiscoveredStadium("sim_stade_de_france",   "Stade de France",            48.9244,  2.3601),
        new DiscoveredStadium("sim_pierre_mauroy",     "Stade Pierre-Mauroy",        50.6120,  3.1302),
        new DiscoveredStadium("sim_allianz_riviera",   "Stade Allianz Riviera",      43.7055,  7.1924),
        new DiscoveredStadium("sim_matmut_atlantique", "Stade Matmut Atlantique",    44.8283, -0.5667),
        new DiscoveredStadium("sim_meinau",            "Stade de la Meinau",         48.5601,  7.7802),
        new DiscoveredStadium("sim_roazhon_park",      "Roazhon Park",               48.1076, -1.6706),
        new DiscoveredStadium("sim_raymond_kopa",      "Stade Raymond Kopa",         47.4617, -0.5567),
        new DiscoveredStadium("sim_stadium_toulouse",  "Stadium de Toulouse",        43.5828,  1.4341),
        new DiscoveredStadium("sim_ocean_le_havre",    "Stade Océane",               49.4972,  0.1228),
        new DiscoveredStadium("sim_marcel_picot",      "Stade Marcel Picot",         48.6666,  6.1812),
        new DiscoveredStadium("sim_gabriel_montpied",  "Stade Gabriel Montpied",     45.8016,  3.0942),
        new DiscoveredStadium("sim_abbe_deschamps",    "Stade Abbé Deschamps",       47.7932,  3.5779),
        new DiscoveredStadium("sim_armand_cesari",     "Stade Armand Cesari",        42.6835,  9.4507),
        new DiscoveredStadium("sim_mmArena",           "MMArena",                    47.9861,  0.1911),
        new DiscoveredStadium("sim_hainaut",           "Stade du Hainaut",           50.3585,  3.5253),
        new DiscoveredStadium("sim_gerland",           "Stade de Gerland",           45.7329,  4.8282),
        new DiscoveredStadium("sim_la_mosson",         "Stade de la Mosson",         43.6098,  3.8096),
        new DiscoveredStadium("sim_gaston_gerard",     "Stade Gaston-Gérard",        47.3281,  5.0375),
        new DiscoveredStadium("sim_auguste_delaune",   "Stade Auguste Delaune",      49.2658,  4.0420),
        new DiscoveredStadium("sim_bollaert",          "Stade Bollaert-Delelis",     50.4310,  2.8145)
    );

    /** Classifie par le nom de l'arène seul (sans appel API), priorité OLYMPE > ABYSSE > NEXUS > EDEN. */
    public TerrainType classifyByName(String arenaName) {
        if (arenaName == null || arenaName.isBlank()) return TerrainType.NEUTRE;
        if (OLYMPE_NAME_PATTERN.matcher(arenaName).find()) return TerrainType.OLYMPE;
        if (ABYSSE_NAME_PATTERN.matcher(arenaName).find()) return TerrainType.ABYSSE;
        if (NEXUS_NAME_PATTERN .matcher(arenaName).find()) return TerrainType.NEXUS;
        if (EDEN_NAME_PATTERN  .matcher(arenaName).find()) return TerrainType.EDEN;
        return TerrainType.NEUTRE;
    }

    public TerrainType identifyArenaType(double lat, double lng) {
        return classifyArena(lat, lng).finalType;
    }

    /** Classification complète (confidence + evidence), jamais null. Utilisée par ContextService. */
    public ClassificationDebug classifyArena(double lat, double lng) {
        if (apiKey == null || apiKey.isBlank()) {
            System.err.println("[GooglePlacesService] Clé API absente → NEUTRE");
            return new ClassificationDebug("NO_KEY", "Clé Google Places absente",
                    TerrainType.NEUTRE, 0.0, DEFAULT_CLASSIFICATION_RADIUS, 0,
                    emptyScores(), List.of(), null);
        }
        try {
            return classifyWithScores(lat, lng,
                    DEFAULT_CLASSIFICATION_RADIUS,
                    DEFAULT_CLASSIFICATION_MAX_RESULTS);
        } catch (Exception e) {
            System.err.println("[GooglePlacesService] API call failed (" + e.getMessage() + ") → NEUTRE");
            return new ClassificationDebug("ERROR", e.getMessage(),
                    TerrainType.NEUTRE, 0.0, DEFAULT_CLASSIFICATION_RADIUS, 0,
                    emptyScores(), List.of(), null);
        }
    }

    /** Infère le sport principal depuis les types Google Places puis le nom. Null si indéterminable. */
    public static String inferSportPrincipal(List<String> types, String name) {
        if (types != null) {
            Set<String> tset = new HashSet<>();
            for (String t : types) {
                if (t != null) tset.add(t.toLowerCase());
            }

            // Priorité aux sports les plus explicites avant les types génériques.
            if (tset.contains("basketball_court")) return "BASKET";
            if (tset.contains("tennis_court")) return "TENNIS";
            if (tset.contains("swimming_pool") || tset.contains("water_park")) return "NATATION";
            if (tset.contains("golf_course")) return "GOLF";
            if (tset.contains("bowling_alley")) return "BOWLING";
            if (tset.contains("ice_skating_rink")) return "PATINAGE";
            if (tset.contains("ski_resort")) return "SKI";
            if (tset.contains("boxing_gym") || tset.contains("dojo")) return "SPORT_COMBAT";
            if (tset.contains("gym") || tset.contains("fitness_center")) return "MUSCULATION";
            if (tset.contains("athletic_field")) return "ATHLETISME";
            if (tset.contains("stadium")) return "FOOTBALL";

            // Fallback sur le mapping existant si un nouveau type explicite apparaît.
            for (String t : tset) {
                String sport = sportFromType(t);
                if (sport != null) return sport;
            }
        }
        // Fallback sur le nom
        if (name != null) {
            String lc = name.toLowerCase();
            if (lc.contains("basket") || lc.contains("basketball")) return "BASKET";
            if (lc.contains("tennis"))                               return "TENNIS";
            if (lc.contains("piscine") || lc.contains("natation")
                    || lc.contains("aqua") || lc.contains("swimming")) return "NATATION";
            if (lc.contains("gym") || lc.contains("fitness")
                    || lc.contains("muscul") || lc.contains("crossfit")) return "MUSCULATION";
            if (lc.contains("golf"))                                 return "GOLF";
            if (lc.contains("rugby"))                                return "RUGBY";
            if (lc.contains("volley"))                               return "VOLLEYBALL";
            if (lc.contains("hand") || lc.contains("handball"))     return "HANDBALL";
            if (lc.contains("box") || lc.contains("dojo")
                    || lc.contains("judo") || lc.contains("karate")
                    || lc.contains("mma"))                           return "SPORT_COMBAT";
            if (lc.contains("vélo") || lc.contains("velo")
                    || lc.contains("cycl") || lc.contains("velodrome")) return "CYCLISME";
            if (lc.contains("athlé") || lc.contains("athle")
                    || lc.contains("athletics"))                     return "ATHLETISME";
            if (lc.contains("stade") || lc.contains("stadium")
                    || lc.contains("foot") || lc.contains("soccer")) return "FOOTBALL";
        }
        return null;
    }

    private static String sportFromType(String type) {
        return switch (type) {
            case "basketball_court"                  -> "BASKET";
            case "tennis_court"                      -> "TENNIS";
            case "swimming_pool", "water_park"       -> "NATATION";
            case "gym", "fitness_center", "boxing_gym", "dojo" -> "MUSCULATION";
            case "golf_course"                       -> "GOLF";
            case "bowling_alley"                     -> "BOWLING";
            case "ice_skating_rink"                  -> "PATINAGE";
            case "ski_resort"                        -> "SKI";
            case "stadium", "athletic_field"         -> "FOOTBALL";
            case "sports_complex", "sports_club"     -> null;
            default                                  -> null;
        };
    }

    /** Version debug, utilisée par /api/context/arene/{id}/classification-debug. */
    public ClassificationDebug inspectClassification(double lat, double lng, int radiusMeters, int maxResults) {
        if (apiKey == null || apiKey.isBlank()) {
            return new ClassificationDebug("ERROR", "Clé Google Places absente",
                    TerrainType.NEUTRE, 0.0, radiusMeters, 0, emptyScores(), List.of(), null);
        }
        try {
            return classifyWithScores(lat, lng, radiusMeters, maxResults);
        } catch (Exception e) {
            return new ClassificationDebug("ERROR", e.getMessage(),
                    TerrainType.NEUTRE, 0.0, radiusMeters, 0, emptyScores(), List.of(), null);
        }
    }

    public static class DiscoveredStadium {
        public final String placeId;
        public final String name;
        public final double lat;
        public final double lng;
        public final List<String> types;

        public DiscoveredStadium(String placeId, String name, double lat, double lng) {
            this(placeId, name, lat, lng, List.of());
        }

        public DiscoveredStadium(String placeId, String name, double lat, double lng, List<String> types) {
            this.placeId = placeId;
            this.name    = name;
            this.lat     = lat;
            this.lng     = lng;
            this.types   = types != null ? types : List.of();
        }
    }

    public static class NearbyPlace {
        public final String       placeId;
        public final String       name;
        public final double       lat;
        public final double       lng;
        public final List<String> types;
        public final double       distanceMeters;

        public NearbyPlace(String placeId, String name, double lat, double lng,
                           List<String> types, double distanceMeters) {
            this.placeId        = placeId;
            this.name           = name;
            this.lat            = lat;
            this.lng            = lng;
            this.types          = types;
            this.distanceMeters = distanceMeters;
        }
    }

    public static class ClassificationDebug {
        public final String                    status;
        public final String                    reason;
        public final TerrainType               finalType;
        public final double                    confidence;
        public final int                       radiusMeters;
        public final int                       inspectedPlaces;
        public final Map<String, Double>       scores;
        public final List<ClassificationEvidence> topEvidence;
        /** Sport principal inféré depuis les types Google Places (peut être null). */
        public final String                    detectedSport;

        public ClassificationDebug(String status, String reason, TerrainType finalType,
                                   double confidence, int radiusMeters, int inspectedPlaces,
                                   Map<String, Double> scores,
                                   List<ClassificationEvidence> topEvidence,
                                   String detectedSport) {
            this.status          = status;
            this.reason          = reason;
            this.finalType       = finalType;
            this.confidence      = confidence;
            this.radiusMeters    = radiusMeters;
            this.inspectedPlaces = inspectedPlaces;
            this.scores          = scores;
            this.topEvidence     = topEvidence;
            this.detectedSport   = detectedSport;
        }
    }

    public static class ClassificationEvidence {
        public final String      placeName;
        public final String      matchedType;
        public final TerrainType terrain;
        public final double      distanceMeters;
        public final double      contribution;

        public ClassificationEvidence(String placeName, String matchedType,
                                      TerrainType terrain, double distanceMeters,
                                      double contribution) {
            this.placeName      = placeName;
            this.matchedType    = matchedType;
            this.terrain        = terrain;
            this.distanceMeters = distanceMeters;
            this.contribution   = contribution;
        }
    }

    /** Résumé lisible des preuves de classification (ex: "Classé OLYMPE — Stade de France (stade, 45m)"). */
    public String buildHumanEvidence(TerrainType finalType, List<ClassificationEvidence> topEvidence) {
        if (finalType == null || finalType == TerrainType.NEUTRE) {
            return "Classé NEUTRE — Aucun lieu influent détecté à proximité";
        }
        if (topEvidence == null || topEvidence.isEmpty()) {
            return "Classé " + finalType.name() + " — Signal contextuel faible autour de l'arène";
        }

        String details = topEvidence.stream()
                .filter(e -> e != null)
                .limit(3)
                .map(e -> {
                    long roundedDistance = Math.round(e.distanceMeters);
                    return e.placeName + " (" + humanType(e.matchedType) + ", " + roundedDistance + "m)";
                })
                .reduce((a, b) -> a + ", " + b)
                .orElse("Signal contextuel faible autour de l'arène");

        return "Classé " + finalType.name() + " — " + details;
    }

    /** Transforme un type Google Places brut en libellé lisible FR. */
    public String humanType(String rawType) {
        if (rawType == null || rawType.isBlank()) return "type inconnu";
        String t = rawType;
        if (t.startsWith("NAME:")) return "indice dans le nom";

        return switch (t.toLowerCase()) {
            case "stadium" -> "stade";
            case "sports_complex" -> "complexe sportif";
            case "gym", "fitness_center" -> "salle de sport";
            case "athletic_field" -> "piste d'athletisme";
            case "sports_club" -> "club sportif";
            case "basketball_court" -> "terrain de basket";
            case "tennis_court" -> "court de tennis";
            case "swimming_pool" -> "piscine";
            case "water_park" -> "parc aquatique";
            case "bowling_alley" -> "bowling";
            case "golf_course" -> "golf";
            case "ski_resort" -> "station de ski";
            case "ice_skating_rink" -> "patinoire";
            case "boxing_gym" -> "salle de boxe";
            case "dojo" -> "dojo";
            case "park" -> "parc";
            case "natural_feature" -> "site naturel";
            case "river" -> "riviere";
            case "lake" -> "lac";
            case "beach" -> "plage";
            case "marina" -> "marina";
            case "harbor" -> "port";
            case "museum" -> "musee";
            case "tourist_attraction" -> "lieu touristique";
            case "train_station" -> "gare";
            case "subway_station" -> "station de metro";
            case "transit_station" -> "station de transport";
            case "bus_station" -> "gare routiere";
            case "airport" -> "aeroport";
            default -> t.replace('_', ' ');
        };
    }

    /** Recherche des terrains sportifs à proximité, multi-passes sur DISCOVERY_VENUE_TYPES. */
    public List<DiscoveredStadium> discoverStadiumsNear(double lat, double lng, int radiusMeters) {
        if (apiKey == null || apiKey.isBlank()) {
            System.out.println("[GooglePlacesService] Pas de clé API → découverte simulée (" + SIMULATED_STADIUMS.size() + " stades)");
            return SIMULATED_STADIUMS;
        }
        try {
            List<DiscoveredStadium> results = callStadiumSearch(lat, lng, radiusMeters);
            if (results.isEmpty()) {
                System.out.println("[GooglePlacesService] API retourne 0 résultat → découverte simulée");
                return SIMULATED_STADIUMS;
            }
            return results;
        } catch (Exception e) {
            System.err.println("[GooglePlacesService] Erreur découverte → fallback simulé: " + e.getMessage());
            return SIMULATED_STADIUMS;
        }
    }

    /** True si au moins un type est dans SPORTS_PLACE_TYPES (avec garde anti-hôtel/resto). */
    public static boolean isSportsVenue(List<String> placeTypes) {
        if (placeTypes == null) return false;

        Set<String> normalized = new HashSet<>();
        for (String t : placeTypes) {
            if (t != null) normalized.add(t.toLowerCase());
        }

        boolean hasSportsType = normalized.stream().anyMatch(SPORTS_PLACE_TYPES::contains);
        if (!hasSportsType) return false;

        boolean hasNonArenaType = normalized.stream().anyMatch(NON_ARENA_TYPES::contains);
        boolean hasStrongSportsType = normalized.stream()
                .anyMatch(t -> SPORTS_PLACE_TYPES.contains(t) && !WEAK_SPORT_TYPES.contains(t));

        if (hasNonArenaType && !hasStrongSportsType) {
            return false;
        }

        return true;
    }

    /** Lieux Google Places bruts autour d'un point GPS (debug). */
    public List<NearbyPlace> inspectNearbyPlaces(double lat, double lng, int radiusMeters, int maxResults) {
        if (apiKey == null || apiKey.isBlank()) throw new RuntimeException("Clé Google Places absente");
        try {
            return callNearbyPlacesInspection(lat, lng, radiusMeters, maxResults);
        } catch (Exception e) {
            throw new RuntimeException("Google Places inspection failed: " + e.getMessage(), e);
        }
    }

    private ClassificationDebug classifyWithScores(double lat, double lng,
                                                   int radiusMeters, int maxResults) throws Exception {
        List<NearbyPlace> places = callNearbyPlacesInspection(lat, lng, radiusMeters, maxResults);
        if (places.isEmpty()) {
            return new ClassificationDebug("LOW_CONFIDENCE", "Aucun lieu retourné par Google Places",
                    TerrainType.NEUTRE, 0.0, radiusMeters, 0, emptyScores(), List.of(), null);
        }

        Map<TerrainType, Double> rawScores = new EnumMap<>(TerrainType.class);
        rawScores.put(TerrainType.ABYSSE, 0.0);
        rawScores.put(TerrainType.OLYMPE, 0.0);
        rawScores.put(TerrainType.EDEN,   0.0);
        rawScores.put(TerrainType.NEXUS,  0.0);

        List<ClassificationEvidence> evidence = new ArrayList<>();

        for (NearbyPlace place : places) {
            // Boost x2 si < 80m : c'est probablement le stade lui-même.
            double rawProx = Math.max(0.15,
                    1.0 - (place.distanceMeters / Math.max(50.0, radiusMeters * 1.2)));
            double proximity = place.distanceMeters < 80.0 ? Math.min(1.0, rawProx * 2.0) : rawProx;

            // Pass 1 : types Google Places — on garde le type le plus fort par lieu.
            TerrainType bestTypeTerrain = null;
            double       bestTypeWeight = 0.0;
            String       bestTypeName   = null;
            for (String tRaw : place.types) {
                String t = tRaw.toLowerCase();
                TerrainType terrain = mapTypeToTerrain(t);
                if (terrain == null || terrain == TerrainType.NEUTRE) continue;
                double w = typeWeight(t);
                if (w > bestTypeWeight) {
                    bestTypeWeight = w;
                    bestTypeTerrain = terrain;
                    bestTypeName = t;
                }
            }
            if (bestTypeTerrain != null) {
                double contribution = round2(bestTypeWeight * proximity);
                rawScores.merge(bestTypeTerrain, contribution, Double::sum);
                evidence.add(new ClassificationEvidence(
                        place.name, bestTypeName, bestTypeTerrain, place.distanceMeters, contribution));
            }

            // Pass 2 : analyse du nom, lieux proches (< 400m) et non commerciaux
            // (évite "Hôtel du Parc" classé EDEN).
            boolean isCommercial = place.types.stream().anyMatch(NON_ARENA_TYPES::contains);
            if (place.name != null && place.distanceMeters < 400.0 && !isCommercial) {
                TerrainType nameMatch = null;
                if      (OLYMPE_NAME_PATTERN.matcher(place.name).find()) nameMatch = TerrainType.OLYMPE;
                else if (ABYSSE_NAME_PATTERN.matcher(place.name).find()) nameMatch = TerrainType.ABYSSE;
                else if (NEXUS_NAME_PATTERN .matcher(place.name).find()) nameMatch = TerrainType.NEXUS;
                else if (EDEN_NAME_PATTERN  .matcher(place.name).find()) nameMatch = TerrainType.EDEN;

                if (nameMatch != null) {
                    double contribution = round2(3.0 * proximity);
                    rawScores.merge(nameMatch, contribution, Double::sum);
                    evidence.add(new ClassificationEvidence(
                            place.name, "NAME:" + place.name, nameMatch,
                            place.distanceMeters, contribution));
                }
            }
        }

        // Classement
        List<Map.Entry<TerrainType, Double>> ranked = rawScores.entrySet().stream()
                .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                .toList();

        TerrainType best   = ranked.get(0).getKey();
        double bestScore   = orZero(ranked.get(0).getValue());
        double secondScore = ranked.size() > 1 ? orZero(ranked.get(1).getValue()) : 0.0;
        double margin          = bestScore - secondScore;
        double confidence = round2(bestScore / Math.max(0.10, bestScore + secondScore + 0.10)); // bornée [0,1]

        TerrainType finalType;
        String status, reason;

        if (bestScore <= 0.0) {
            finalType = TerrainType.NEUTRE;
            status    = "NO_SIGNAL";
            reason    = "Aucun type pertinent détecté parmi les " + places.size() + " lieux voisins";
        } else if (bestScore < MIN_TOP_SCORE || margin < MIN_SCORE_MARGIN) {
            finalType = best;
            status    = "LOW_CONFIDENCE";
            reason    = "Signal faible — meilleur candidat : " + best.name()
                    + " (score=" + round2(bestScore) + ", 2e=" + round2(secondScore) + ")";
        } else {
            finalType = best;
            status    = "OK";
            reason    = "Signal clair — " + best.name()
                    + " (score=" + round2(bestScore) + ", marge=" + round2(margin) + ")";
        }

        List<ClassificationEvidence> topEvidence = evidence.stream()
                .sorted(Comparator.comparingDouble((ClassificationEvidence e) -> e.contribution).reversed())
                .limit(10)
                .toList();

        Map<String, Double> scoreView = new LinkedHashMap<>();
        scoreView.put("ABYSSE", round2(rawScores.get(TerrainType.ABYSSE)));
        scoreView.put("OLYMPE", round2(rawScores.get(TerrainType.OLYMPE)));
        scoreView.put("EDEN",   round2(rawScores.get(TerrainType.EDEN)));
        scoreView.put("NEXUS",  round2(rawScores.get(TerrainType.NEXUS)));

        // Sport principal inféré depuis le lieu le plus proche.
        String detectedSport = places.stream()
                .sorted(Comparator.comparingDouble(p -> p.distanceMeters))
                .map(p -> inferSportPrincipal(p.types, p.name))
                .filter(s -> s != null)
                .findFirst()
                .orElse(null);

        return new ClassificationDebug(status, reason, finalType, confidence,
                radiusMeters, places.size(), scoreView, topEvidence, detectedSport);
    }

    private TerrainType mapTypeToTerrain(String type) {
        if (ABYSSE_TYPES.contains(type)) return TerrainType.ABYSSE;
        if (EDEN_TYPES.contains(type))   return TerrainType.EDEN;
        if (NEXUS_TYPES.contains(type))  return TerrainType.NEXUS;
        if (OLYMPE_TYPES.contains(type)) return TerrainType.OLYMPE;
        return null;
    }

    private double typeWeight(String type) {
        return switch (type) {
            // ABYSSE — eau (très distinctifs)
            case "river", "lake", "beach", "marina", "harbor", "aquarium" -> 4.5;
            case "swimming_pool", "water_park"                             -> 4.0;
            case "natural_feature", "spa"                                  -> 2.0;
            // EDEN — nature (renforcé pour contrebalancer le biais OLYMPE)
            case "national_park", "nature_reserve", "botanical_garden"    -> 4.5;
            case "park", "campground"                                      -> 4.0;
            case "rv_park"                                                 -> 2.0;
            // NEXUS — transport (très distinctifs)
            case "airport"                                                 -> 5.0;
            case "train_station", "subway_station", "ferry_terminal"      -> 4.5;
            case "transit_station", "light_rail_station"                   -> 3.5;
            case "bus_station", "taxi_stand"                               -> 2.5;
            // OLYMPE — uniquement lieux iconiques/prestigieux
            case "stadium"                                                 -> 5.0;
            case "museum", "tourist_attraction"                            -> 3.5;
            case "art_gallery", "monument"                                 -> 3.0;
            case "amusement_park", "zoo"                                   -> 2.5;
            default -> 0.0;
        };
    }

    /** Un appel par type de DISCOVERY_VENUE_TYPES, dédupliqué par placeId. */
    private List<DiscoveredStadium> callStadiumSearch(double lat, double lng,
                                                      int radiusMeters) throws Exception {
        Map<String, DiscoveredStadium> byPlaceId = new java.util.LinkedHashMap<>();
        int rejected = 0;

        for (String venueType : DISCOVERY_VENUE_TYPES) {
            String urlStr = String.format(java.util.Locale.US,
                    "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                    + "?location=%s,%s&radius=%d&type=%s&key=%s",
                    lat, lng, radiusMeters, venueType, apiKey);
            try {
                JsonNode root = httpGet(urlStr);
                for (JsonNode r : root.path("results")) {
                    String placeId = r.path("place_id").asText(null);
                    String name    = r.path("name").asText(null);
                    JsonNode loc   = r.path("geometry").path("location");
                    double rLat    = loc.path("lat").asDouble();
                    double rLng    = loc.path("lng").asDouble();
                    if (placeId == null || name == null || rLat == 0) continue;

                    List<String> types = new ArrayList<>();
                    for (JsonNode t : r.path("types")) types.add(t.asText());
                    if (!isSportsVenue(types)) {
                        rejected++;
                        System.out.println("[GooglePlacesService] Rejeté (non sportif) : "
                                + name + " " + types);
                        continue;
                    }

                        byPlaceId.putIfAbsent(placeId,
                            new DiscoveredStadium(placeId, name, rLat, rLng, types));
                }
            } catch (Exception e) {
                System.err.println("[GooglePlacesService] Passe " + venueType
                        + " échouée : " + e.getMessage());
            }
        }

        List<DiscoveredStadium> results = new ArrayList<>(byPlaceId.values());
        System.out.println("[GooglePlacesService] Découverte : " + results.size()
                + " terrain(s) sportif(s) retenu(s), " + rejected + " rejeté(s) près de ("
                + lat + "," + lng + ")");
        return results;
    }

    private List<NearbyPlace> callNearbyPlacesInspection(double lat, double lng,
                                                         int radiusMeters,
                                                         int maxResults) throws Exception {
        int safeRadius = Math.max(50, Math.min(50000, radiusMeters));
        int safeMax    = Math.max(1, Math.min(50, maxResults));

        String urlStr = String.format(java.util.Locale.US,
                "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                + "?location=%s,%s&radius=%d&key=%s",
                lat, lng, safeRadius, apiKey);
        JsonNode root = httpGet(urlStr);

        List<NearbyPlace> out = new ArrayList<>();
        JsonNode results = root.path("results");
        for (int i = 0; i < Math.min(results.size(), safeMax); i++) {
            JsonNode r      = results.get(i);
            String placeId  = r.path("place_id").asText(null);
            String name     = r.path("name").asText("?");
            JsonNode loc    = r.path("geometry").path("location");
            double pLat     = loc.path("lat").asDouble();
            double pLng     = loc.path("lng").asDouble();
            List<String> types = new ArrayList<>();
            for (JsonNode t : r.path("types")) types.add(t.asText());
            out.add(new NearbyPlace(placeId, name, pLat, pLng, types,
                    distanceMeters(lat, lng, pLat, pLng)));
        }
        return out;
    }

    /** GET sur l'API Google Places. Lance RuntimeException si HTTP != 200 ou status JSON en erreur. */
    private JsonNode httpGet(String urlStr) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(6000);
        conn.setReadTimeout(6000);

        int httpCode = conn.getResponseCode();
        if (httpCode != 200) {
            String body = conn.getErrorStream() != null
                    ? new String(conn.getErrorStream().readAllBytes()) : "";
            throw new RuntimeException("HTTP " + httpCode + " : " + body);
        }

        JsonNode root   = MAPPER.readTree(conn.getInputStream());
        String   status = root.path("status").asText("");
        if (!status.equals("OK") && !status.equals("ZERO_RESULTS")) {
            String errorMsg = root.path("error_message").asText("(aucun détail)");
            throw new RuntimeException("Google Places status='" + status + "': " + errorMsg);
        }
        return root;
    }

    private Map<String, Double> emptyScores() {
        Map<String, Double> scores = new LinkedHashMap<>();
        scores.put("ABYSSE", 0.0);
        scores.put("OLYMPE", 0.0);
        scores.put("EDEN",   0.0);
        scores.put("NEXUS",  0.0);
        return scores;
    }

    private static double orZero(Double v) { return v != null ? v : 0.0; }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private static final double EARTH_RADIUS_M = 6_371_000.0;

    private double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a    = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                    + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return Math.round(EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10.0) / 10.0;
    }
}
