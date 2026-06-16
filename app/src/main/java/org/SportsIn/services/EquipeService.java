package org.SportsIn.services;

import org.SportsIn.model.user.Equipe;
import org.SportsIn.model.user.Joueur;
import org.SportsIn.repository.EquipeRepository;
import org.SportsIn.repository.JoueurRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EquipeService {

    private final EquipeRepository equipeRepository;
    private final JoueurRepository joueurRepository;

    public EquipeService(EquipeRepository equipeRepository, JoueurRepository joueurRepository) {
        this.equipeRepository = equipeRepository;
        this.joueurRepository = joueurRepository;
    }

    public List<Equipe> getAll() {
        return equipeRepository.findAll();
    }

    public Optional<Equipe> getById(Long id) {
        return equipeRepository.findById(id);
    }

    public Equipe create(Equipe equipe) {
        return equipeRepository.save(equipe);
    }

    public Optional<Equipe> update(Long id, Equipe equipeDetails) {
        return equipeRepository.findById(id).map(equipe -> {
            equipe.setNom(equipeDetails.getNom());
            if (equipeDetails.getCouleur() != null) {
                equipe.setCouleur(equipeDetails.getCouleur());
            }
            // [F7.1] Mise à jour de l'affinité de terrain (peut être null pour la retirer)
            equipe.setAffinityType(equipeDetails.getAffinityType());
            return equipeRepository.save(equipe);
        });
    }

    public boolean delete(Long id) {
        if (equipeRepository.existsById(id)) {
            equipeRepository.deleteById(id);
            return true;
        }
        return false;
    }

    public Optional<Equipe> joinTeam(Long joueurId, Long equipeId) {
        Optional<Joueur> joueurOpt = joueurRepository.findById(joueurId);
        Optional<Equipe> equipeOpt = equipeRepository.findById(equipeId);
        if (joueurOpt.isEmpty() || equipeOpt.isEmpty()) return Optional.empty();
        Joueur joueur = joueurOpt.get();
        joueur.setEquipe(equipeOpt.get());
        joueurRepository.save(joueur);
        return equipeRepository.findById(equipeId);
    }

    public boolean leaveTeam(Long joueurId) {
        return joueurRepository.findById(joueurId).map(joueur -> {
            Equipe equipe = joueur.getEquipe();
            joueur.setEquipe(null);
            joueurRepository.save(joueur);

            // Auto-delete team if no members remain
            if (equipe != null) {
                long remainingMembers = joueurRepository.countByEquipeId(equipe.getId());
                if (remainingMembers == 0) {
                    equipeRepository.deleteById(equipe.getId());
                }
            }
            return true;
        }).orElse(false);
    }

    /**
     * [F7.1] Met à jour l'affinité de terrain de l'équipe.
     */
    public Optional<Equipe> updateAffinity(Long id, String affinityType) {
        return equipeRepository.findById(id).map(equipe -> {
            equipe.setAffinityType(affinityType);
            return equipeRepository.save(equipe);
        });
    }
}
