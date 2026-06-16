// ============================================================
// [F10 - NOUVEAU] TerrainMasteryDTO
// Représente l'état du Terrain Mastery d'une équipe.
// ============================================================
package org.SportsIn.dto;

/**
 * DTO renvoyé par GET /api/equipes/{id}/terrain-mastery.
 * Décrit le statut du Terrain Mastery d'une équipe.
 */
public class TerrainMasteryDTO {

    private boolean active;
    private String type;           // ABYSSE, OLYMPE, EDEN, NEXUS (null si inactive)
    private long activatedAtMs;    // Timestamp en ms quand le Mastery a été activé
    private long expiresAtMs;      // Timestamp en ms du moment d'expiration
    private int remainingMinutes;  // Minutes avant expiration (calculé à la lecture)
    private int bonusInfluencePercent = 20;
    private double missionCooldownReduction = 0.50;

    public TerrainMasteryDTO() {}

    public TerrainMasteryDTO(boolean active, String type, long activatedAtMs, long expiresAtMs) {
        this.active = active;
        this.type = type;
        this.activatedAtMs = activatedAtMs;
        this.expiresAtMs = expiresAtMs;
        this.remainingMinutes = (int) ((expiresAtMs - System.currentTimeMillis()) / 60000);
    }

    // Getters / Setters

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public long getActivatedAtMs() {
        return activatedAtMs;
    }

    public void setActivatedAtMs(long activatedAtMs) {
        this.activatedAtMs = activatedAtMs;
    }

    public long getExpiresAtMs() {
        return expiresAtMs;
    }

    public void setExpiresAtMs(long expiresAtMs) {
        this.expiresAtMs = expiresAtMs;
    }

    public int getRemainingMinutes() {
        return (int) ((expiresAtMs - System.currentTimeMillis()) / 60000);
    }

    public void setRemainingMinutes(int remainingMinutes) {
        this.remainingMinutes = remainingMinutes;
    }

    public int getBonusInfluencePercent() {
        return bonusInfluencePercent;
    }

    public void setBonusInfluencePercent(int bonusInfluencePercent) {
        this.bonusInfluencePercent = bonusInfluencePercent;
    }

    public double getMissionCooldownReduction() {
        return missionCooldownReduction;
    }

    public void setMissionCooldownReduction(double missionCooldownReduction) {
        this.missionCooldownReduction = missionCooldownReduction;
    }
}
