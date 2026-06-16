// ============================================================
// Feature "L'Avantage du Terrain"
// DTO retourné par /api/context/arene/{id}
// Bonus terrain : Géo + Temporel + Aura + Affinité + Terrain Mastery
// ============================================================
package org.SportsIn.dto;

/**
 * DTO renvoyé par GET /api/context/arene/{areneId}?teamId={teamId}.
 * Décrit tous les bonus contextuels actifs pour une équipe sur une arène.
 */
public class ContextBonusDTO {

    private String areneId;
    private String areneName;

    /** Type de terrain de l'arène (ABYSSE, OLYMPE, EDEN, NEXUS, NEUTRE). */
    private String dnaType;

    /** Bonus géographique de base (+20% si terrain typé, 0% si NEUTRE). */
    private double geoBonus;

    /** Bonus temporel actif selon l'heure du jour (+5% si période active). */
    private double timeBonus;

    /** Label de la période temporelle active ("Nuit", "Journée", "Matin", "Heures de pointe"), null sinon. */
    private String timePeriod;

    /** Aura actuelle de l'équipe (peut être null). */
    private String teamAura;

    /** true si l'aura de l'équipe correspond au dnaType de l'arène. */
    private boolean aurasynergy;

    /** Bonus de synergie aura (+10% si synergy). */
    private double synergyBonus;

    /** Affinité de terrain choisie par l'équipe (peut être null). */
    private String teamAffinity;

    /** true si l'affinité correspond au dnaType de l'arène. */
    private boolean affinityMatch;

    /** Bonus d'affinité (+0.10 si match, -0.10 si terrain opposé, 0 sinon). */
    private double affinityBonus;

    /** true si le terrain est l'opposé de l'affinité de l'équipe. */
    private boolean opposedTerrain;

    /** Bonus Terrain Mastery (+20% si actif et type correspondant). */
    private double masteryBonus;

    /** true si le Terrain Mastery est actif pour cette équipe sur ce type. */
    private boolean masteryActive;

    /** Minutes restantes avant expiration du Mastery (0 si inactif). */
    private int masteryRemainingMinutes;

    /** Bonus total cumulé (geoBonus + timeBonus + synergyBonus + affinityBonus + masteryBonus). */
    private double totalScoreBonus;

    /** Score de confiance de la classification Google Places (0.0 à 1.0). */
    private double terrainConfidence;

    /** Source de la classification ("GOOGLE_PLACES", "FALLBACK"). */
    private String terrainSource;

    /** Nombre de lieux Google Places inspectés lors de la classification. */
    private int nearbyPlacesCount;

    /**
     * Résumé des 3 lieux principaux ayant justifié ce type DNA.
     * Format : "Nom [type] → TERRAIN | Nom [type] → TERRAIN | ..."
     * Null si non encore identifié.
     */
    private String topEvidence;

    /** Sport principal pratiqué sur ce terrain (FOOTBALL, BASKET, TENNIS, MUSCULATION, NATATION…). */
    private String sportPrincipal;

    public ContextBonusDTO() {}

    // --- Getters / Setters ---

    public String getAreneId() { return areneId; }
    public void setAreneId(String areneId) { this.areneId = areneId; }

    public String getAreneName() { return areneName; }
    public void setAreneName(String areneName) { this.areneName = areneName; }

    public String getDnaType() { return dnaType; }
    public void setDnaType(String dnaType) { this.dnaType = dnaType; }

    public double getGeoBonus() { return geoBonus; }
    public void setGeoBonus(double geoBonus) { this.geoBonus = geoBonus; }

    public double getTimeBonus() { return timeBonus; }
    public void setTimeBonus(double timeBonus) { this.timeBonus = timeBonus; }

    public String getTimePeriod() { return timePeriod; }
    public void setTimePeriod(String timePeriod) { this.timePeriod = timePeriod; }

    public String getTeamAura() { return teamAura; }
    public void setTeamAura(String teamAura) { this.teamAura = teamAura; }

    public boolean isAurasynergy() { return aurasynergy; }
    public void setAurasynergy(boolean aurasynergy) { this.aurasynergy = aurasynergy; }

    public double getSynergyBonus() { return synergyBonus; }
    public void setSynergyBonus(double synergyBonus) { this.synergyBonus = synergyBonus; }

    public String getTeamAffinity() { return teamAffinity; }
    public void setTeamAffinity(String teamAffinity) { this.teamAffinity = teamAffinity; }

    public boolean isAffinityMatch() { return affinityMatch; }
    public void setAffinityMatch(boolean affinityMatch) { this.affinityMatch = affinityMatch; }

    public double getAffinityBonus() { return affinityBonus; }
    public void setAffinityBonus(double affinityBonus) { this.affinityBonus = affinityBonus; }

    public boolean isOpposedTerrain() { return opposedTerrain; }
    public void setOpposedTerrain(boolean opposedTerrain) { this.opposedTerrain = opposedTerrain; }

    public double getMasteryBonus() { return masteryBonus; }
    public void setMasteryBonus(double masteryBonus) { this.masteryBonus = masteryBonus; }

    public boolean isMasteryActive() { return masteryActive; }
    public void setMasteryActive(boolean masteryActive) { this.masteryActive = masteryActive; }

    public int getMasteryRemainingMinutes() { return masteryRemainingMinutes; }
    public void setMasteryRemainingMinutes(int m) { this.masteryRemainingMinutes = m; }

    public double getTotalScoreBonus() { return totalScoreBonus; }
    public void setTotalScoreBonus(double totalScoreBonus) { this.totalScoreBonus = totalScoreBonus; }

    public double getTerrainConfidence() { return terrainConfidence; }
    public void setTerrainConfidence(double terrainConfidence) { this.terrainConfidence = terrainConfidence; }

    public String getTerrainSource() { return terrainSource; }
    public void setTerrainSource(String terrainSource) { this.terrainSource = terrainSource; }

    public int getNearbyPlacesCount() { return nearbyPlacesCount; }
    public void setNearbyPlacesCount(int nearbyPlacesCount) { this.nearbyPlacesCount = nearbyPlacesCount; }

    public String getTopEvidence() { return topEvidence; }
    public void setTopEvidence(String topEvidence) { this.topEvidence = topEvidence; }

    public String getSportPrincipal() { return sportPrincipal; }
    public void setSportPrincipal(String sportPrincipal) { this.sportPrincipal = sportPrincipal; }
}
