package org.SportsIn.controller;

import org.SportsIn.dto.TerrainMasteryDTO;
import org.SportsIn.model.user.Equipe;
import org.SportsIn.services.EquipeService;
import org.SportsIn.services.TerrainMasteryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/equipes")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class EquipeController {

    private final EquipeService equipeService;
    private final TerrainMasteryService terrainMasteryService;

    public EquipeController(EquipeService equipeService,
                           TerrainMasteryService terrainMasteryService) {
        this.equipeService = equipeService;
        this.terrainMasteryService = terrainMasteryService;
    }

    @GetMapping
    public ResponseEntity<List<Equipe>> getAll() {
        return ResponseEntity.ok(equipeService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Equipe> getById(@NonNull @PathVariable Long id) {
        return equipeService.getById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Equipe> create(@NonNull @RequestBody Equipe equipe) {
        Equipe saved = equipeService.create(equipe);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Equipe> update(@NonNull @PathVariable Long id, @NonNull @RequestBody Equipe equipeDetails) {
        return equipeService.update(id, equipeDetails)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@NonNull @PathVariable Long id) {
        if (equipeService.delete(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<Equipe> join(@NonNull @PathVariable Long id, @RequestBody Map<String, Long> body) {
        Long joueurId = body.get("joueurId");
        if (joueurId == null) return ResponseEntity.badRequest().build();
        return equipeService.joinTeam(joueurId, id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/leave")
    public ResponseEntity<Void> leave(@RequestBody Map<String, Long> body) {
        Long joueurId = body.get("joueurId");
        if (joueurId == null) return ResponseEntity.badRequest().build();
        equipeService.leaveTeam(joueurId);
        return ResponseEntity.noContent().build();
    }

    /**
     * [F7.1] PATCH /api/equipes/{id}/affinity
     * Met à jour l'affinité de terrain de l'équipe.
     * Body : { "affinityType": "ABYSSE" } ou { "affinityType": null } pour retirer.
     */
    @PatchMapping("/{id}/affinity")
    public ResponseEntity<?> updateAffinity(@NonNull @PathVariable Long id,
                                                  @RequestBody Map<String, String> body) {
        String affinityType = body.get("affinityType");
        // Valider que le type est un TerrainType valide (ou null)
        if (affinityType != null) {
            try {
                org.SportsIn.model.TerrainType.valueOf(affinityType);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body("Type de terrain invalide: " + affinityType);
            }
            if ("NEUTRE".equals(affinityType)) {
                return ResponseEntity.badRequest().body("NEUTRE n'est pas une affinité valide");
            }
        }
        return equipeService.updateAffinity(id, affinityType)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * [F10 - NOUVEAU] GET /api/equipes/{id}/terrain-mastery
     * Retourne le statut du Terrain Mastery de l'équipe.
     */
    @GetMapping("/{id}/terrain-mastery")
    public ResponseEntity<TerrainMasteryDTO> getTerrainMastery(@NonNull @PathVariable Long id) {
        TerrainMasteryDTO mastery = terrainMasteryService.getTerrainMastery(id);
        if (mastery == null) {
            TerrainMasteryDTO inactive = new TerrainMasteryDTO();
            inactive.setActive(false);
            return ResponseEntity.ok(inactive);
        }
        return ResponseEntity.ok(mastery);
    }
}
