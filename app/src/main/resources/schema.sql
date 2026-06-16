-- Script SQL pour créer la base de données SQLite du projet SportsIn
-- Basé sur le schéma défini dans Stockage.txt

-- Table EQUIPE
CREATE TABLE IF NOT EXISTS equipe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL UNIQUE,
    points INTEGER NOT NULL DEFAULT 0,
    xp INTEGER NOT NULL DEFAULT 0,
    couleur TEXT,
    affinity_type TEXT,                    -- [F7.1] Affinité de terrain choisie (ABYSSE, OLYMPE, EDEN, NEXUS)
    current_aura TEXT,                   -- [F7] Aura active de l'équipe (ABYSSE, OLYMPE, EDEN, NEXUS)
    capture_history TEXT,                -- [F7] JSON: liste des 10 derniers arèneId capturés
    terrain_mastery_json TEXT             -- [F10] JSON: {type, activatedAt, expiresAt} ou NULL
);

-- Table JOUEUR
CREATE TABLE IF NOT EXISTS joueur (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    equipe_id INTEGER,
    FOREIGN KEY (equipe_id) REFERENCES equipe(id) ON DELETE SET NULL
);

-- Table ARENE
CREATE TABLE IF NOT EXISTS arene (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    equipe_controle INTEGER,
    dna_type TEXT,                       -- Type de terrain (ABYSSE, OLYMPE, EDEN, NEXUS, NEUTRE)
    dna_confidence REAL DEFAULT 0.0,     -- Score de confiance de la classification (0.0–1.0)
    dna_places_count INTEGER DEFAULT 0,  -- Nombre de lieux Google Places inspectés
    dna_evidence TEXT,                   -- Top 3 lieux ayant justifié le type (format texte)
    sport_principal TEXT,                -- Sport principal du terrain (FOOTBALL, BASKET, TENNIS, MUSCULATION, NATATION…)
    FOREIGN KEY (equipe_controle) REFERENCES equipe(id) ON DELETE SET NULL
);

-- Table de jointure ARENE_SPORT (ManyToMany entre ARENE et SportType)
CREATE TABLE IF NOT EXISTS arene_sport (
    arene_id TEXT NOT NULL,
    sport_type TEXT NOT NULL CHECK (sport_type IN (
        'FOOTBALL', 'MUSCULATION', 'BASKET', 'TENNIS',
        'NATATION', 'ATHLETISME', 'CYCLISME', 'GOLF',
        'RUGBY', 'VOLLEYBALL', 'HANDBALL', 'SPORT_COMBAT',
        'BOWLING', 'PATINAGE', 'SKI'
    )),
    PRIMARY KEY (arene_id, sport_type),
    FOREIGN KEY (arene_id) REFERENCES arene(id) ON DELETE CASCADE
);

-- Table SPORT
CREATE TABLE IF NOT EXISTS sport (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    victory_rule_id INTEGER,
    scoring_rule_id INTEGER
);

-- Table SESSION
CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    sport_id INTEGER NOT NULL,
    point_id TEXT,
    state TEXT NOT NULL CHECK (state IN ('ACTIVE', 'TERMINATED')),
    created_at TEXT NOT NULL,
    ended_at TEXT,
    winner_participant_id TEXT,
    FOREIGN KEY (sport_id) REFERENCES sport(id) ON DELETE RESTRICT
);

-- Table de jointure SESSION_PARTICIPANT (ManyToMany entre SESSION et Participant)
CREATE TABLE IF NOT EXISTS session_participant (
    session_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    participant_type TEXT NOT NULL CHECK (participant_type IN ('PLAYER', 'TEAM')),
    participant_name TEXT NOT NULL,
    PRIMARY KEY (session_id, participant_id),
    FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE
);

-- Table METRIC_VALUE
CREATE TABLE IF NOT EXISTS metric_value (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('GOALS', 'POINTS', 'TIME_SECONDS', 'REPS', 'CUSTOM')),
    value REAL NOT NULL,
    context TEXT,
    FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE
);

-- Table MISSION (Feature 5: Missions dynamiques de conquête / défense)
CREATE TABLE IF NOT EXISTS mission (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('RECAPTURE_RECENT_LOSS', 'BREAK_ROUTE', 'DIVERSITY_SPORT')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUCCESS', 'FAILED', 'EXPIRED')),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    reward_team_points INTEGER NOT NULL DEFAULT 0,
    reward_team_xp INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    completed_at TEXT,
    payload_json TEXT,
    progress_current INTEGER NOT NULL DEFAULT 0,
    progress_target INTEGER NOT NULL DEFAULT 1,
    last_evaluated_at TEXT,
    FOREIGN KEY (team_id) REFERENCES equipe(id) ON DELETE CASCADE
);

-- Table PERK_DEFINITION (Feature 6: catalogue des perks débloquables)
CREATE TABLE IF NOT EXISTS perk_definition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    effect_type TEXT NOT NULL,
    required_level INTEGER NOT NULL DEFAULT 1,
    duration_seconds INTEGER NOT NULL,
    cooldown_seconds INTEGER NOT NULL DEFAULT 0,
    max_active_instances INTEGER NOT NULL DEFAULT 1,
    stackable INTEGER NOT NULL DEFAULT 0,
    parameters_json TEXT
);

-- Table ACTIVE_PERK (Feature 6: instances de perks actifs par équipe)
CREATE TABLE IF NOT EXISTS active_perk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    perk_definition_id INTEGER NOT NULL,
    target_id TEXT,
    activated_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_used_at TEXT,
    usage_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (team_id) REFERENCES equipe(id) ON DELETE CASCADE,
    FOREIGN KEY (perk_definition_id) REFERENCES perk_definition(id) ON DELETE CASCADE
);

-- Table MESSAGE (Chat d'équipe)
CREATE TABLE IF NOT EXISTS message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contenu TEXT NOT NULL,
    envoye_a TEXT NOT NULL,
    joueur_id INTEGER NOT NULL,
    equipe_id INTEGER NOT NULL,
    FOREIGN KEY (joueur_id) REFERENCES joueur(id) ON DELETE CASCADE,
    FOREIGN KEY (equipe_id) REFERENCES equipe(id) ON DELETE CASCADE
);

-- Index pour améliorer les performances des requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_joueur_equipe_id ON joueur(equipe_id);
CREATE INDEX IF NOT EXISTS idx_arene_equipe_controle ON arene(equipe_controle);
CREATE INDEX IF NOT EXISTS idx_session_sport_id ON session(sport_id);
CREATE INDEX IF NOT EXISTS idx_session_state ON session(state);
CREATE INDEX IF NOT EXISTS idx_metric_value_session_id ON metric_value(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participant_session_id ON session_participant(session_id);
CREATE INDEX IF NOT EXISTS idx_mission_team_id ON mission(team_id);
CREATE INDEX IF NOT EXISTS idx_mission_status ON mission(status);
CREATE INDEX IF NOT EXISTS idx_mission_team_status ON mission(team_id, status);
CREATE INDEX IF NOT EXISTS idx_active_perk_team ON active_perk(team_id);
CREATE INDEX IF NOT EXISTS idx_active_perk_target ON active_perk(target_id);
CREATE INDEX IF NOT EXISTS idx_active_perk_expires ON active_perk(expires_at);
CREATE INDEX IF NOT EXISTS idx_perk_definition_level ON perk_definition(required_level);
CREATE INDEX IF NOT EXISTS idx_message_equipe ON message(equipe_id);
CREATE INDEX IF NOT EXISTS idx_message_joueur ON message(joueur_id);

-- ============================================
-- MIGRATIONS POUR BASES EXISTANTES
-- (continue-on-error=true absorbe les erreurs si colonnes déjà présentes)
-- ============================================
ALTER TABLE arene ADD COLUMN dna_confidence REAL DEFAULT 0.0;
ALTER TABLE arene ADD COLUMN dna_places_count INTEGER DEFAULT 0;
ALTER TABLE arene ADD COLUMN dna_evidence TEXT;
ALTER TABLE arene ADD COLUMN sport_principal TEXT;

-- Migration arene_sport : recréer la table avec le nouveau CHECK étendu
-- SQLite ne supporte pas ALTER TABLE ... MODIFY CONSTRAINT
-- On recrée la table en préservant les données existantes
CREATE TABLE IF NOT EXISTS arene_sport_new (
    arene_id TEXT NOT NULL,
    sport_type TEXT NOT NULL CHECK (sport_type IN (
        'FOOTBALL', 'MUSCULATION', 'BASKET', 'TENNIS',
        'NATATION', 'ATHLETISME', 'CYCLISME', 'GOLF',
        'RUGBY', 'VOLLEYBALL', 'HANDBALL', 'SPORT_COMBAT',
        'BOWLING', 'PATINAGE', 'SKI'
    )),
    PRIMARY KEY (arene_id, sport_type),
    FOREIGN KEY (arene_id) REFERENCES arene(id) ON DELETE CASCADE
);
INSERT OR IGNORE INTO arene_sport_new SELECT * FROM arene_sport;
DROP TABLE IF EXISTS arene_sport;
ALTER TABLE arene_sport_new RENAME TO arene_sport;

