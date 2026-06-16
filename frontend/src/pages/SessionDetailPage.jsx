import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { sessionAPI, metricValueAPI } from "../api/api.js";
import Header from "../components/Header.jsx";
import { cardVariants } from "../components/PageTransition.jsx";
import {
  IconArrowRight, IconTrophy, IconAlertTriangle, IconCheck,
} from "../components/Icons.jsx";
import "../styles/session-detail.css";

function SessionDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession]   = useState(null);
  const [metrics, setMetrics]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => { loadData(); }, [sessionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sessionData, metricsData] = await Promise.all([
        sessionAPI.getById(sessionId),
        metricValueAPI.getBySession(sessionId).catch(() => []),
      ]);
      setSession(sessionData);
      setMetrics(Array.isArray(metricsData) ? metricsData : []);
    } catch (err) {
      setError("Session non trouvée");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const formatDuration = (start, end) => {
    if (!start) return "N/A";
    const diff = Math.floor(((end ? new Date(end) : Date.now()) - new Date(start)) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="sdetail-container">
        <Header />
        <main className="sdetail-main">
          <div className="sdetail-loading">
            <div className="spinner" />
            Chargement de la session…
          </div>
        </main>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="sdetail-container">
        <Header />
        <main className="sdetail-main">
          <button className="sdetail-back" onClick={() => navigate("/history")}>
            <IconArrowRight size={14} style={{ transform: "rotate(180deg)" }} />
            Retour à l'historique
          </button>
          <div className="sdetail-error">
            <IconAlertTriangle size={16} />
            {error || "Session non trouvée"}
          </div>
        </main>
      </div>
    );
  }

  const participants = session.participants || [];
  const hasWinner    = !!session.winnerParticipantId;

  return (
    <div className="sdetail-container">
      <Header />
      <main className="sdetail-main">

        <button className="sdetail-back" onClick={() => navigate("/history")}>
          <IconArrowRight size={14} style={{ transform: "rotate(180deg)" }} />
          Retour à l'historique
        </button>

        <div className="sdetail-header">
          <h1 className="sdetail-title">Détails de la session</h1>
          <p className="sdetail-id">{session.id}</p>
        </div>

        {/* Vainqueur */}
        {hasWinner && (
          <motion.div className="sdetail-card sdetail-card--winner"
            variants={cardVariants} initial="hidden" animate="visible" custom={0}>
            <div className="sdetail-winner-banner">
              <div className="sdetail-winner-icon">
                <IconTrophy size={24} />
              </div>
              <div>
                <p className="sdetail-winner-label">Vainqueur</p>
                <p className="sdetail-winner-name">
                  Équipe {session.winnerParticipantId}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Informations */}
        <motion.div className="sdetail-card"
          variants={cardVariants} initial="hidden" animate="visible" custom={1}>
          <p className="sdetail-card-title">Informations</p>

          <div className="sdetail-row">
            <span className="sdetail-row__label">Statut</span>
            <span className={`sdetail-state ${session.state === "TERMINATED" ? "sdetail-state--done" : "sdetail-state--active"}`}>
              {session.state === "TERMINATED" ? "Terminée" : session.state}
            </span>
          </div>

          {session.sport && (
            <div className="sdetail-row">
              <span className="sdetail-row__label">Sport</span>
              <span className="sdetail-row__value">{session.sport.nom || session.sport.code}</span>
            </div>
          )}

          {session.pointId && (
            <div className="sdetail-row">
              <span className="sdetail-row__label">Arène</span>
              <span className="sdetail-row__value">{session.pointId}</span>
            </div>
          )}

          <div className="sdetail-row">
            <span className="sdetail-row__label">Début</span>
            <span className="sdetail-row__value">{formatDate(session.createdAt)}</span>
          </div>

          {session.endedAt && (
            <div className="sdetail-row">
              <span className="sdetail-row__label">Fin</span>
              <span className="sdetail-row__value">{formatDate(session.endedAt)}</span>
            </div>
          )}

          <div className="sdetail-row">
            <span className="sdetail-row__label">Durée</span>
            <span className="sdetail-row__value sdetail-row__value--accent">
              {formatDuration(session.createdAt, session.endedAt)}
            </span>
          </div>
        </motion.div>

        {/* Participants */}
        {participants.length > 0 && (
          <motion.div className="sdetail-card"
            variants={cardVariants} initial="hidden" animate="visible" custom={2}>
            <p className="sdetail-card-title">Participants</p>
            {participants.map((p, i) => (
              <div key={p.id || i} className="sdetail-participant">
                <div className="sdetail-participant__left">
                  <div className={`sdetail-participant__avatar ${p.id === session.winnerParticipantId ? "sdetail-participant__avatar--winner" : "sdetail-participant__avatar--other"}`}>
                    {p.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="sdetail-participant__name">{p.name}</p>
                    <p className="sdetail-participant__type">{p.type || "Participant"}</p>
                  </div>
                </div>
                {p.id === session.winnerParticipantId && (
                  <span className="sdetail-winner-tag">
                    <IconCheck size={13} /> Gagnant
                  </span>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Métriques */}
        {metrics.length > 0 && (
          <motion.div className="sdetail-card"
            variants={cardVariants} initial="hidden" animate="visible" custom={3}>
            <p className="sdetail-card-title">Métriques</p>
            {metrics.map((m, i) => (
              <div key={m.id || i} className="sdetail-metric">
                <div>
                  <p className="sdetail-metric__type">{m.metricType || "METRIC"}</p>
                  <p className="sdetail-metric__value">{m.value}</p>
                </div>
                {m.participantId && (
                  <span className="sdetail-metric__participant">
                    Participant {m.participantId}
                  </span>
                )}
              </div>
            ))}
          </motion.div>
        )}

      </main>
    </div>
  );
}

export default SessionDetailPage;
