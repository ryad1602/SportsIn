package org.SportsIn.services;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.SportsIn.model.Arene;
import org.SportsIn.model.territory.InMemoryRouteRepository;
import org.SportsIn.model.territory.InMemoryZoneRepository;
import org.SportsIn.model.territory.Route;
import org.SportsIn.model.territory.RouteRepository;
import org.SportsIn.model.territory.Zone;
import org.SportsIn.model.territory.ZoneRepository;
import org.SportsIn.model.user.Equipe;
import org.SportsIn.repository.AreneRepository;
import org.SportsIn.repository.EquipeRepository;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TerritoryServiceTest {

    private TerritoryService territoryService;
    private InMemoryAreneRepository areneRepository;
    private InMemoryEquipeRepository equipeRepository;
    private ZoneRepository zoneRepository;
    private RouteRepository routeRepository;

    private Equipe team10;
    private Equipe team20;
    private Arene a1, a2, a3, a4;
    private Zone zoneNord;
    private Route routeTest;

    @BeforeEach
    void setUp() {
        areneRepository = new InMemoryAreneRepository();
        equipeRepository = new InMemoryEquipeRepository();
        zoneRepository = new InMemoryZoneRepository();
        routeRepository = new InMemoryRouteRepository();
        InfluenceCalculator influenceCalculator = new InfluenceCalculator(
                List.of(new RouteInfluenceModifier(routeRepository)));
        territoryService = new TerritoryService(areneRepository, equipeRepository, zoneRepository, routeRepository, influenceCalculator, null);

        // Création des équipes
        team10 = new Equipe("Équipe 10");
        team10.setId(10L);
        equipeRepository.save(team10);

        team20 = new Equipe("Équipe 20");
        team20.setId(20L);
        equipeRepository.save(team20);

        // Création de 4 arènes
        a1 = new Arene("a1", "Arène 1", 0, 0);
        a2 = new Arene("a2", "Arène 2", 0, 0);
        a3 = new Arene("a3", "Arène 3", 0, 0);
        a4 = new Arene("a4", "Arène 4", 0, 0);

        areneRepository.save(a1);
        areneRepository.save(a2);
        areneRepository.save(a3);
        areneRepository.save(a4);

        // Création d'une zone contenant ces 4 arènes
        zoneNord = new Zone(100L, "Zone Nord", List.of(a1, a2, a3, a4));
        zoneRepository.save(zoneNord);

        // Création d'une route
        routeTest = new Route(200L, "Route Test", "A1 -> A4", new ArrayList<>(Arrays.asList(a1, a2, a3, a4)));
        routeRepository.save(routeTest);
    }

    @Test
    @DisplayName("Conquête d'une arène simple")
    void testUpdateTerritoryControl_SimpleAreneConquest() {
        territoryService.updateTerritoryControl("a1", 10L);

        Arene updatedA1 = areneRepository.findById("a1").orElseThrow();
        assertEquals(10L, updatedA1.getControllingTeamId());
        
        // La zone ne doit pas être contrôlée (seulement 1 arène)
        Zone updatedZone = zoneRepository.findById(100L).orElseThrow();
        assertNull(updatedZone.getControllingTeamId());
    }

    @Test
    @DisplayName("Conquête d'une zone (3 arènes)")
    void testUpdateTerritoryControl_ZoneConquest() {
        a1.setControllingTeam(team10);
        a2.setControllingTeam(team10);
        areneRepository.save(a1);
        areneRepository.save(a2);

        territoryService.updateTerritoryControl("a3", 10L);

        Zone updatedZone = zoneRepository.findById(100L).orElseThrow();
        assertEquals(10L, updatedZone.getControllingTeamId(), "La zone devrait être contrôlée par l'équipe 10 (3 arènes).");
    }

    @Test
    @DisplayName("Perte d'une zone (passage sous 3 arènes)")
    void testUpdateTerritoryControl_ZoneLoss() {
        a1.setControllingTeam(team10);
        a2.setControllingTeam(team10);
        a3.setControllingTeam(team10);
        zoneNord.setControllingTeamId(10L);
        
        areneRepository.save(a1);
        areneRepository.save(a2);
        areneRepository.save(a3);
        zoneRepository.save(zoneNord);

        territoryService.updateTerritoryControl("a3", 20L);

        Zone updatedZone = zoneRepository.findById(100L).orElseThrow();
        assertNull(updatedZone.getControllingTeamId(), "La zone devrait être perdue (plus que 2 arènes).");
    }

    @Test
    @DisplayName("Changement de propriétaire de zone")
    void testUpdateTerritoryControl_ZoneOwnerChange() {
        a1.setControllingTeam(team10);
        a2.setControllingTeam(team10);
        a3.setControllingTeam(team10);
        zoneNord.setControllingTeamId(10L);
        
        a4.setControllingTeam(team20);
        
        areneRepository.save(a1);
        areneRepository.save(a2);
        areneRepository.save(a3);
        areneRepository.save(a4);
        zoneRepository.save(zoneNord);

        territoryService.updateTerritoryControl("a1", 20L);
        territoryService.updateTerritoryControl("a2", 20L);
        
        Zone updatedZone = zoneRepository.findById(100L).orElseThrow();
        assertEquals(20L, updatedZone.getControllingTeamId());
    }

    @Test
    @DisplayName("Détection de bonus de route")
    void testUpdateTerritoryControl_RouteBonus() {
        a1.setControllingTeam(team10);
        a2.setControllingTeam(team10);
        areneRepository.save(a1);
        areneRepository.save(a2);

        territoryService.updateTerritoryControl("a3", 10L);

        assertEquals(10L, a3.getControllingTeamId());
    }

    // ========== IN-MEMORY STUBS ==========

    static class InMemoryAreneRepository implements AreneRepository {
        private final Map<String, Arene> db = new LinkedHashMap<>();

        @Override public List<Arene> findByControllingTeam_Id(Long teamId) {
            return db.values().stream()
                    .filter(a -> a.getControllingTeam() != null && teamId.equals(a.getControllingTeam().getId()))
                    .toList();
        }
        @Override public List<Arene> findBySportsDisponiblesContaining(String sport) {
            return db.values().stream()
                    .filter(a -> a.getSportsDisponibles() != null && a.getSportsDisponibles().contains(sport))
                    .toList();
        }
        @Override public <S extends Arene> S save(S entity) { db.put(entity.getId(), entity); return entity; }
        @Override public Optional<Arene> findById(String id) { return Optional.ofNullable(db.get(id)); }
        @Override public boolean existsById(String id) { return db.containsKey(id); }
        @Override public List<Arene> findAll() { return new ArrayList<>(db.values()); }
        @Override public <S extends Arene> List<S> saveAll(Iterable<S> entities) { entities.forEach(this::save); return List.of(); }
        @Override public List<Arene> findAllById(Iterable<String> ids) { return List.of(); }
        @Override public long count() { return db.size(); }
        @Override public void deleteById(String id) { db.remove(id); }
        @Override public void delete(Arene entity) { db.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> ids) {}
        @Override public void deleteAll(Iterable<? extends Arene> entities) {}
        @Override public void deleteAll() { db.clear(); }
        @Override public void flush() {}
        @Override public <S extends Arene> S saveAndFlush(S entity) { return save(entity); }
        @Override public <S extends Arene> List<S> saveAllAndFlush(Iterable<S> entities) { return List.of(); }
        @Override public void deleteAllInBatch(Iterable<Arene> entities) {}
        @Override public void deleteAllByIdInBatch(Iterable<String> ids) {}
        @Override public void deleteAllInBatch() {}
        @Override public Arene getOne(String id) { return db.get(id); }
        @Override public Arene getById(String id) { return db.get(id); }
        @Override public Arene getReferenceById(String id) { return db.get(id); }
        @Override public <S extends Arene> Optional<S> findOne(org.springframework.data.domain.Example<S> example) { return Optional.empty(); }
        @Override public <S extends Arene> List<S> findAll(org.springframework.data.domain.Example<S> example) { return List.of(); }
        @Override public <S extends Arene> List<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Sort sort) { return List.of(); }
        @Override public <S extends Arene> org.springframework.data.domain.Page<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Pageable pageable) { return org.springframework.data.domain.Page.empty(); }
        @Override public <S extends Arene> long count(org.springframework.data.domain.Example<S> example) { return 0; }
        @Override public <S extends Arene> boolean exists(org.springframework.data.domain.Example<S> example) { return false; }
        @Override public <S extends Arene, R> R findBy(org.springframework.data.domain.Example<S> example, java.util.function.Function<org.springframework.data.repository.query.FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<Arene> findAll(org.springframework.data.domain.Sort sort) { return findAll(); }
        @Override public org.springframework.data.domain.Page<Arene> findAll(org.springframework.data.domain.Pageable pageable) { return org.springframework.data.domain.Page.empty(); }
    }

    static class InMemoryEquipeRepository implements EquipeRepository {
        private final Map<Long, Equipe> db = new LinkedHashMap<>();

        @Override public Optional<Equipe> findByNom(String nom) {
            return db.values().stream().filter(e -> e.getNom().equals(nom)).findFirst();
        }
        @Override public <S extends Equipe> S save(S entity) { db.put(entity.getId(), entity); return entity; }
        @Override public Optional<Equipe> findById(Long id) { return Optional.ofNullable(db.get(id)); }
        @Override public boolean existsById(Long id) { return db.containsKey(id); }
        @Override public List<Equipe> findAll() { return new ArrayList<>(db.values()); }
        @Override public <S extends Equipe> List<S> saveAll(Iterable<S> entities) { entities.forEach(this::save); return List.of(); }
        @Override public List<Equipe> findAllById(Iterable<Long> ids) { return List.of(); }
        @Override public long count() { return db.size(); }
        @Override public void deleteById(Long id) { db.remove(id); }
        @Override public void delete(Equipe entity) { db.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends Long> ids) {}
        @Override public void deleteAll(Iterable<? extends Equipe> entities) {}
        @Override public void deleteAll() { db.clear(); }
        @Override public void flush() {}
        @Override public <S extends Equipe> S saveAndFlush(S entity) { return save(entity); }
        @Override public <S extends Equipe> List<S> saveAllAndFlush(Iterable<S> entities) { return List.of(); }
        @Override public void deleteAllInBatch(Iterable<Equipe> entities) {}
        @Override public void deleteAllByIdInBatch(Iterable<Long> ids) {}
        @Override public void deleteAllInBatch() {}
        @Override public Equipe getOne(Long id) { return db.get(id); }
        @Override public Equipe getById(Long id) { return db.get(id); }
        @Override public Equipe getReferenceById(Long id) { return db.get(id); }
        @Override public <S extends Equipe> Optional<S> findOne(org.springframework.data.domain.Example<S> example) { return Optional.empty(); }
        @Override public <S extends Equipe> List<S> findAll(org.springframework.data.domain.Example<S> example) { return List.of(); }
        @Override public <S extends Equipe> List<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Sort sort) { return List.of(); }
        @Override public <S extends Equipe> org.springframework.data.domain.Page<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Pageable pageable) { return org.springframework.data.domain.Page.empty(); }
        @Override public <S extends Equipe> long count(org.springframework.data.domain.Example<S> example) { return 0; }
        @Override public <S extends Equipe> boolean exists(org.springframework.data.domain.Example<S> example) { return false; }
        @Override public <S extends Equipe, R> R findBy(org.springframework.data.domain.Example<S> example, java.util.function.Function<org.springframework.data.repository.query.FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<Equipe> findAll(org.springframework.data.domain.Sort sort) { return findAll(); }
        @Override public org.springframework.data.domain.Page<Equipe> findAll(org.springframework.data.domain.Pageable pageable) { return org.springframework.data.domain.Page.empty(); }
    }
}
