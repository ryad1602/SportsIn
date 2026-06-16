package org.SportsIn.model.user;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Représente une équipe dans le jeu.
 * Une équipe est un groupe de joueurs.
 */
@Entity
public class Equipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nom;

    @Column(nullable = false)
    private int points = 0;

    @Column(nullable = false)
    private int xp = 0;

    @Column
    private String couleur;

    /**
     * [F7.1 - AJOUTÉ] Affinité de terrain choisie par l'équipe (ABYSSE, OLYMPE, EDEN, NEXUS).
     * Nullable : l'équipe peut ne pas avoir encore choisi d'affinité.
     * Bonus : +10% si affinité == dnaType de l'arène, -10% si terrain opposé.
     */
    @Column(name = "affinity_type")
    private String affinityType;

    /**
     * [F7 - AJOUTÉ] Aura actuelle de l'équipe, dérivée de l'historique de captures.
     * Calculée automatiquement par ContextService.updateTeamAura() après chaque capture.
        * Valeurs : ABYSSE, OLYMPE, EDEN, NEXUS ou null (pas encore d'aura).
     * Règle : si >=70% des 10 dernières captures sont du même type → aura activée.
     */
    @Column(name = "current_aura")
    private String currentAura;

    /**
     * [F7 - AJOUTÉ] Historique JSON des 10 derniers areneId capturés.
     * Format : ["stade_louis_ii", "velodrome", ...]
     * Utilisé pour calculer l'Aura de l'équipe.
     * Sérialisé/désérialisé via les helpers getCaptureHistory() / setCaptureHistory().
     */
    @Column(name = "capture_history", columnDefinition = "TEXT")
    private String captureHistoryJson;

    /**
     * [F10 - AJOUTÉ] Terrain Mastery JSON.
     * Format : {"type":"ABYSSE", "activatedAt":1710696000000, "expiresAt":1710717600000}
     * Null si le Mastery n'est pas actif.
     * Activé quand l'équipe capture >= 5 arènes du même type en 24h.
     * Bonus : +20% influence, -50% cooldown missions.
     * Durée : 6 heures.
     */
    @Column(name = "terrain_mastery_json", columnDefinition = "TEXT")
    private String terrainMasteryJson;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    // Une équipe peut avoir plusieurs joueurs.
    // mappedBy = "equipe" indique que c'est l'entité Joueur qui gère la relation.
    // CascadeType.ALL signifie que les opérations (création, suppression) sur l'équipe
    // se répercutent sur les joueurs associés.
    // FetchType.LAZY est une optimisation pour ne pas charger tous les joueurs inutilement.
    @OneToMany(mappedBy = "equipe", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonIgnore  // Ignore la sérialisation pour éviter le problème de LAZY loading
    private List<Joueur> membres = new ArrayList<>();

    // --- Constructeurs ---

    /**
     * Constructeur par défaut requis par JPA.
     */
    public Equipe() {
    }

    public Equipe(String nom) {
        this.nom = nom;
    }

    public Equipe(String nom, String couleur) {
        this.nom = nom;
        this.couleur = couleur;
    }

    // --- Getters et Setters ---

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public List<Joueur> getMembres() {
        return membres;
    }

    public void setMembres(List<Joueur> membres) {
        this.membres = membres;
    }

    public int getPoints() {
        return points;
    }

    public void setPoints(int points) {
        this.points = points;
    }

    public int getXp() {
        return xp;
    }

    public void setXp(int xp) {
        this.xp = xp;
    }

    public String getCouleur() {
        return couleur;
    }

    public void setCouleur(String couleur) {
        this.couleur = couleur;
    }

    // [F7.1 - AJOUTÉ] Getter/setter pour l'affinité de terrain
    public String getAffinityType() {
        return affinityType;
    }

    public void setAffinityType(String affinityType) {
        this.affinityType = affinityType;
    }

    // [F7 - AJOUTÉ] Getter/setter pour l'aura courante
    public String getCurrentAura() {
        return currentAura;
    }

    public void setCurrentAura(String currentAura) {
        this.currentAura = currentAura;
    }

    public String getCaptureHistoryJson() {
        return captureHistoryJson;
    }

    public void setCaptureHistoryJson(String captureHistoryJson) {
        this.captureHistoryJson = captureHistoryJson;
    }

    /**
     * [F7 - AJOUTÉ] Désérialise l'historique de captures en liste Java.
     */
    public List<String> getCaptureHistory() {
        if (captureHistoryJson == null || captureHistoryJson.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(captureHistoryJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    /**
     * [F7 - AJOUTÉ] Sérialise la liste de captures en JSON et la stocke.
     */
    public void setCaptureHistory(List<String> history) {
        try {
            this.captureHistoryJson = MAPPER.writeValueAsString(history);
        } catch (Exception e) {
            this.captureHistoryJson = "[]";
        }
    }

    // [F10 - AJOUTÉ] Getters/Setters pour Terrain Mastery

    public String getTerrainMasteryJson() {
        return terrainMasteryJson;
    }

    public void setTerrainMasteryJson(String terrainMasteryJson) {
        this.terrainMasteryJson = terrainMasteryJson;
    }

    // --- Méthodes utilitaires ---

    public void addJoueur(Joueur joueur) {
        membres.add(joueur);
        joueur.setEquipe(this);
    }

    public void removeJoueur(Joueur joueur) {
        membres.remove(joueur);
        joueur.setEquipe(null);
    }

    @Override
    public String toString() {
        return "Equipe{" +
                "id=" + id +
                ", nom='" + nom + '\'' +
                '}';
    }
}
