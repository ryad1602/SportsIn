import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { equipeAPI, joueurAPI, areneAPI, progressionAPI, messageAPI, contextAPI } from "../api/api.js";
import Header from "../components/Header.jsx";
import { DnaIcon, IconCrown } from "../components/Icons.jsx";
import { SkeletonCard, SkeletonStats } from "../components/Skeleton.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import "../styles/team.css";

function TeamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [playerTeam, setPlayerTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [controlledArenas, setControlledArenas] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);

  const [progression, setProgression] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#3b82f6");
  const [creating, setCreating] = useState(false);
  const [joiningTeam, setJoiningTeam] = useState(null);

  // [F7.1] Affinity state
  const [savingAffinity, setSavingAffinity] = useState(false);

  // [F10] Terrain Mastery state
  const [terrainMastery, setTerrainMastery] = useState(null);
  const masteryPollRef = useRef(null);

  // Aura state
  const [teamAura, setTeamAura] = useState(null);

  const AFFINITY_TYPES = [
    { value: 'ABYSSE', label: 'Abysse', color: '#38bdf8', desc: 'Eau, lacs, canaux',        opposite: 'NEXUS'  },
    { value: 'OLYMPE', label: 'Olympe', color: '#fbbf24', desc: 'Stades, monuments',        opposite: 'EDEN'   },
    { value: 'EDEN',   label: 'Eden',   color: '#4ade80', desc: 'Parcs, forêts',            opposite: 'OLYMPE' },
    { value: 'NEXUS',  label: 'Nexus',  color: '#f87171', desc: 'Gares, zones urbaines',    opposite: 'ABYSSE' },
  ];

  const DNA_COLORS = { ABYSSE: '#38bdf8', OLYMPE: '#fbbf24', EDEN: '#4ade80', NEXUS: '#f87171' };

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const chatPollRef = useRef(null);

  const TEAM_COLORS = [
    { value: "#3b82f6", label: "Bleu" },
    { value: "#22c55e", label: "Vert" },
    { value: "#ef4444", label: "Rouge" },
    { value: "#f59e0b", label: "Orange" },
    { value: "#8b5cf6", label: "Violet" },
    { value: "#ec4899", label: "Rose" },
    { value: "#06b6d4", label: "Cyan" },
    { value: "#84cc16", label: "Lime" },
  ];

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const teams = await equipeAPI.getAll();
      const savedTeamId = sessionStorage.getItem("insport_team_id");

      if (savedTeamId) {
        try {
          const team = await equipeAPI.getById(savedTeamId);
          setPlayerTeam(team);

          const members = await joueurAPI.getByEquipe(savedTeamId);
          setTeamMembers(members);

          const arenas = await areneAPI.getByEquipe(savedTeamId);
          setControlledArenas(arenas);

          try {
            const prog = await progressionAPI.getProgression(savedTeamId);
            setProgression(prog);
          } catch (e) {
            console.warn('Progression non disponible:', e);
          }

          try {
            const aura = await contextAPI.getTeamAura(savedTeamId);
            setTeamAura(aura);
          } catch (e) {
            console.warn('Aura non disponible:', e);
          }
        } catch (e) {
          sessionStorage.removeItem("insport_team_id");
          setAvailableTeams(teams);
        }
      } else {
        setAvailableTeams(teams);
      }
    } catch (err) {
      setError("Erreur lors du chargement des données");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const persistTeamId = (teamId) => {
    sessionStorage.setItem("insport_team_id", teamId);
    // Met aussi à jour insport_user en localStorage pour survivre au refresh
    const stored = localStorage.getItem("insport_user");
    if (stored) {
      const u = JSON.parse(stored);
      localStorage.setItem("insport_user", JSON.stringify({ ...u, equipeId: teamId }));
    }
  };

  const handleJoinTeam = async (teamId) => {
    try {
      setJoiningTeam(teamId);
      if (user?.id) {
        await equipeAPI.join(teamId, user.id);
      }
      persistTeamId(teamId);
      await loadData();
    } catch (err) {
      setError("Erreur lors de la jonction à l'équipe");
      console.error(err);
    } finally {
      setJoiningTeam(null);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      setCreating(true);
      const newTeam = await equipeAPI.create({
        nom: newTeamName.trim(),
        couleur: newTeamColor,
      });

      // Join the newly created team
      if (user?.id) {
        await equipeAPI.join(newTeam.id, user.id);
      }

      persistTeamId(newTeam.id);
      setNewTeamName("");
      setShowCreateForm(false);
      await loadData();
    } catch (err) {
      setError("Erreur lors de la création de l'équipe");
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleLeaveTeam = async () => {
    try {
      if (user?.id) {
        await equipeAPI.leave(user.id);
      }
    } catch (err) {
      console.error("Erreur lors du départ de l'équipe", err);
    }
    sessionStorage.removeItem("insport_team_id");
    const stored = localStorage.getItem("insport_user");
    if (stored) {
      const u = JSON.parse(stored);
      localStorage.setItem("insport_user", JSON.stringify({ ...u, equipeId: null }));
    }
    setPlayerTeam(null);
    setTeamMembers([]);
    setControlledArenas([]);
    loadData();
  };

  // [F7.1] Met à jour l'affinité de terrain
  const handleAffinityChange = async (affinityType) => {
    if (!playerTeam) return;
    const newAffinity = playerTeam.affinityType === affinityType ? null : affinityType;
    try {
      setSavingAffinity(true);
      const updated = await equipeAPI.updateAffinity(playerTeam.id, newAffinity);
      setPlayerTeam(updated);
    } catch (err) {
      console.error("Erreur mise à jour affinité:", err);
      setError("Erreur lors de la mise à jour de l'affinité");
    } finally {
      setSavingAffinity(false);
    }
  };

  // --- Chat functions ---
  const loadChatMessages = useCallback(async (teamId) => {
    try {
      const msgs = await messageAPI.getByEquipe(teamId);
      setChatMessages(msgs);
    } catch (err) {
      console.warn("Erreur chargement chat:", err);
    }
  }, []);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Poll chat messages every 3s when team is active
  useEffect(() => {
    const teamId = sessionStorage.getItem("insport_team_id");
    if (playerTeam && teamId) {
      loadChatMessages(teamId);
      chatPollRef.current = setInterval(() => loadChatMessages(teamId), 3000);
    }
    return () => {
      if (chatPollRef.current) clearInterval(chatPollRef.current);
    };
  }, [playerTeam, loadChatMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingMessage) return;
    const teamId = sessionStorage.getItem("insport_team_id");
    if (!user?.id || !teamId) return;

    try {
      setSendingMessage(true);
      await messageAPI.send(user.id, teamId, chatInput.trim());
      setChatInput("");
      await loadChatMessages(teamId);
    } catch (err) {
      console.error("Erreur envoi message:", err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await messageAPI.delete(messageId);
      const teamId = sessionStorage.getItem("insport_team_id");
      if (teamId) await loadChatMessages(teamId);
    } catch (err) {
      console.error("Erreur suppression message:", err);
    }
    setContextMenu(null);
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, messageId: msg.id });
  };

  // Close context menu on click anywhere
  useEffect(() => {
    const close = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [contextMenu]);

  // [F10] Poll Terrain Mastery status every 5 seconds
  useEffect(() => {
    if (!playerTeam) return;

    const pollMastery = async () => {
      try {
        const mastery = await equipeAPI.getTerrainMastery(playerTeam.id);
        setTerrainMastery(mastery);
      } catch (err) {
        console.warn('Erreur fetch terrain mastery:', err);
      }
    };

    pollMastery(); // Call immediately
    masteryPollRef.current = setInterval(pollMastery, 5000);

    return () => clearInterval(masteryPollRef.current);
  }, [playerTeam]);

  if (loading) {
    return (
      <div className="team-page">
        <Header />
        <main className="team-content">
          <SkeletonStats count={4} />
          <SkeletonCard lines={2} showAvatar />
          <SkeletonCard lines={3} />
        </main>
      </div>
    );
  }

  return (
    <div className="team-page">
      <Header />

      <main className="team-content">
        <div className="team-header">
          <button className="btn btn-ghost" onClick={() => navigate("/")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Retour
          </button>
          <h1>Mon équipe</h1>
        </div>

        {error && (
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        )}

        {playerTeam ? (
          <div className="team-layout">
            {/* Left column: team info */}
            <div className="team-view animate-fadeIn">
            {/* Info de l'équipe */}
            <div className="team-card team-info-card">
              <div className="team-info-header">
                <div
                  className="team-avatar"
                  style={{ background: `linear-gradient(135deg, ${playerTeam.couleur || "#3b82f6"} 0%, ${playerTeam.couleur || "#3b82f6"}dd 100%)` }}
                >
                  {playerTeam.nom?.charAt(0).toUpperCase()}
                </div>
                <div className="team-info-details">
                  <h2>{playerTeam.nom}</h2>
                  <span className="badge badge-success">Membre actif</span>
                </div>
              </div>

              <div className="team-stats">
                <div className="team-stat">
                  <span className="team-stat__value">{teamMembers.length}</span>
                  <span className="team-stat__label">Membres</span>
                </div>
                <div className="team-stat">
                  <span className="team-stat__value">{controlledArenas.length}</span>
                  <span className="team-stat__label">Arènes</span>
                </div>
                <div className="team-stat">
                  <span className="team-stat__value">{progression ? progression.level : '--'}</span>
                  <span className="team-stat__label">Niveau</span>
                </div>
                <div className="team-stat">
                  <span className="team-stat__value">{progression ? progression.xp : '--'}</span>
                  <span className="team-stat__label">XP</span>
                </div>
              </div>
            </div>

            {/* [F7.1] Affinité de terrain */}
            <div className="team-card">
              <div className="team-card__header">
                <h3>Affinité de terrain</h3>
                {playerTeam.affinityType && (
                  <span className="badge badge-primary" style={{ color: DNA_COLORS[playerTeam.affinityType] }}>
                    <DnaIcon type={playerTeam.affinityType} size={14} />{' '}
                    {playerTeam.affinityType}
                  </span>
                )}
              </div>
              <p className="team-affinity-hint">
                Choisissez un terrain de prédilection.
                <span className="hint-bonus"> +10% </span>sur ce terrain,
                <span className="hint-malus"> -10% </span>sur le terrain opposé.
              </p>
              <div className="team-affinity-picker">
                {AFFINITY_TYPES.map((aff) => {
                  const isActive   = playerTeam.affinityType === aff.value;
                  const isOpposite = playerTeam.affinityType
                    ? AFFINITY_TYPES.find(a => a.value === playerTeam.affinityType)?.opposite === aff.value
                    : false;
                  return (
                    <button
                      key={aff.value}
                      type="button"
                      className={`team-affinity-option ${isActive ? 'active' : ''} ${isOpposite ? 'opposed' : ''}`}
                      style={{ '--affinity-color': aff.color }}
                      onClick={() => handleAffinityChange(aff.value)}
                      disabled={savingAffinity}
                      title={`${aff.label} — ${aff.desc}`}
                    >
                      <span className="team-affinity-option__icon"><DnaIcon type={aff.value} size={20} /></span>
                      <span className="team-affinity-option__label">{aff.label}</span>
                      <span className="team-affinity-option__desc">{aff.desc}</span>
                      {isActive   && <span className="team-affinity-option__tag bonus">+10%</span>}
                      {isOpposite && <span className="team-affinity-option__tag malus">-10%</span>}
                    </button>
                  );
                })}
              </div>
              {playerTeam.affinityType && (
                <p className="team-affinity-remove-hint">Cliquez à nouveau pour retirer l'affinité</p>
              )}
            </div>

            {/* Aura d'équipe */}
            <div className="team-card team-aura-card">
              <div className="team-card__header">
                <h3>Aura d'équipe</h3>
                {teamAura?.currentAura && (
                  <span className="team-aura-active-badge" style={{ '--ac': DNA_COLORS[teamAura.currentAura] }}>
                    <DnaIcon type={teamAura.currentAura} size={16} /> {teamAura.currentAura} — Active
                  </span>
                )}
              </div>

              {!teamAura ? (
                <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '12px 0' }}>Chargement…</p>
              ) : teamAura.currentAura ? (
                /* ── Aura active ─────────────────── */
                <div>
                  <div className="team-aura-banner" style={{ '--ac': DNA_COLORS[teamAura.currentAura] }}>
                    <span className="team-aura-banner__icon"><DnaIcon type={teamAura.currentAura} size={28} /></span>
                    <div>
                      <strong>Aura {teamAura.currentAura} activée</strong>
                      <p>+10% d'influence sur toutes les arènes {teamAura.currentAura}</p>
                    </div>
                  </div>
                  {teamAura.auraProgress?.typeBreakdown && (
                    <div className="team-aura-breakdown">
                      {Object.entries(teamAura.auraProgress.typeBreakdown).map(([type, count]) => (
                        <div key={type} className="team-aura-type-row">
                          <span style={{ color: DNA_COLORS[type] || '#94a3b8' }}><DnaIcon type={type} size={16} /> {type}</span>
                          <div className="team-aura-type-bar">
                            <div
                              className="team-aura-type-bar-fill"
                              style={{
                                width: `${Math.min(100, (count / 7) * 100)}%`,
                                background: DNA_COLORS[type] || '#6b7280',
                              }}
                            />
                          </div>
                          <span className="team-aura-type-count">{count}/7</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ── Aura en construction ─────────── */
                <div>
                  <p className="team-aura-info">
                    Capturez <strong>7 arènes</strong> du même type parmi vos 10 dernières captures pour activer une Aura.
                  </p>
                  {teamAura.auraProgress?.dominantType ? (
                    <div className="team-aura-progress">
                      <div className="team-aura-progress-header">
                        <span style={{ color: DNA_COLORS[teamAura.auraProgress.dominantType] }}>
                          <DnaIcon type={teamAura.auraProgress.dominantType} size={16} /> {teamAura.auraProgress.dominantType}
                        </span>
                        <span className="team-aura-progress-count">
                          {teamAura.auraProgress.dominantCount}/{teamAura.auraProgress.threshold}
                        </span>
                      </div>
                      <div className="team-aura-bar">
                        <div
                          className="team-aura-bar-fill"
                          style={{
                            width: `${teamAura.auraProgress.progressPercent}%`,
                            background: DNA_COLORS[teamAura.auraProgress.dominantType] || '#6b7280',
                          }}
                        />
                      </div>
                      <p className="team-aura-needed">
                        Encore <strong>{teamAura.auraProgress.neededForAura}</strong> capture{teamAura.auraProgress.neededForAura > 1 ? 's' : ''} pour l'Aura
                      </p>
                    </div>
                  ) : (
                    <p className="team-aura-empty">Aucune capture enregistrée pour le moment.</p>
                  )}
                </div>
              )}
            </div>

            {/* [F10] Terrain Mastery Badge */}
            {terrainMastery?.active && (
              <div className="team-mastery-badge">
                <div className="mastery-header">
                  <span className="crown-icon"><IconCrown size={20} /></span>
                  <h3>Terrain Master</h3>
                  <span className="countdown">{terrainMastery.remainingMinutes} min</span>
                </div>
                <p className="mastery-type">{terrainMastery.type}</p>
                <div className="mastery-bonuses">
                  <span className="bonus-item">+{terrainMastery.bonusInfluencePercent}% Influence</span>
                  <span className="bonus-item">-{Math.round(terrainMastery.missionCooldownReduction * 100)}% Cooldown</span>
                </div>
                <div className="mastery-progress-bar">
                  <div className="progress-fill" style={{width: `${(terrainMastery.remainingMinutes / 360) * 100}%`}}></div>
                </div>
              </div>
            )}

            {/* Membres */}
            <div className="team-card">
              <div className="team-card__header">
                <h3>Membres de l'équipe</h3>
                <span className="badge badge-primary">{teamMembers.length}</span>
              </div>

              {teamMembers.length > 0 ? (
                <ul className="team-members-list">
                  {teamMembers.map((member) => (
                    <li key={member.id} className="team-member">
                      <div className="team-member__avatar">
                        {member.pseudo?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="team-member__info">
                        <span className="team-member__name">{member.pseudo || member.email}</span>
                        <span className="team-member__role">Joueur</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="team-empty">Aucun membre enregistré</p>
              )}
            </div>

            {/* Arènes */}
            {controlledArenas.length > 0 && (
              <div className="team-card">
                <div className="team-card__header">
                  <h3>Territoires contrôlés</h3>
                  <span className="badge badge-success">{controlledArenas.length}</span>
                </div>

                <ul className="team-arenas-list">
                  {controlledArenas.map((arena) => {
                    const dnaColor = DNA_COLORS[arena.dnaType];
                    return (
                      <li key={arena.id} className="team-arena">
                        <div
                          className="team-arena__icon"
                          style={dnaColor ? { background: `${dnaColor}20`, color: dnaColor } : {}}
                        >
                          <DnaIcon type={arena.dnaType || 'NEUTRE'} size={20} />
                        </div>
                        <div className="team-arena__info">
                          <span className="team-arena__name">{arena.nom || `Arène ${arena.id}`}</span>
                          <span className="team-arena__sports">
                            {arena.dnaType && arena.dnaType !== 'NEUTRE' && (
                              <span style={{ color: dnaColor, marginRight: 6, fontWeight: 600, fontSize: '0.75rem' }}>
                                {arena.dnaType}
                              </span>
                            )}
                            {arena.sportsDisponibles?.join(', ') || 'Multi-sports'}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Progression */}
            <div className="team-card">
              <div className="team-card__header">
                <h3>Progression</h3>
                {progression && <span className="badge badge-primary">Niv. {progression.level}</span>}
              </div>
              {progression ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--gray-400)", marginBottom: 6 }}>
                    <span>{progression.xp} XP</span>
                    {progression.level < (progression.maxLevel || 10) ? (
                      <span>{progression.xpForNextLevel} XP avant niv. {progression.level + 1}</span>
                    ) : (
                      <span>Niveau max 🏆</span>
                    )}
                  </div>
                  <div style={{ width: "100%", height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      borderRadius: 999,
                      background: "linear-gradient(90deg, #8b5cf6, #a78bfa)",
                      width: progression.level >= (progression.maxLevel || 10) ? "100%" : "50%",
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>
              ) : (
                <p style={{ color: "var(--gray-500)", textAlign: "center" }}>Chargement...</p>
              )}
              <button className="btn btn-secondary w-full" onClick={() => navigate("/progression")}>
                📈 Voir la progression et les perks
              </button>
            </div>

            <button className="btn btn-danger w-full" onClick={handleLeaveTeam}>
              Quitter l'équipe
            </button>
          </div>

            {/* Right column: Team Chat */}
            <div className="team-chat-column animate-fadeIn">
              <div className="team-card team-chat-card">
                <div className="team-card__header">
                  <h3>💬 Chat d'équipe</h3>
                  <span className="badge badge-primary">{chatMessages.length}</span>
                </div>

                <div className="team-chat-messages" ref={chatContainerRef}>
                  {chatMessages.length === 0 ? (
                    <div className="team-chat-empty">
                      <span>🗨️</span>
                      <p>Aucun message pour le moment</p>
                      <span className="text-muted">Soyez le premier à écrire !</span>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isOwn = msg.auteur?.id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`team-chat-msg ${isOwn ? "team-chat-msg--own" : ""}`}
                          onContextMenu={(e) => handleContextMenu(e, msg)}
                        >
                          {!isOwn && (
                            <div className="team-chat-msg__avatar">
                              {msg.auteur?.pseudo?.charAt(0).toUpperCase() || "?"}
                            </div>
                          )}
                          <div className="team-chat-msg__bubble">
                            {!isOwn && (
                              <span className="team-chat-msg__author">
                                {msg.auteur?.pseudo || "Inconnu"}
                              </span>
                            )}
                            <p className="team-chat-msg__text">{msg.contenu}</p>
                            <span className="team-chat-msg__time">
                              {msg.envoyeA
                                ? new Date(msg.envoyeA).toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form className="team-chat-input" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Écrire un message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    maxLength={500}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={sendingMessage || !chatInput.trim()}
                  >
                    {sendingMessage ? (
                      <div className="spinner" style={{ width: 16, height: 16 }} />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13" />
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
              <div
                className="team-chat-context-menu"
                style={{ top: contextMenu.y, left: contextMenu.x }}
              >
                <button
                  onClick={() => handleDeleteMessage(contextMenu.messageId)}
                >
                  🗑️ Supprimer le message pour tout le monde
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="team-join-view animate-fadeIn">
            {/* Rejoindre */}
            <div className="team-card">
              <div className="team-card__header">
                <h3>Équipes disponibles</h3>
                <span className="text-muted">{availableTeams.length} équipes</span>
              </div>

              {availableTeams.length > 0 ? (
                <ul className="team-available-list stagger">
                  {availableTeams.map((team) => (
                    <li key={team.id} className="team-available-item">
                      <div
                        className="team-available-item__avatar"
                        style={{ background: `linear-gradient(135deg, ${team.couleur || "#3b82f6"} 0%, ${team.couleur || "#3b82f6"}dd 100%)` }}
                      >
                        {team.nom?.charAt(0).toUpperCase()}
                      </div>
                      <div className="team-available-item__info">
                        <span className="team-available-item__name">{team.nom}</span>
                        <span className="team-available-item__members">
                          {team.membres?.length || 0} membres
                        </span>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleJoinTeam(team.id)}
                        disabled={joiningTeam === team.id}
                      >
                        {joiningTeam === team.id ? (
                          <div className="spinner" style={{ width: 16, height: 16 }} />
                        ) : (
                          "Rejoindre"
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="team-empty-state">
                  <span className="team-empty-state__icon">👥</span>
                  <p>Aucune équipe disponible</p>
                  <span className="text-muted">Sois le premier à en créer une !</span>
                </div>
              )}
            </div>

            {/* Créer */}
            <div className="team-card">
              <div className="team-card__header">
                <h3>Créer une équipe</h3>
              </div>

              {!showCreateForm ? (
                <button
                  className="btn btn-secondary w-full"
                  onClick={() => setShowCreateForm(true)}
                >
                  <span>+</span> Créer une nouvelle équipe
                </button>
              ) : (
                <form onSubmit={handleCreateTeam} className="team-create-form">
                  <div className="input-group">
                    <label className="input-label">Nom de l'équipe</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ex: Les Champions"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Couleur de l'équipe</label>
                    <div className="team-color-picker">
                      {TEAM_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`team-color-option ${newTeamColor === color.value ? "active" : ""}`}
                          style={{ background: color.value }}
                          onClick={() => setNewTeamColor(color.value)}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="team-create-actions">
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={creating || !newTeamName.trim()}
                    >
                      {creating ? "Création..." : "Créer l'équipe"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewTeamName("");
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default TeamPage;
