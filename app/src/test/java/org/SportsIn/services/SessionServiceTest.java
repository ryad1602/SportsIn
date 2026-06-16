package org.SportsIn.services;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.SportsIn.model.Arene;
import org.SportsIn.model.InMemoryRuleRepository;
import org.SportsIn.model.InMemorySessionRepository;
import org.SportsIn.model.MetricType;
import org.SportsIn.model.MetricValue;
import org.SportsIn.model.Participant;
import org.SportsIn.model.ParticipantType;
import org.SportsIn.model.Session;
import org.SportsIn.model.SessionRepository;
import org.SportsIn.model.SessionState;
import org.SportsIn.model.Sport;
import org.SportsIn.model.territory.InMemoryRouteRepository;
import org.SportsIn.model.territory.InMemoryZoneRepository;
import org.SportsIn.model.territory.RouteRepository;
import org.SportsIn.model.territory.Zone;
import org.SportsIn.model.territory.ZoneRepository;
import org.SportsIn.model.user.Equipe;
import org.SportsIn.repository.AreneRepository;
import org.SportsIn.repository.EquipeRepository;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SessionServiceTest {

    private SessionService sessionService;
    private SessionRepository sessionRepository;
    private InMemoryAreneRepository areneRepository;
    private InMemoryEquipeRepository equipeRepository;
    private ZoneRepository zoneRepository;
    private RouteRepository routeRepository;
    private TerritoryService territoryService;

    private Sport football;
    private Arene cityStade;
    private Equipe equipeAEntity;
    private Equipe equipeBEntity;
    private Participant equipeA;
    private Participant equipeB;

    @BeforeEach
    void setUp() {
        sessionRepository = new InMemorySessionRepository();
        areneRepository = new InMemoryAreneRepository();
        equipeRepository = new InMemoryEquipeRepository();
        zoneRepository = new InMemoryZoneRepository();
        routeRepository = new InMemoryRouteRepository();

        InfluenceCalculator influenceCalculator = new InfluenceCalculator(
                List.of(new RouteInfluenceModifier(routeRepository)));
        territoryService = new TerritoryService(areneRepository, equipeRepository, zoneRepository, routeRepository, influenceCalculator, null);
        XpGrantService xpGrantService = new XpGrantService(null, null, null);
        RuleEvaluationService ruleEvaluationService = new RuleEvaluationService(new InMemoryRuleRepository());
        sessionService = new SessionService(sessionRepository, territoryService, xpGrantService, ruleEvaluationService, null);

        // Données de test
        football = new Sport(1L, "FOOT", "Football", 101L, null);

        equipeAEntity = new Equipe("Les Aigles");
        equipeAEntity.setId(10L);
        equipeRepository.save(equipeAEntity);

        equipeBEntity = new Equipe("Les Requins");
        equipeBEntity.setId(12L);
        equipeRepository.save(equipeBEntity);

        cityStade = new Arene("42", "City Stade de la Villette", 48.89, 2.38);
        areneRepository.save(cityStade);

        equipeA = new Participant("10", "Les Aigles", ParticipantType.TEAM);
        equipeB = new Participant("12", "Les Requins", ParticipantType.TEAM);
        
        Zone zoneTest = new Zone(200L, "Zone de Test", List.of(cityStade));
        zoneRepository.save(zoneTest);
    }

    @Test
    @DisplayName("Cas nominal : une équipe conquiert une arène neutre")
    void testProcessSessionCompletion_SuccessfulConquest() {
        Session session = new Session("S_001", football, "42", SessionState.ACTIVE, LocalDateTime.now(), List.of(equipeA, equipeB));
        session.getResult().setMetrics(List.of(
            new MetricValue(equipeA.getId(), MetricType.GOALS, 3.0, "match"),
            new MetricValue(equipeB.getId(), MetricType.GOALS, 1.0, "match")
        ));
        sessionRepository.save(session);

        sessionService.processSessionCompletion("S_001");

        Arene areneVerif = areneRepository.findById("42").orElseThrow();
        assertEquals(10L, areneVerif.getControllingTeamId(), "L'équipe A (ID 10) devrait contrôler l'arène.");

        Session sessionVerif = sessionRepository.findById("S_001").orElseThrow();
        assertEquals(SessionState.TERMINATED, sessionVerif.getState());
        assertEquals("10", sessionVerif.getWinnerParticipantId());
    }

    @Test
    @DisplayName("Cas d'égalité : le contrôle de l'arène ne change pas")
    void testProcessSessionCompletion_NoWinner_ControlDoesNotChange() {
        cityStade.setControllingTeam(equipeBEntity);
        areneRepository.save(cityStade);

        Session session = new Session("S_002", football, "42", SessionState.ACTIVE, LocalDateTime.now(), List.of(equipeA, equipeB));
        session.getResult().setMetrics(List.of(
            new MetricValue(equipeA.getId(), MetricType.GOALS, 2.0, "match"),
            new MetricValue(equipeB.getId(), MetricType.GOALS, 2.0, "match")
        ));
        sessionRepository.save(session);

        sessionService.processSessionCompletion("S_002");

        Arene areneVerif = areneRepository.findById("42").orElseThrow();
        assertEquals(12L, areneVerif.getControllingTeamId(), "Le contrôle de l'arène ne devrait pas avoir changé.");

        Session sessionVerif = sessionRepository.findById("S_002").orElseThrow();
        assertEquals(SessionState.TERMINATED, sessionVerif.getState());
        assertNull(sessionVerif.getWinnerParticipantId());
    }
    
    @Test
    @DisplayName("Nouveau test : une équipe conquiert une arène adverse")
    void testProcessSessionCompletion_ConquersOpponentArene() {
        cityStade.setControllingTeam(equipeBEntity);
        areneRepository.save(cityStade);

        Session session = new Session("S_004", football, "42", SessionState.ACTIVE, LocalDateTime.now(), List.of(equipeA, equipeB));
        session.getResult().setMetrics(List.of(
                new MetricValue(equipeA.getId(), MetricType.GOALS, 5.0, "match"),
                new MetricValue(equipeB.getId(), MetricType.GOALS, 0.0, "match")
        ));
        sessionRepository.save(session);

        sessionService.processSessionCompletion("S_004");

        Arene areneVerif = areneRepository.findById("42").orElseThrow();
        assertEquals(10L, areneVerif.getControllingTeamId(), "Le contrôle doit basculer de l'équipe B (12) à l'équipe A (10).");
    }

    @Test
    @DisplayName("Nouveau test : une équipe défend sa propre arène")
    void testProcessSessionCompletion_DefendsOwnArene() {
        cityStade.setControllingTeam(equipeAEntity);
        areneRepository.save(cityStade);

        Session session = new Session("S_005", football, "42", SessionState.ACTIVE, LocalDateTime.now(), List.of(equipeA, equipeB));
        session.getResult().setMetrics(List.of(
                new MetricValue(equipeA.getId(), MetricType.GOALS, 2.0, "match"),
                new MetricValue(equipeB.getId(), MetricType.GOALS, 1.0, "match")
        ));
        sessionRepository.save(session);

        sessionService.processSessionCompletion("S_005");

        Arene areneVerif = areneRepository.findById("42").orElseThrow();
        assertEquals(10L, areneVerif.getControllingTeamId(), "Le contrôle doit rester à l'équipe A.");
    }

    @Test
    @DisplayName("Nouveau test : un seul joueur prend le contrôle d'une arène")
    void testProcessSessionCompletion_SinglePlayerTakesControl() {
        Session session = new Session("S_006", football, "42", SessionState.ACTIVE, LocalDateTime.now(), Collections.singletonList(equipeA));
        session.getResult().setMetrics(List.of(
                new MetricValue(equipeA.getId(), MetricType.GOALS, 10.0, "entrainement")
        ));
        sessionRepository.save(session);

        sessionService.processSessionCompletion("S_006");

        Arene areneVerif = areneRepository.findById("42").orElseThrow();
        assertEquals(10L, areneVerif.getControllingTeamId(), "Le joueur seul doit prendre le contrôle de l'arène.");
    }

    @Test
    @DisplayName("Cas d'erreur : l'ID de session est invalide")
    void testProcessSessionCompletion_InvalidSessionId_ThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> {
            sessionService.processSessionCompletion("ID_INEXISTANT");
        });
    }

    @Test
    @DisplayName("Cas d'erreur : l'ID d'arène est invalide")
    void testProcessSessionCompletion_WithInvalidAreneId_CompletesSessionWithoutCrashing() {
        Session session = new Session("S_003", football, "9999", SessionState.ACTIVE, LocalDateTime.now(), List.of(equipeA, equipeB));
        session.getResult().setMetrics(List.of(new MetricValue(equipeA.getId(), MetricType.GOALS, 5.0, "match")));
        sessionRepository.save(session);

        assertDoesNotThrow(() -> sessionService.processSessionCompletion("S_003"));

        Session sessionVerif = sessionRepository.findById("S_003").orElseThrow();
        assertEquals(SessionState.TERMINATED, sessionVerif.getState());
        assertEquals("10", sessionVerif.getWinnerParticipantId());
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
