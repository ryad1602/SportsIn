package org.SportsIn.services;

import org.SportsIn.model.Arene;
import org.SportsIn.repository.AreneRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AreneService {

    private final AreneRepository areneRepository;

    public AreneService(AreneRepository areneRepository) {
        this.areneRepository = areneRepository;
    }

    public List<Arene> getAll() {
        return areneRepository.findAll();
    }

    public Optional<Arene> getById(String id) {
        return areneRepository.findById(id);
    }

    public List<Arene> getByEquipe(Long equipeId) {
        return areneRepository.findByControllingTeam_Id(equipeId);
    }

    public List<Arene> getBySport(String sport) {
        return areneRepository.findBySportsDisponiblesContaining(sport);
    }

    public Arene create(Arene arene) {
        return areneRepository.save(arene);
    }

    public Optional<Arene> update(String id, Arene areneDetails) {
        return areneRepository.findById(id).map(arene -> {
            arene.setNom(areneDetails.getNom());
            arene.setLatitude(areneDetails.getLatitude());
            arene.setLongitude(areneDetails.getLongitude());
            arene.setControllingTeam(areneDetails.getControllingTeam());
            arene.setSportsDisponibles(areneDetails.getSportsDisponibles());
            return areneRepository.save(arene);
        });
    }

    public boolean delete(String id) {
        if (areneRepository.existsById(id)) {
            areneRepository.deleteById(id);
            return true;
        }
        return false;
    }

    public long deleteAll() {
        long count = areneRepository.count();
        areneRepository.deleteAll();
        return count;
    }
}
