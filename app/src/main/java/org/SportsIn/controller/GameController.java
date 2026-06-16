package org.SportsIn.controller;

import org.SportsIn.model.Game;
import org.SportsIn.services.GameService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/games")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class GameController {

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @GetMapping
    public ResponseEntity<List<Game>> getAll() {
        return ResponseEntity.ok(gameService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Game> getById(@NonNull @PathVariable String id) {
        return gameService.getById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/waiting")
    public ResponseEntity<List<Game>> getWaiting() {
        return ResponseEntity.ok(gameService.getWaiting());
    }

    @GetMapping("/point/{pointId}/waiting")
    public ResponseEntity<List<Game>> getWaitingAtPoint(@NonNull @PathVariable String pointId) {
        return ResponseEntity.ok(gameService.getWaitingAtPoint(pointId));
    }

    @PostMapping
    public ResponseEntity<Game> create(@NonNull @RequestBody Game game) {
        Game saved = gameService.create(game);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<?> join(@NonNull @PathVariable String id, @RequestBody Map<String, Long> body) {
        Long opponentTeamId = body.get("opponentTeamId");
        if (opponentTeamId == null) {
            return ResponseEntity.badRequest().body("opponentTeamId manquant — rejoins d'abord une équipe");
        }
        try {
            java.util.Optional<Game> result = gameService.joinGame(id, opponentTeamId);
            if (result.isEmpty()) return ResponseEntity.status(404).body("Jeu introuvable");
            return ResponseEntity.ok(result.get());
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<?> start(@NonNull @PathVariable String id) {
        try {
            java.util.Optional<Game> result = gameService.startGame(id);
            if (result.isEmpty()) return ResponseEntity.status(404).body("Jeu introuvable");
            return ResponseEntity.ok(result.get());
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<Game> complete(@NonNull @PathVariable String id, @RequestBody Map<String, String> body) {
        String winnerTeamId = body.get("winnerTeamId");
        try {
            return gameService.completeGame(id, winnerTeamId)
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@NonNull @PathVariable String id) {
        if (gameService.delete(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
