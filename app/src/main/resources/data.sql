-- Données d'exemple pour les tests
-- Ce fichier est exécuté après schema.sql

-- ============================================
-- ÉQUIPES
-- ============================================
INSERT OR IGNORE INTO equipe (id, nom) VALUES (1, 'AS Monaco');
INSERT OR IGNORE INTO equipe (id, nom) VALUES (2, 'Paris Saint-Germain');
INSERT OR IGNORE INTO equipe (id, nom) VALUES (3, 'Olympique Lyonnais');
INSERT OR IGNORE INTO equipe (id, nom) VALUES (4, 'FC Nantes');
INSERT OR IGNORE INTO equipe (id, nom) VALUES (5, 'Stade Brest');

-- ============================================
-- JOUEURS
-- ============================================
-- Équipe 1: AS Monaco
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (1, 'Ben Yedder', 1);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (2, 'Golovin', 1);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (3, 'Caio Henrique', 1);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (4, 'Vanderson', 1);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (5, 'Magalhaes', 1);

-- Équipe 2: Paris Saint-Germain
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (6, 'Mbappé', 2);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (7, 'Neymar', 2);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (8, 'Cavani', 2);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (9, 'Verratti', 2);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (10, 'Marquinhos', 2);

-- Équipe 3: Olympique Lyonnais
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (11, 'Lacazette', 3);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (12, 'Cherki', 3);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (13, 'Thiago Mendes', 3);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (14, 'Denayer', 3);

-- Équipe 4: FC Nantes
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (15, 'Kolo Muani', 4);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (16, 'Simon', 4);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (17, 'Castelletto', 4);

-- Équipe 5: Stade Brest
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (18, 'Camara', 5);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (19, 'Faivre', 5);
INSERT OR IGNORE INTO joueur (id, pseudo, equipe_id) VALUES (20, 'Duverne', 5);

-- ============================================
-- ARÈNES (Stades)
-- ============================================
-- Colonne dna_type : types épiques influencés uniquement par l'environnement + la météo
-- ABYSSE  = zones aquatiques (côtes, rivières, ports) — s'active sous la pluie
-- OLYMPE  = hauts lieux iconiques (stades, monuments)  — s'active par ciel dégagé
-- EDEN    = sanctuaires naturels (parcs, forêts)        — s'active sous la neige/nuages
-- NEXUS   = carrefours d'énergie (gares, industries)    — s'active à l'orage
-- Arènes de base : UPSERT pour corriger le dna_type même si la ligne existe déjà en DB
-- (INSERT OR IGNORE ne mettrait pas à jour une ligne existante avec une valeur erronée)
INSERT INTO arene (id, nom, latitude, longitude, equipe_controle, dna_type)
  VALUES ('stade_louis_ii', 'Stade Louis II', 43.7384, 7.4246, 1, 'ABYSSE')
  ON CONFLICT(id) DO UPDATE SET dna_type = 'ABYSSE';
INSERT INTO arene (id, nom, latitude, longitude, equipe_controle, dna_type)
  VALUES ('parc_princes', 'Parc des Princes', 48.8432, 2.2527, 2, 'OLYMPE')
  ON CONFLICT(id) DO UPDATE SET dna_type = 'OLYMPE';
INSERT INTO arene (id, nom, latitude, longitude, equipe_controle, dna_type)
  VALUES ('groupama_stadium', 'Groupama Stadium', 45.7735, 4.8922, 3, 'NEXUS')
  ON CONFLICT(id) DO UPDATE SET dna_type = 'NEXUS';
INSERT INTO arene (id, nom, latitude, longitude, equipe_controle, dna_type)
  VALUES ('stade_beaujoire', 'Stade de la Beaujoire', 47.2679, -1.4804, 4, 'ABYSSE')
  ON CONFLICT(id) DO UPDATE SET dna_type = 'ABYSSE';
INSERT INTO arene (id, nom, latitude, longitude, equipe_controle, dna_type)
  VALUES ('stade_francis_le_ble', 'Stade Francis Le Blé', 48.3988, -4.4860, 5, 'ABYSSE')
  ON CONFLICT(id) DO UPDATE SET dna_type = 'ABYSSE';
INSERT INTO arene (id, nom, latitude, longitude, equipe_controle, dna_type)
  VALUES ('velodrome', 'Stade Vélodrome', 43.2620, 5.3963, NULL, 'NEXUS')
  ON CONFLICT(id) DO UPDATE SET dna_type = 'NEXUS';

-- ============================================
-- SPORTS DISPONIBLES PAR ARÈNE
-- ============================================
-- Stade Louis II
INSERT OR IGNORE INTO arene_sport (arene_id, sport_type) VALUES ('stade_louis_ii', 'FOOTBALL');
INSERT OR IGNORE INTO arene_sport (arene_id, sport_type) VALUES ('stade_louis_ii', 'BASKET');

-- Parc des Princes
INSERT OR IGNORE INTO arene_sport (arene_id, sport_type) VALUES ('parc_princes', 'FOOTBALL');
INSERT OR IGNORE INTO arene_sport (arene_id, sport_type) VALUES ('parc_princes', 'BASKET');
INSERT OR IGNORE INTO arene_sport (arene_id, sport_type) VALUES ('parc_princes', 'TENNIS');

-- Groupama Stadium
INSERT OR IGNORE INTO arene_sport (arene_id, sport_type) VALUES ('groupama_stadium', 'FOOTBALL');

-- Stade de la Beaujoire
INSERT OR IGNORE INTO arene_sport (arene_id, sport_type) VALUES ('stade_beaujoire', 'FOOTBALL');
INSERT OR IGNORE INTO arene_sport (arene_id, sport_type) VALUES ('stade_beaujoire', 'MUSCULATION');

-- Stade Francis Le Blé
INSERT OR IGNORE INTO arene_sport (arene_id, sport_type) VALUES ('stade_francis_le_ble', 'FOOTBALL');

-- Stade Vélodrome
INSERT OR IGNORE INTO arene_sport (arene_id, sport_type) VALUES ('velodrome', 'FOOTBALL');
INSERT OR IGNORE INTO arene_sport (arene_id, sport_type) VALUES ('velodrome', 'BASKET');
INSERT OR IGNORE INTO arene_sport (arene_id, sport_type) VALUES ('velodrome', 'TENNIS');
INSERT OR IGNORE INTO arene_sport (arene_id, sport_type) VALUES ('velodrome', 'MUSCULATION');

-- ============================================
-- SPORTS
-- ============================================
INSERT OR IGNORE INTO sport (id, code, name) VALUES (1, 'FOOTBALL', 'Football');
INSERT OR IGNORE INTO sport (id, code, name) VALUES (2, 'BASKET', 'Basketball');
INSERT OR IGNORE INTO sport (id, code, name) VALUES (3, 'TENNIS', 'Tennis');
INSERT OR IGNORE INTO sport (id, code, name) VALUES (4, 'MUSCULATION', 'Musculation');

-- ============================================
-- SESSIONS D'EXEMPLE
-- ============================================
INSERT OR IGNORE INTO session (id, sport_id, state, created_at) VALUES 
  ('session_001', 1, 'ACTIVE', '2026-01-13T10:00:00+01:00');
INSERT OR IGNORE INTO session (id, sport_id, state, created_at, ended_at) VALUES 
  ('session_002', 1, 'TERMINATED', '2026-01-13T09:00:00+01:00', '2026-01-13T11:00:00+01:00');
INSERT OR IGNORE INTO session (id, sport_id, state, created_at) VALUES 
  ('session_003', 2, 'ACTIVE', '2026-01-13T14:00:00+01:00');

-- ============================================
-- PARTICIPANTS AUX SESSIONS
-- ============================================
INSERT OR IGNORE INTO session_participant (session_id, participant_id, participant_type, participant_name) VALUES 
  ('session_001', '1', 'TEAM', 'AS Monaco');
INSERT OR IGNORE INTO session_participant (session_id, participant_id, participant_type, participant_name) VALUES 
  ('session_001', '2', 'TEAM', 'Paris Saint-Germain');

INSERT OR IGNORE INTO session_participant (session_id, participant_id, participant_type, participant_name) VALUES 
  ('session_002', '1', 'TEAM', 'AS Monaco');
INSERT OR IGNORE INTO session_participant (session_id, participant_id, participant_type, participant_name) VALUES 
  ('session_002', '3', 'TEAM', 'Olympique Lyonnais');

INSERT OR IGNORE INTO session_participant (session_id, participant_id, participant_type, participant_name) VALUES 
  ('session_003', '2', 'TEAM', 'Paris Saint-Germain');
INSERT OR IGNORE INTO session_participant (session_id, participant_id, participant_type, participant_name) VALUES 
  ('session_003', '4', 'TEAM', 'FC Nantes');

-- ============================================
-- VALEURS DE MÉTRIQUES
-- ============================================
INSERT OR IGNORE INTO metric_value (id, session_id, participant_id, metric_type, value) VALUES 
  (1, 'session_001', '1', 'GOALS', 2.0);
INSERT OR IGNORE INTO metric_value (id, session_id, participant_id, metric_type, value) VALUES 
  (2, 'session_001', '2', 'GOALS', 1.0);

INSERT OR IGNORE INTO metric_value (id, session_id, participant_id, metric_type, value) VALUES 
  (3, 'session_002', '1', 'GOALS', 3.0);
INSERT OR IGNORE INTO metric_value (id, session_id, participant_id, metric_type, value) VALUES 
  (4, 'session_002', '3', 'GOALS', 2.0);

INSERT OR IGNORE INTO metric_value (id, session_id, participant_id, metric_type, value) VALUES
  (5, 'session_003', '2', 'POINTS', 85.0);
INSERT OR IGNORE INTO metric_value (id, session_id, participant_id, metric_type, value) VALUES
  (6, 'session_003', '4', 'POINTS', 78.0);

-- ============================================
-- PERK DEFINITIONS (Feature 6)
-- ============================================
INSERT OR IGNORE INTO perk_definition (id, code, name, description, effect_type, required_level, duration_seconds, cooldown_seconds, max_active_instances, stackable, parameters_json)
VALUES (1, 'SHIELD_QUARTIER', 'Bouclier de quartier', 'Reduit de 50% les gains d''influence adverses sur un point controle pendant 3 jours.', 'INFLUENCE_REDUCTION', 3, 259200, 604800, 1, 0, '{"reductionPercent": 50, "targetType": "POINT"}');

INSERT OR IGNORE INTO perk_definition (id, code, name, description, effect_type, required_level, duration_seconds, cooldown_seconds, max_active_instances, stackable, parameters_json)
VALUES (2, 'BOOST_INFLUENCE', 'Surge d''influence', 'Augmente de 25% les gains d''influence sur un point pendant 2 jours.', 'INFLUENCE_BOOST', 5, 172800, 432000, 1, 0, '{"boostPercent": 25, "targetType": "POINT"}');

INSERT OR IGNORE INTO perk_definition (id, code, name, description, effect_type, required_level, duration_seconds, cooldown_seconds, max_active_instances, stackable, parameters_json)
VALUES (3, 'XP_BOOST', 'Entrainement intensif', 'Multiplie par 1.5 les gains d''XP pendant 24 heures.', 'XP_MULTIPLIER', 2, 86400, 259200, 1, 0, '{"multiplier": 1.5}');
