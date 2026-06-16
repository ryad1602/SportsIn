import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { gameAPI } from "../api/api.js";
import Header from "../components/Header.jsx";
import {
  IconArrowRight, IconPlay, IconX, IconUsers, IconTrophy,
  IconMapPin, IconClock, IconAlertTriangle,
} from "../components/Icons.jsx";
import "../styles/game-lobby.css";

const TIMEOUT_SECONDS = 120;

function GameLobbyPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [game, setGame]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [starting, setStarting] = useState(false);
  const [joining, setJoining]   = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [waitTime, setWaitTime] = useState(0);

  const loadGame = useCallback(async () => {
    try {
      const gameData = await gameAPI.getById(gameId);
      setGame(gameData);

      if (gameData.state === "IN_PROGRESS" && gameData.sessionId) {
        navigate(`/session/active?gameId=${gameId}`);
      }
      if (gameData.state === "COMPLETED" && gameData.sessionId) {
        navigate(`/game/result/${gameData.sessionId}`);
      }
    } catch (err) {
      setError("Jeu non trouvé");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [gameId, navigate]);

  useEffect(() => {
    loadGame();
    const interval = setInterval(loadGame, 3000);
    return () => clearInterval(interval);
  }, [loadGame]);

  useEffect(() => {
    if (game?.state !== "WAITING") return;
    const timer = setInterval(() => setWaitTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [game?.state]);

  const handleCancelSearch = async () => {
    try {
      setCancelling(true);
      await gameAPI.delete(gameId);
      navigate("/");
    } catch (err) {
      setError("Erreur lors de l'annulation");
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  const handleJoinGame = async (teamId) => {
    if (!teamId || isNaN(teamId)) {
      setError("Tu dois rejoindre une équipe avant de pouvoir te battre");
      return;
    }
    try {
      setJoining(true);
      setError(null);
      await gameAPI.join(gameId, teamId);
      await loadGame();
    } catch (err) {
      // Affiche le message exact renvoyé par le backend
      const msg = err?.message || "";
      if (msg.includes("même équipe") || msg.includes("affronter elle-même")) {
        setError("Vous êtes dans la même équipe que le créateur — impossible de s'affronter");
      } else if (msg.includes("non trouvée") || msg.includes("introuvable")) {
        setError("Équipe ou jeu introuvable — vérifie que ton équipe existe encore");
      } else if (msg.includes("plus en attente")) {
        setError("Ce jeu a déjà trouvé un adversaire");
      } else {
        setError(msg || "Erreur lors de la jonction au jeu");
      }
      console.error(err);
    } finally {
      setJoining(false);
    }
  };

  const handleStartGame = async () => {
    try {
      setStarting(true);
      setError(null);
      const updatedGame = await gameAPI.start(gameId);
      if (updatedGame.sessionId) {
        navigate(`/session/active?gameId=${gameId}`);
      }
    } catch (err) {
      const msg = err?.message || "";
      setError(msg.includes("MATCHED") ? "Attends que l'adversaire rejoigne d'abord" : (msg || "Erreur lors du démarrage du jeu"));
      console.error(err);
    } finally {
      setStarting(false);
    }
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  /* ── Loading ─────────────────────────────── */
  if (loading) {
    return (
      <div className="lobby-container">
        <Header />
        <main className="lobby-main">
          <div className="lobby-loading">
            <div className="spinner" />
            Chargement du lobby...
          </div>
        </main>
      </div>
    );
  }

  /* ── Fatal error ─────────────────────────── */
  if (error && !game) {
    return (
      <div className="lobby-container">
        <Header />
        <main className="lobby-main">
          <button className="lobby-back" onClick={() => navigate("/")}>
            <IconArrowRight size={14} style={{ transform: "rotate(180deg)" }} />
            Retour
          </button>
          <div className="lobby-error">
            <IconAlertTriangle size={18} />
            {error}
          </div>
        </main>
      </div>
    );
  }

  const isWaiting   = game?.state === "WAITING";
  const isMatched   = game?.state === "MATCHED";
  const playerTeamId = sessionStorage.getItem("insport_team_id");
  const isCreator   = game?.creatorTeam?.id?.toString() === playerTeamId;

  return (
    <div className="lobby-container">
      <Header />
      <main className="lobby-main">

        {/* Back */}
        <button className="lobby-back" onClick={() => navigate("/")}>
          <IconArrowRight size={14} style={{ transform: "rotate(180deg)" }} />
          Retour
        </button>

        {/* Page header */}
        <div className="lobby-header">
          <h1 className="lobby-title">Lobby</h1>
          <p className="lobby-subtitle">
            {isWaiting ? "En attente d'un adversaire…" : "Adversaire trouvé — prêt à jouer !"}
          </p>
        </div>

        {/* Error (non-fatal) */}
        {error && (
          <div className="lobby-error">
            <IconAlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Main card */}
        <div className="lobby-card">
          <div className="lobby-status-row">
            <span className="lobby-status-label">Statut du match</span>
            <span className={`lobby-badge ${isMatched ? "lobby-badge--ready" : "lobby-badge--waiting"}`}>
              {isWaiting ? "En attente" : isMatched ? "Prêt" : game?.state}
            </span>
          </div>

          {/* Creator team */}
          <div className="lobby-team">
            <div className="lobby-team__avatar lobby-team__avatar--creator">
              {game?.creatorTeam?.nom?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="lobby-team__name">{game?.creatorTeam?.nom ?? "Équipe créatrice"}</p>
              <p className="lobby-team__role">Créateur</p>
            </div>
          </div>

          {/* VS separator */}
          <div className="lobby-vs">
            <div className="lobby-vs__line" />
            <span className="lobby-vs__text">VS</span>
            <div className="lobby-vs__line" />
          </div>

          {/* Opponent or waiting */}
          {game?.opponentTeam ? (
            <div className="lobby-team">
              <div className="lobby-team__avatar lobby-team__avatar--opponent">
                {game.opponentTeam.nom?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="lobby-team__name">{game.opponentTeam.nom}</p>
                <p className="lobby-team__role">Adversaire</p>
              </div>
            </div>
          ) : (
            <div className="lobby-waiting-slot">
              <div className="lobby-pulse">
                <IconUsers size={22} />
              </div>
              <p className="lobby-waiting-text">Recherche d'un adversaire…</p>
              <span className="lobby-timer">
                <IconClock size={13} style={{ verticalAlign: "middle" }} /> {formatTime(waitTime)}
              </span>
              {waitTime >= TIMEOUT_SECONDS && (
                <p className="lobby-timeout-warn">La recherche prend plus de temps que prévu…</p>
              )}
            </div>
          )}
        </div>

        {/* Game info */}
        {(game?.sport?.code || game?.pointId) && (
          <div className="lobby-info-card">
            {game?.sport?.code && (
              <div className="lobby-info-item">
                <span className="lobby-info-label">Sport</span>
                <span className="lobby-info-value">
                  <IconTrophy size={16} />
                  {game.sport.code}
                </span>
              </div>
            )}
            {game?.pointId && (
              <div className="lobby-info-item">
                <span className="lobby-info-label">Arène</span>
                <span className="lobby-info-value">
                  <IconMapPin size={16} />
                  {game.pointId}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="lobby-actions">
          {isWaiting && isCreator && (
            <button
              className="lobby-btn lobby-btn--cancel"
              onClick={handleCancelSearch}
              disabled={cancelling}
            >
              <IconX size={18} />
              {cancelling ? "Annulation…" : "Annuler la recherche"}
            </button>
          )}

          {isMatched && isCreator && (
            <button
              className="lobby-btn lobby-btn--start"
              onClick={handleStartGame}
              disabled={starting}
            >
              <IconPlay size={18} />
              {starting ? "Démarrage…" : "Lancer le match"}
            </button>
          )}

          {isMatched && !isCreator && (
            <div className="lobby-waiting-hint">
              En attente que le créateur lance le match…
            </div>
          )}

          {isWaiting && !isCreator && !playerTeamId && (
            <div className="lobby-waiting-hint" style={{ color: "#f87171" }}>
              Tu dois rejoindre une équipe avant de pouvoir combattre —{" "}
              <a href="/team" style={{ color: "#f87171", textDecoration: "underline" }}>
                Rejoindre une équipe
              </a>
            </div>
          )}

          {isWaiting && !isCreator && playerTeamId && (
            <button
              className="lobby-btn lobby-btn--join"
              onClick={() => handleJoinGame(parseInt(playerTeamId))}
              disabled={joining}
            >
              <IconUsers size={18} />
              {joining ? "En cours…" : "Rejoindre en tant qu'adversaire"}
            </button>
          )}
        </div>

      </main>
    </div>
  );
}

export default GameLobbyPage;
