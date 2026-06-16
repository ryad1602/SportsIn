import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { sessionAPI, equipeAPI, contextAPI } from "../api/api.js";
import Header from "../components/Header.jsx";
import { cardVariants } from "../components/PageTransition.jsx";
import {
  IconTrophy, IconHome, IconSword, IconAlertTriangle,
  IconCheck, IconMapPin, IconShield, IconZap, IconStar,
} from "../components/Icons.jsx";
import "../styles/game-result.css";

const DNA_COLORS = {
  ABYSSE: "#38bdf8",
  OLYMPE: "#fbbf24",
  EDEN:   "#4ade80",
  NEXUS:  "#f87171",
  NEUTRE: "#94a3b8",
};

const DNA_LABELS = {
  ABYSSE: "Abysse",
  OLYMPE: "Olympe",
  EDEN:   "Eden",
  NEXUS:  "Nexus",
  NEUTRE: "Neutre",
};

function BonusRow({ label, value, positive }) {
  if (!value || value === 0) return null;
  const sign = value > 0 ? "+" : "";
  const color = value > 0 ? "#4ade80" : "#f87171";
  return (
    <div className="result-bonus-row">
      <span className="result-bonus-label">{label}</span>
      <span className="result-bonus-value" style={{ color }}>
        {sign}{Math.round(value * 100)}%
      </span>
    </div>
  );
}

function TeamDnaCard({ teamName, teamId, areneId, isWinner }) {
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    if (!areneId || !teamId) return;
    contextAPI.getArenaContext(areneId, teamId)
      .then(setCtx)
      .catch(() => {});
  }, [areneId, teamId]);

  if (!ctx) return null;

  const dnaColor = DNA_COLORS[ctx.dnaType] || DNA_COLORS.NEUTRE;
  const totalBonus = ctx.totalScoreBonus || 0;
  const hasBonus = Math.abs(totalBonus) > 0.001;

  return (
    <div className={`result-dna-card ${isWinner ? "result-dna-card--winner" : "result-dna-card--loser"}`}>
      <div className="result-dna-header">
        <div className="result-dna-team">
          {teamName}
          {isWinner && <span className="result-winner-inline">✓ Vainqueur</span>}
        </div>
        {ctx.dnaType && (
          <span className="result-dna-badge" style={{ background: dnaColor + "22", color: dnaColor, border: `1px solid ${dnaColor}44` }}>
            {DNA_LABELS[ctx.dnaType] || ctx.dnaType}
          </span>
        )}
      </div>

      {hasBonus ? (
        <div className="result-bonus-list">
          <BonusRow label="Bonus DNA (terrain classifié)" value={ctx.geoBonus} />
          <BonusRow label={`Bonus temporel (${ctx.timePeriod || ""})`} value={ctx.timeBonus} />
          <BonusRow label="Synergie aura" value={ctx.synergyBonus} />
          <BonusRow label={ctx.affinityBonus < 0 ? "Malus affinité (terrain opposé)" : "Bonus affinité"} value={ctx.affinityBonus} />
          <BonusRow label="Terrain Mastery" value={ctx.masteryBonus} />
          <div className="result-bonus-total">
            <span>Modificateur appliqué</span>
            <span style={{ color: totalBonus >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>
              {totalBonus >= 0 ? "+" : ""}{Math.round(totalBonus * 100)}%
            </span>
          </div>
        </div>
      ) : (
        <p className="result-dna-neutral">Aucun modificateur contextuel (terrain NEUTRE)</p>
      )}

      {ctx.affinityMatch && (
        <div className="result-dna-tag result-dna-tag--match">Affinité terrain ✓</div>
      )}
      {ctx.opposedTerrain && (
        <div className="result-dna-tag result-dna-tag--malus">Terrain opposé —</div>
      )}
      {ctx.masteryActive && (
        <div className="result-dna-tag result-dna-tag--mastery">
          Terrain Mastery actif ({ctx.masteryRemainingMinutes}min)
        </div>
      )}
    </div>
  );
}

function GameResultPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession]       = useState(null);
  const [winnerTeam, setWinnerTeam] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => { loadData(); }, [sessionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionData = await sessionAPI.getById(sessionId);
      setSession(sessionData);
      if (sessionData.winnerParticipantId) {
        try {
          const team = await equipeAPI.getById(sessionData.winnerParticipantId);
          setWinnerTeam(team);
        } catch (_) {}
      }
    } catch (err) {
      setError("Session non trouvée");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="result-container">
        <Header />
        <main className="result-main">
          <div className="result-loading">
            <div className="spinner" />
            Chargement des résultats…
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="result-container">
        <Header />
        <main className="result-main">
          <div className="result-error">
            <IconAlertTriangle size={18} />
            {error}
          </div>
          <div className="result-actions">
            <button className="result-btn result-btn--primary" onClick={() => navigate("/")}>
              <IconHome size={16} /> Accueil
            </button>
          </div>
        </main>
      </div>
    );
  }

  const participants = session?.participants || [];
  const hasWinner    = session?.winnerParticipantId || winnerTeam;
  const areneId      = session?.pointId;

  // Extraire les scores depuis result.metrics
  const metrics = session?.result?.metrics || [];
  const getScore = (participantId) => {
    const m = metrics.find(m => m.participantId === participantId);
    return m ? m.value : null;
  };

  return (
    <div className="result-container">
      <Header />
      <main className="result-main">

        <h1 className="result-title">Résultats du match</h1>
        <p className="result-subtitle">Session terminée</p>

        {/* Gagnant */}
        {hasWinner ? (
          <motion.div className="result-winner"
            variants={cardVariants} initial="hidden" animate="visible" custom={0}>
            <div className="result-trophy">
              <IconTrophy size={34} />
            </div>
            <p className="result-winner-label">Vainqueur</p>
            <h2 className="result-winner-name">
              {winnerTeam?.nom || `Équipe ${session.winnerParticipantId}`}
            </h2>
          </motion.div>
        ) : (
          <motion.div className="result-draw"
            variants={cardVariants} initial="hidden" animate="visible" custom={0}>
            <p>Match nul — aucun vainqueur</p>
          </motion.div>
        )}

        {/* Scores */}
        {participants.length === 2 && (
          <motion.div className="result-card result-score-card"
            variants={cardVariants} initial="hidden" animate="visible" custom={1}>
            <p className="result-card-title">Score</p>
            <div className="result-scoreline">
              <div className="result-score-team">
                <span className="result-score-name">{participants[0]?.name}</span>
                <span className="result-score-value">{getScore(participants[0]?.id) ?? "—"}</span>
              </div>
              <span className="result-score-sep">:</span>
              <div className="result-score-team">
                <span className="result-score-value">{getScore(participants[1]?.id) ?? "—"}</span>
                <span className="result-score-name">{participants[1]?.name}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Participants */}
        {participants.length > 0 && (
          <motion.div className="result-card"
            variants={cardVariants} initial="hidden" animate="visible" custom={2}>
            <p className="result-card-title">Participants</p>
            {participants.map((p, i) => (
              <div key={p.id || i} className="result-participant">
                <div className="result-participant__left">
                  <div className={`result-participant__avatar ${p.id === session?.winnerParticipantId ? "result-participant__avatar--winner" : "result-participant__avatar--other"}`}>
                    {p.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <span className="result-participant__name">{p.name}</span>
                </div>
                {p.id === session?.winnerParticipantId && (
                  <span className="result-winner-badge">
                    <IconCheck size={13} /> Gagnant
                  </span>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Avantages DNA par équipe */}
        {areneId && participants.length > 0 && (
          <motion.div className="result-card"
            variants={cardVariants} initial="hidden" animate="visible" custom={3}>
            <p className="result-card-title">
              <IconZap size={16} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              Avantages DNA sur cette arène
            </p>
            <div className="result-dna-grid">
              {participants.map((p, i) => (
                <TeamDnaCard
                  key={p.id || i}
                  teamName={p.name}
                  teamId={p.id}
                  areneId={areneId}
                  isWinner={p.id === session?.winnerParticipantId}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Détails */}
        <motion.div className="result-card"
          variants={cardVariants} initial="hidden" animate="visible" custom={4}>
          <p className="result-card-title">Détails</p>

          {session?.sport && (
            <div className="result-stat">
              <span className="result-stat__label">Sport</span>
              <span className="result-stat__value">{session.sport.name || session.sport.code}</span>
            </div>
          )}

          {areneId && (
            <div className="result-stat">
              <span className="result-stat__label">Arène</span>
              <span className="result-stat__value" style={{ display:"flex", alignItems:"center", gap:6 }}>
                <IconMapPin size={14} /> {areneId}
              </span>
            </div>
          )}

          <div className="result-stat">
            <span className="result-stat__label">Statut</span>
            <span className={`result-state-badge ${session?.state === "TERMINATED" ? "result-state-badge--done" : "result-state-badge--other"}`}>
              {session?.state === "TERMINATED" ? "Terminée" : session?.state}
            </span>
          </div>

          {session?.createdAt && (
            <div className="result-stat">
              <span className="result-stat__label">Début</span>
              <span className="result-stat__value">{new Date(session.createdAt).toLocaleString("fr-FR")}</span>
            </div>
          )}

          {session?.endedAt && (
            <div className="result-stat">
              <span className="result-stat__label">Fin</span>
              <span className="result-stat__value">{new Date(session.endedAt).toLocaleString("fr-FR")}</span>
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div className="result-actions"
          variants={cardVariants} initial="hidden" animate="visible" custom={5}>
          <motion.button className="result-btn result-btn--primary"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/")}>
            <IconHome size={16} /> Accueil
          </motion.button>
          <motion.button className="result-btn result-btn--ghost"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/game/create")}>
            <IconSword size={16} /> Nouveau jeu
          </motion.button>
        </motion.div>

      </main>
    </div>
  );
}

export default GameResultPage;
