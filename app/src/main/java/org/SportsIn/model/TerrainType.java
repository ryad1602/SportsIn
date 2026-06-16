// Types de terrain DNA des arènes, identifiés via Google Places.
package org.SportsIn.model;

/**
 * Type d'environnement DNA d'une arène (Google Places Nearby Search + analyse des noms).
 * Tous les types actifs ont le même bonus géo (+20%) ; le bonus temporel
 * (heure du jour) est le seul différenciateur de puissance.
 */
public enum TerrainType {

    /** Bord de l'eau (mer, rivière, port, lac). Bonus temporel : nuit (20h-6h). */
    ABYSSE,

    /** Lieu iconique (stade, musée, monument). Bonus temporel : journée (10h-20h). */
    OLYMPE,

    /** Espace naturel (parc, forêt, réserve). Bonus temporel : matin (6h-12h). */
    EDEN,

    /** Carrefour de transport (gare, métro, aéroport). Bonus temporel : heures de pointe. */
    NEXUS,

    /** Aucun signal détecté — aucun bonus. */
    NEUTRE;

    /** ABYSSE <-> NEXUS, OLYMPE <-> EDEN. NEUTRE n'a pas d'opposé. */
    public TerrainType getOpposite() {
        return switch (this) {
            case ABYSSE -> NEXUS;
            case NEXUS  -> ABYSSE;
            case OLYMPE -> EDEN;
            case EDEN   -> OLYMPE;
            case NEUTRE -> NEUTRE;
        };
    }

    public double getGeoScoreBonus() {
        return switch (this) {
            case ABYSSE, OLYMPE, EDEN, NEXUS -> 0.20;
            case NEUTRE -> 0.00;
        };
    }

    /** Bonus temporel (0.05 si actif, 0.0 sinon) selon l'heure locale (0-23). */
    public double getTimeBonus(int hourOfDay) {
        return switch (this) {
            case ABYSSE -> (hourOfDay >= 20 || hourOfDay < 6) ? 0.05 : 0.0;
            case OLYMPE -> (hourOfDay >= 10 && hourOfDay < 20) ? 0.05 : 0.0;
            case EDEN   -> (hourOfDay >= 6 && hourOfDay < 12) ? 0.05 : 0.0;
            case NEXUS  -> ((hourOfDay >= 7 && hourOfDay < 9) || (hourOfDay >= 17 && hourOfDay < 19)) ? 0.05 : 0.0;
            case NEUTRE -> 0.0;
        };
    }

    /** Label humain de la période temporelle active ("Nuit", "Heures de pointe"...), ou null hors bonus. */
    public String getTimePeriodLabel(int hourOfDay) {
        return switch (this) {
            case ABYSSE -> (hourOfDay >= 20 || hourOfDay < 6) ? "Nuit" : null;
            case OLYMPE -> (hourOfDay >= 10 && hourOfDay < 20) ? "Journée" : null;
            case EDEN   -> (hourOfDay >= 6 && hourOfDay < 12) ? "Matin" : null;
            case NEXUS  -> ((hourOfDay >= 7 && hourOfDay < 9) || (hourOfDay >= 17 && hourOfDay < 19)) ? "Heures de pointe" : null;
            case NEUTRE -> null;
        };
    }
}
