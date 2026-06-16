import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { sessionAPI, gameAPI } from "../api/api.js";
import Header from "../components/Header.jsx";
import { cardVariants } from "../components/PageTransition.jsx";
import { IconAlertTriangle, IconCheck, IconX, IconSword } from "../components/Icons.jsx";
import "../styles/active-session.css";

function ActiveSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get("gameId");

  const [session, setSession]       = useState(null);
  const [game, setGame]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [terminating, setTerminating] = useState(false);
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [scoreA, setScoreA]         = useState(0);
  const [scoreB, setScoreB]         = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const timerRef = useRef(null);
  const pollRef  = useRef(null);

  useEffect(() => {
    loadData();
    pollRef.current = setInterval(checkGameState, 3000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current)  clearInterval(pollRef.current);
    };
  }, [gameId]);

  const checkGameState = async () => {
    if (!gameId) return;
    try {
      const gameData = await gameAPI.getById(gameId);
      if (gameData.state === "COMPLETED" && gameData.sessionId) {
        if (pollRef.current) clearInterval(pollRef.current);
        navigate(`/game/result/${gameData.sessionId}`);
      }
    } catch (_) {}
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (gameId) {
        const gameData = await gameAPI.getById(gameId);
        setGame(gameData);
        if (gameData.state === "COMPLETED" && gameData.sessionId) {
          navigate(`/game/result/${gameData.sessionId}`);
          return;
        }
        if (gameData.sessionId) {
          const sessionData = await sessionAPI.getById(gameData.sessionId);
          setSession(sessionData);
          startTimer(sessionData.createdAt);
        }
      } else {
        const activeSessions = await sessionAPI.getActive();
        if (activeSessions.length > 0) {
          setSession(activeSessions[0]);
          startTimer(activeSessions[0].createdAt);
        }
      }
    } catch (err) {
      setError("Erreur lors du chargement de la session");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (createdAt) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const startTime = createdAt ? new Date(createdAt).getTime() : Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const handleTerminateWithScores = async () => {
    if (!session) return;
    setTerminating(true);
    setError(null);
    const tid = toast.loading("Enregistrement du score…");
    try {
      const teamAId = game?.creatorTeam?.id?.toString();
      const teamBId = game?.opponentTeam?.id?.toString();

      const updatedSession = {
        ...session,
        result: {
          metrics: [
            ...(teamAId ? [{ participantId: teamAId, metricType: "GOALS", value: Number(scoreA), context: "match" }] : []),
            ...(teamBId ? [{ participantId: teamBId, metricType: "GOALS", value: Number(scoreB), context: "match" }] : []),
          ],
        },
      };
      await sessionAPI.update(session.id, updatedSession);
      await sessionAPI.terminate(session.id);

      if (gameId && game) {
        let winnerId = null;
        if (Number(scoreA) > Number(scoreB)) winnerId = teamAId;
        else if (Number(scoreB) > Number(scoreA)) winnerId = teamBId;
        await gameAPI.complete(gameId, winnerId);
      }

      if (pollRef.current) clearInterval(pollRef.current);
      toast.success("Match terminé !", { id: tid });
      navigate(`/game/result/${session.id}`);
    } catch (err) {
      toast.error("Erreur lors de la terminaison", { id: tid });
      setError("Erreur lors de la terminaison de la session");
      console.error(err);
    } finally {
      setTerminating(false);
    }
  };

  const getScorePreview = () => {
    const a = Number(scoreA), b = Number(scoreB);
    const nameA = game?.creatorTeam?.nom || "Équipe A";
    const nameB = game?.opponentTeam?.nom || "Équipe B";
    if (a > b) return `Victoire de ${nameA}`;
    if (b > a) return `Victoire de ${nameB}`;
    return "Match nul";
  };

  if (loading) {
    return (
      <div className="session-container">
        <Header />
        <main className="session-main">
          <div className="session-loading">
            <div className="spinner" />
            Chargement de la session…
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="session-container">
        <Header />
        <main className="session-main">
          <div className="session-card" style={{ textAlign: "center" }}>
            <div className="session-empty">
              <h2>Aucune session active</h2>
              <p>Créez un jeu pour démarrer une session.</p>
              <button className="session-btn session-btn--end" style={{ width: "auto", padding: "13px 28px" }} onClick={() => navigate("/game/create")}>
                <IconSword size={18} /> Créer un jeu
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="session-container">
      <Header />
      <main className="session-main">

        {/* Status */}
        <motion.div className="session-status"
          variants={cardVariants} initial="hidden" animate="visible" custom={0}>
          <span className="session-status__dot" />
          En cours
        </motion.div>

        {/* Chronomètre */}
        <motion.div className="session-timer"
          variants={cardVariants} initial="hidden" animate="visible" custom={1}>
          {formatTime(elapsedTime)}
        </motion.div>

        {/* Équipes */}
        {game && (
          <motion.div className="session-card"
            variants={cardVariants} initial="hidden" animate="visible" custom={2}>
            <div className="session-teams">
              <div className="session-team">
                <div className="session-team__avatar session-team__avatar--a">
                  {game.creatorTeam?.nom?.charAt(0).toUpperCase() || "A"}
                </div>
                <p className="session-team__label">Équipe 1</p>
                <p className="session-team__name">{game.creatorTeam?.nom || "Équipe A"}</p>
              </div>
              <span className="session-vs">VS</span>
              <div className="session-team">
                <div className="session-team__avatar session-team__avatar--b">
                  {game.opponentTeam?.nom?.charAt(0).toUpperCase() || "B"}
                </div>
                <p className="session-team__label">Équipe 2</p>
                <p className="session-team__name">{game.opponentTeam?.nom || "Équipe B"}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Formulaire score */}
        {showScoreForm && (
          <motion.div className="session-card session-card--score"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}>
            <p className="score-form-title">Score final</p>

            <div className="score-form-teams">
              <div className="score-team">
                <p className="score-team__name">{game?.creatorTeam?.nom || "Équipe A"}</p>
                <div className="score-controls">
                  <button className="score-btn" onClick={() => setScoreA(Math.max(0, Number(scoreA) - 1))}>−</button>
                  <input
                    className="score-input"
                    type="number" min="0"
                    value={scoreA}
                    onChange={(e) => setScoreA(Math.max(0, Number(e.target.value)))}
                  />
                  <button className="score-btn" onClick={() => setScoreA(Number(scoreA) + 1)}>+</button>
                </div>
              </div>

              <span className="score-separator">:</span>

              <div className="score-team">
                <p className="score-team__name">{game?.opponentTeam?.nom || "Équipe B"}</p>
                <div className="score-controls">
                  <button className="score-btn" onClick={() => setScoreB(Math.max(0, Number(scoreB) - 1))}>−</button>
                  <input
                    className="score-input"
                    type="number" min="0"
                    value={scoreB}
                    onChange={(e) => setScoreB(Math.max(0, Number(e.target.value)))}
                  />
                  <button className="score-btn" onClick={() => setScoreB(Number(scoreB) + 1)}>+</button>
                </div>
              </div>
            </div>

            <div className="score-preview">
              <strong>{getScorePreview()}</strong>
            </div>

            <div className="score-actions">
              <button className="session-btn session-btn--confirm" onClick={handleTerminateWithScores} disabled={terminating}>
                <IconCheck size={18} />
                {terminating ? "Enregistrement…" : "Confirmer le score"}
              </button>
              <button className="session-btn session-btn--cancel" onClick={() => setShowScoreForm(false)} disabled={terminating}>
                <IconX size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="session-error">
            <IconAlertTriangle size={16} /> {error}
          </div>
        )}

        {/* Bouton terminer */}
        {!showScoreForm && (
          <motion.button className="session-btn session-btn--end"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowScoreForm(true)}>
            Terminer la session
          </motion.button>
        )}

      </main>
    </div>
  );
}

export default ActiveSessionPage;
