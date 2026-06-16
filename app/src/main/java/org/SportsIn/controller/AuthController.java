package org.SportsIn.controller;

import org.SportsIn.model.user.Joueur;
import org.SportsIn.services.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Inscription d'un nouveau joueur
     * POST /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            if (request.pseudo == null || request.pseudo.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(errorResponse("Le pseudo est requis"));
            }
            if (request.email == null || request.email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(errorResponse("L'email est requis"));
            }
            if (request.password == null || request.password.length() < 6) {
                return ResponseEntity.badRequest().body(errorResponse("Le mot de passe doit contenir au moins 6 caractères"));
            }

            Joueur joueur = authService.register(request.pseudo.trim(), request.email.trim().toLowerCase(), request.password);
            return ResponseEntity.status(HttpStatus.CREATED).body(authResponse(joueur));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    /**
     * Connexion par email OU pseudo
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            if (request.identifier == null || request.identifier.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(errorResponse("L'email ou le pseudo est requis"));
            }
            if (request.password == null || request.password.isEmpty()) {
                return ResponseEntity.badRequest().body(errorResponse("Le mot de passe est requis"));
            }

            Optional<Joueur> joueurOpt = authService.login(request.identifier.trim(), request.password);

            if (joueurOpt.isPresent()) {
                return ResponseEntity.ok(authResponse(joueurOpt.get()));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse("Identifiant ou mot de passe incorrect"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse("Erreur lors de la connexion"));
        }
    }

    /**
     * Récupérer le profil de l'utilisateur connecté
     * GET /api/auth/me/{id}
     */
    @GetMapping("/me/{id}")
    public ResponseEntity<?> getProfile(@PathVariable Long id) {
        return authService.getById(id)
                .map(j -> ResponseEntity.ok(userResponse(j)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Modifier pseudo et/ou mot de passe
     * PUT /api/auth/profile/{id}
     */
    @PutMapping("/profile/{id}")
    public ResponseEntity<?> updateProfile(@PathVariable Long id, @RequestBody UpdateProfileRequest request) {
        try {
            return authService.updateProfile(id, request.pseudo, request.password)
                    .map(j -> (ResponseEntity<?>) ResponseEntity.ok(userResponse(j)))
                    .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    // --- DTOs internes ---

    static class RegisterRequest {
        public String pseudo;
        public String email;
        public String password;
    }

    static class LoginRequest {
        public String identifier;
        public String password;
    }

    static class UpdateProfileRequest {
        public String pseudo;
        public String password;
    }

    // --- Helpers pour les réponses ---

    private Map<String, Object> authResponse(Joueur joueur) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("token", "TOKEN_" + joueur.getId() + "_" + System.currentTimeMillis());
        response.put("user", userResponse(joueur));
        return response;
    }

    private Map<String, Object> userResponse(Joueur joueur) {
        Map<String, Object> user = new HashMap<>();
        user.put("id", joueur.getId());
        user.put("pseudo", joueur.getPseudo());
        user.put("email", joueur.getEmail());
        user.put("equipeId", joueur.getEquipe() != null ? joueur.getEquipe().getId() : null);
        return user;
    }

    private Map<String, Object> errorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }
}
