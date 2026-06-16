import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, Cell,
} from "recharts";
import { progressionAPI, areneAPI } from "../api/api.js";
import Header from "../components/Header.jsx";
import { SkeletonCard, SkeletonStats } from "../components/Skeleton.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import {
  IconShield, IconZap, IconStar, IconTarget, IconBarChart,
  IconClock, IconRotateCcw, IconPackage, IconMoon, IconLock,
  IconCheck, IconUsers, IconTrophy, IconAlertTriangle,
} from "../components/Icons.jsx";
import "../styles/progression.css";

/** Icône et classe CSS selon le type d'effet */
const PERK_ICONS = {
  INFLUENCE_REDUCTION: { icon: <IconShield size={20} />, className: "perk-icon--shield" },
  INFLUENCE_BOOST:     { icon: <IconZap size={20} />,   className: "perk-icon--boost"  },
  XP_MULTIPLIER:       { icon: <IconStar size={20} />,  className: "perk-icon--xp"     },
};

/** Formate une durée en secondes vers un texte lisible */
function formatDuration(seconds) {
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    return `${days}j`;
  }
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  }
  return `${Math.floor(seconds / 60)}min`;
}

/** Formate un temps restant ISO → texte */
function formatTimeRemaining(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return "Expiré";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}j ${hours % 24}h`;
  }
  return `${hours}h ${mins}min`;
}

function ProgressionPage() {
  const navigate = useNavigate();
  const teamId = sessionStorage.getItem("insport_team_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview | catalog | active

  // Data
  const [progression, setProgression] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [activePerks, setActivePerks] = useState([]);
  const [arenas, setArenas] = useState([]);

  // Modal
  const [activatingPerk, setActivatingPerk] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateError, setActivateError] = useState(null);

  const loadData = useCallback(async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [prog, perks, active, arenaList] = await Promise.all([
        progressionAPI.getProgression(teamId),
        progressionAPI.getAllPerks(),
        progressionAPI.getActivePerks(teamId),
        areneAPI.getByEquipe(teamId).catch(() => []),
      ]);

      setProgression(prog);
      setCatalog(perks);
      setActivePerks(active);
      setArenas(arenaList);
    } catch (err) {
      setError("Erreur lors du chargement de la progression");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh active perks timer every minute
  useEffect(() => {
    if (activeTab !== "active") return;
    const interval = setInterval(() => {
      if (teamId) {
        progressionAPI.getActivePerks(teamId).then(setActivePerks).catch(() => {});
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [activeTab, teamId]);

  const handleActivatePerk = async () => {
    if (!activatingPerk) return;

    try {
      setActivateLoading(true);
      setActivateError(null);
      await progressionAPI.activatePerk(teamId, activatingPerk.code, selectedTarget || null);
      setActivatingPerk(null);
      setSelectedTarget("");
      await loadData();
      setActiveTab("active");
    } catch (err) {
      setActivateError(err.message || "Erreur lors de l'activation");
    } finally {
      setActivateLoading(false);
    }
  };

  const getPerkIcon = (effectType) => {
    return PERK_ICONS[effectType] || { icon: <IconTarget size={20} />, className: "perk-icon--default" };
  };

  const isUnlocked = (perk) => {
    return progression && progression.level >= perk.requiredLevel;
  };

  const xpPercent = () => {
    if (!progression) return 0;
    if (progression.level >= (progression.maxLevel || 10)) return 100;
    if (progression.xpForNextLevel <= 0) return 100;
    // Calculate XP into current level
    const currentXp = progression.xp;
    // We need to compute the progress within the current level
    // The controller returns xpForNextLevel as the remaining XP
    const levelXp = getLevelXpRequired(progression.level);
    const nextLevelXp = getLevelXpRequired(progression.level + 1);
    if (nextLevelXp <= levelXp) return 100;
    const progress = currentXp - levelXp;
    const needed = nextLevelXp - levelXp;
    return Math.min(100, Math.max(0, (progress / needed) * 100));
  };

  // Mimic LevelThreshold table
  const LEVEL_THRESHOLDS = [0, 0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500];
  const getLevelXpRequired = (level) => {
    if (level < 1) return 0;
    if (level > 10) return LEVEL_THRESHOLDS[10];
    return LEVEL_THRESHOLDS[level] || 0;
  };

  // ---- Render ----

  if (!teamId) {
    return (
      <div className="progression-page">
        <Header />
        <main className="progression-content">
          <div className="progression-no-team">
            <span className="progression-no-team__icon"><IconUsers size={40} /></span>
            <p>Rejoignez une équipe pour accéder à la progression</p>
            <button className="btn btn-primary" onClick={() => navigate("/team")}>
              Voir les équipes
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="progression-page">
        <Header />
        <main className="progression-content">
          <SkeletonStats count={4} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </main>
      </div>
    );
  }

  return (
    <div className="progression-page">
      <Header />

      <main className="progression-content">
        <div className="progression-header">
          <button className="btn btn-ghost" onClick={() => navigate("/team")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Équipe
          </button>
          <h1>Progression</h1>
        </div>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* Tabs */}
        <div className="prog-tabs">
          <button
            className={`prog-tab ${activeTab === "overview" ? "prog-tab--active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <IconBarChart size={16} /> Vue d'ensemble
          </button>
          <button
            className={`prog-tab ${activeTab === "catalog" ? "prog-tab--active" : ""}`}
            onClick={() => setActiveTab("catalog")}
          >
            <IconTarget size={16} /> Catalogue perks
          </button>
          <button
            className={`prog-tab ${activeTab === "active" ? "prog-tab--active" : ""}`}
            onClick={() => setActiveTab("active")}
          >
            <IconZap size={16} /> Perks actifs
            {activePerks.length > 0 && (
              <span className="badge badge-primary" style={{ marginLeft: 6, fontSize: "0.7rem" }}>
                {activePerks.length}
              </span>
            )}
          </button>
        </div>

        {/* === TAB: Overview === */}
        {activeTab === "overview" && progression && (
          <>
            {/* Level Card */}
            <div className="prog-card level-card">
              <div className="level-overview">
                <div className="level-badge">
                  <span className="level-badge__number">{progression.level}</span>
                  <span className="level-badge__label">Niveau</span>
                </div>
                <div className="level-info">
                  <h2 className="level-info__team-name">{progression.teamName}</h2>
                  <p className="level-info__xp-text">
                    <strong>{progression.xp}</strong> XP total
                    {progression.level < (progression.maxLevel || 10) && (
                      <> — <strong>{progression.xpForNextLevel}</strong> XP avant niveau {progression.level + 1}</>
                    )}
                    {progression.level >= (progression.maxLevel || 10) && (
                      <> — Niveau maximum atteint ! <IconTrophy size={16} /></>
                    )}
                  </p>
                  <div className="xp-progress">
                    <div className="xp-progress__bar-bg">
                      <div
                        className="xp-progress__bar-fill"
                        style={{ width: `${xpPercent()}%` }}
                      />
                    </div>
                    <div className="xp-progress__labels">
                      <span>Niv. {progression.level}</span>
                      {progression.level < (progression.maxLevel || 10) ? (
                        <span>Niv. {progression.level + 1}</span>
                      ) : (
                        <span>MAX</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="level-stats">
                <div className="level-stat">
                  <span className="level-stat__value">{progression.xp}</span>
                  <span className="level-stat__label">XP Total</span>
                </div>
                <div className="level-stat">
                  <span className="level-stat__value">{progression.level}</span>
                  <span className="level-stat__label">Niveau</span>
                </div>
                <div className="level-stat">
                  <span className="level-stat__value">{progression.unlockedPerks?.length || 0}</span>
                  <span className="level-stat__label">Perks débloqués</span>
                </div>
                <div className="level-stat">
                  <span className="level-stat__value">{activePerks.length}</span>
                  <span className="level-stat__label">Perks actifs</span>
                </div>
              </div>
            </div>

            {/* === Charts === */}
            <div className="prog-charts-row">
              {/* Radial XP gauge */}
              <div className="prog-card prog-chart-card">
                <div className="prog-card__header">
                  <h3>Progression XP</h3>
                  <span className="badge badge-primary">Niv. {progression.level}</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius="60%" outerRadius="80%"
                    startAngle={200} endAngle={-20}
                    data={[
                      { name: 'XP', value: 100, fill: 'var(--surface-2, #1e293b)' },
                      { name: 'XP', value: xpPercent(), fill: 'var(--primary, #6366f1)' },
                    ]}
                  >
                    <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'var(--surface-2, #1e293b)' }} />
                    <Tooltip formatter={(v) => [`${Math.round(v)}%`, 'Progression']} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <p className="prog-chart-label">
                  {progression.level >= (progression.maxLevel || 10)
                    ? 'Niveau maximum atteint'
                    : `${Math.round(xpPercent())}% vers le niveau ${progression.level + 1}`}
                </p>
              </div>

              {/* Terrain coverage bar chart */}
              {arenas.length > 0 && (() => {
                const DNA_COLORS_CHART = { ABYSSE: '#38bdf8', OLYMPE: '#fbbf24', EDEN: '#4ade80', NEXUS: '#f87171', NEUTRE: '#94a3b8' };
                const counts = arenas.reduce((acc, a) => {
                  const t = a.dnaType || 'NEUTRE';
                  acc[t] = (acc[t] || 0) + 1;
                  return acc;
                }, {});
                const data = Object.entries(counts).map(([type, count]) => ({ type, count, fill: DNA_COLORS_CHART[type] || '#94a3b8' }));
                return (
                  <div className="prog-card prog-chart-card">
                    <div className="prog-card__header">
                      <h3>Terrains contrôlés</h3>
                      <span className="badge badge-success">{arenas.length}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <XAxis dataKey="type" tick={{ fill: 'var(--gray-400, #94a3b8)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: 'var(--gray-400, #94a3b8)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ background: 'var(--surface, #0f172a)', border: '1px solid var(--border, #334155)', borderRadius: 8 }}
                          labelStyle={{ color: 'var(--text-primary, #f1f5f9)' }}
                          itemStyle={{ color: 'var(--text-secondary, #94a3b8)' }}
                        />
                        <Bar dataKey="count" name="Arènes" radius={[4, 4, 0, 0]}>
                          {data.map((entry) => (
                            <Cell key={entry.type} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>

            {/* Unlocked Perks summary */}
            {progression.unlockedPerks?.length > 0 && (
              <div className="prog-card">
                <div className="prog-card__header">
                  <h3>Perks débloqués</h3>
                  <span className="badge badge-success">{progression.unlockedPerks.length}</span>
                </div>
                <div className="perks-grid">
                  {progression.unlockedPerks.map((perk) => {
                    const { icon, className } = getPerkIcon(perk.effectType);
                    return (
                      <div key={perk.id} className="perk-item perk-item--unlocked">
                        <div className={`perk-icon ${className}`}>{icon}</div>
                        <div className="perk-details">
                          <div className="perk-details__name">
                            {perk.name}
                            <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>Débloqué</span>
                          </div>
                          <p className="perk-details__desc">{perk.description}</p>
                          <div className="perk-meta">
                            <span className="perk-meta__tag"><IconClock size={12} /> {formatDuration(perk.durationSeconds)}</span>
                            <span className="perk-meta__tag"><IconRotateCcw size={12} /> Cooldown {formatDuration(perk.cooldownSeconds)}</span>
                          </div>
                        </div>
                        <div className="perk-actions">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setActivatingPerk(perk);
                              setActivateError(null);
                              setSelectedTarget("");
                            }}
                          >
                            Activer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* === TAB: Catalog === */}
        {activeTab === "catalog" && (
          <div className="prog-card">
            <div className="prog-card__header">
              <h3>Catalogue des perks</h3>
              <span className="badge badge-primary">{catalog.length} perks</span>
            </div>
            <div className="perks-grid">
              {catalog.map((perk) => {
                const { icon, className } = getPerkIcon(perk.effectType);
                const unlocked = isUnlocked(perk);
                return (
                  <div key={perk.id} className={`perk-item ${unlocked ? "perk-item--unlocked" : "perk-item--locked"}`}>
                    <div className={`perk-icon ${className}`}>{icon}</div>
                    <div className="perk-details">
                      <div className="perk-details__name">{perk.name}</div>
                      <p className="perk-details__desc">{perk.description}</p>
                      <div className="perk-meta">
                        <span className="perk-meta__tag"><IconClock size={12} /> {formatDuration(perk.durationSeconds)}</span>
                        <span className="perk-meta__tag"><IconRotateCcw size={12} /> {formatDuration(perk.cooldownSeconds)}</span>
                        <span className="perk-meta__tag"><IconPackage size={12} /> {perk.maxActiveInstances}</span>
                      </div>
                    </div>
                    <div className="perk-actions">
                      <span className={`perk-level-req ${unlocked ? "perk-level-req--unlocked" : "perk-level-req--locked"}`}>
                        {unlocked ? <IconCheck size={13} /> : <IconLock size={13} />} Niv. {perk.requiredLevel}
                      </span>
                      {unlocked && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setActivatingPerk(perk);
                            setActivateError(null);
                            setSelectedTarget("");
                          }}
                        >
                          Activer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {catalog.length === 0 && (
                <div className="no-active-perks">
                  <span className="no-active-perks__icon"><IconPackage size={36} /></span>
                  <p>Aucun perk disponible</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === TAB: Active Perks === */}
        {activeTab === "active" && (
          <div className="prog-card">
            <div className="prog-card__header">
              <h3>Perks actifs</h3>
              <span className="badge badge-primary">{activePerks.length}</span>
            </div>
            {activePerks.length > 0 ? (
              <ul className="active-perks-list">
                {activePerks.map((ap) => {
                  const def = catalog.find((p) => p.id === ap.perkDefinitionId);
                  const { icon } = getPerkIcon(def?.effectType);
                  return (
                    <li key={ap.id} className="active-perk-item">
                      <div className="active-perk__icon">{icon}</div>
                      <div className="active-perk__info">
                        <span className="active-perk__name">{def?.name || `Perk #${ap.perkDefinitionId}`}</span>
                        {ap.targetId && (
                          <span className="active-perk__target">
                            Cible : Arène #{ap.targetId}
                          </span>
                        )}
                      </div>
                      <div className="active-perk__timer">
                        <span className="active-perk__time-left">
                          {formatTimeRemaining(ap.expiresAt)}
                        </span>
                        <span className="active-perk__expires-label">restant</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="no-active-perks">
                <span className="no-active-perks__icon"><IconMoon size={36} /></span>
                <p>Aucun perk actif</p>
                <span style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
                  Activez un perk depuis le catalogue ou la vue d'ensemble
                </span>
              </div>
            )}
          </div>
        )}

        {/* === Activate Perk Modal === */}
        {activatingPerk && (
          <div className="perk-modal-overlay" onClick={() => setActivatingPerk(null)}>
            <div className="perk-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Activer : {activatingPerk.name}</h3>
              <p className="perk-modal__desc">{activatingPerk.description}</p>

              {/* For shield & boost, need a target arena */}
              {(activatingPerk.effectType === "INFLUENCE_REDUCTION" ||
                activatingPerk.effectType === "INFLUENCE_BOOST") && (
                <div className="perk-modal__field">
                  <label>Arène cible</label>
                  <select
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                  >
                    <option value="">-- Choisir une arène --</option>
                    {arenas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nom || `Arène ${a.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="perk-meta" style={{ marginBottom: 16 }}>
                <span className="perk-meta__tag"><IconClock size={12} /> {formatDuration(activatingPerk.durationSeconds)}</span>
                <span className="perk-meta__tag"><IconRotateCcw size={12} /> {formatDuration(activatingPerk.cooldownSeconds)}</span>
              </div>

              {activateError && (
                <div className="perk-modal__error">{activateError}</div>
              )}

              <div className="perk-modal__actions">
                <button
                  className="btn btn-success"
                  onClick={handleActivatePerk}
                  disabled={
                    activateLoading ||
                    ((activatingPerk.effectType === "INFLUENCE_REDUCTION" ||
                      activatingPerk.effectType === "INFLUENCE_BOOST") &&
                      !selectedTarget)
                  }
                >
                  {activateLoading ? "Activation..." : "Confirmer l'activation"}
                </button>
                <button className="btn btn-ghost" onClick={() => setActivatingPerk(null)}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ProgressionPage;
