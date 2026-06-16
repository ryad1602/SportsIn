package org.SportsIn.model;

import java.util.List;

import org.SportsIn.model.user.Equipe;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "arene")
public class Arene {

    @Id
    private String id;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipe_controle")
    @JsonBackReference
    private Equipe controllingTeam;

    @ElementCollection(targetClass = String.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "arene_sport", joinColumns = @JoinColumn(name = "arene_id"))
    @Column(name = "sport_type")
    private List<String> sportsDisponibles;

    /**
     * Type de terrain identifié via Google Places API.
     * Valeurs possibles : ABYSSE, OLYMPE, EDEN, NEXUS, NEUTRE.
     */
    @Column(name = "dna_type")
    private String dnaType;

    /**
     * Score de confiance de la classification (0.0 à 1.0).
     * Calculé par GooglePlacesService lors de l'identification.
     */
    @Column(name = "dna_confidence")
    private double dnaConfidence;

    /**
     * Nombre de lieux Google Places inspectés lors de la classification.
     */
    @Column(name = "dna_places_count")
    private int dnaPlacesCount;

    /**
     * Résumé des 3 lieux principaux ayant justifié le type DNA.
     * Format : "Nom [type] → TERRAIN | Nom [type] → TERRAIN | ..."
     * Utile pour afficher au joueur pourquoi une arène a ce type.
     */
    @Column(name = "dna_evidence", columnDefinition = "TEXT")
    private String dnaEvidence;

    /**
     * Sport principal pratiqué sur ce terrain.
     * Inféré automatiquement via les types Google Places lors de la découverte.
     * Ex : FOOTBALL, BASKET, TENNIS, MUSCULATION, NATATION…
     */
    @Column(name = "sport_principal")
    private String sportPrincipal;

    // --- Constructeurs ---
    public Arene() {}

    public Arene(String id, String nom, double latitude, double longitude) {
        this.id = id;
        this.nom = nom;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    // --- Getters / Setters ---
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public Equipe getControllingTeam() {
        return controllingTeam;
    }

    public void setControllingTeam(Equipe controllingTeam) {
        this.controllingTeam = controllingTeam;
    }

    /**
     * Retourne l'ID de l'équipe qui contrôle cette arène, ou null si neutre.
     * Méthode de convenance pour éviter les NullPointerException.
     */
    public Long getControllingTeamId() {
        return controllingTeam != null ? controllingTeam.getId() : null;
    }

    public List<String> getSportsDisponibles() {
        return sportsDisponibles;
    }

    public void setSportsDisponibles(List<String> sportsDisponibles) {
        this.sportsDisponibles = sportsDisponibles;
    }

    public String getDnaType() { return dnaType; }
    public void setDnaType(String dnaType) { this.dnaType = dnaType; }

    public double getDnaConfidence() { return dnaConfidence; }
    public void setDnaConfidence(double dnaConfidence) { this.dnaConfidence = dnaConfidence; }

    public int getDnaPlacesCount() { return dnaPlacesCount; }
    public void setDnaPlacesCount(int dnaPlacesCount) { this.dnaPlacesCount = dnaPlacesCount; }

    public String getDnaEvidence() { return dnaEvidence; }
    public void setDnaEvidence(String dnaEvidence) { this.dnaEvidence = dnaEvidence; }

    public String getSportPrincipal() { return sportPrincipal; }
    public void setSportPrincipal(String sportPrincipal) { this.sportPrincipal = sportPrincipal; }

    @Override
    public String toString() {
        return "Arene{" +
                "id='" + id + '\'' +
                ", nom='" + nom + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                '}';
    }
}
