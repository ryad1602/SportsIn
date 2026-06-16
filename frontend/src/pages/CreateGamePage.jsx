import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { areneAPI, sportAPI, gameAPI, equipeAPI } from "../api/api.js";
import Header from "../components/Header.jsx";
import "../styles/create-game.css";

function CreateGamePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const [arenas, setArenas] = useState([]);
  const [sports, setSports] = useState([]);
  const [playerTeam, setPlayerTeam] = useState(null);

  const [selectedArena, setSelectedArena] = useState("");
  const [selectedSport, setSelectedSport] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [arenasData, sportsData] = await Promise.all([
        areneAPI.getAll(),
        sportAPI.getAll().catch(() => []),
      ]);

      setArenas(arenasData);
      setSports(sportsData);

      const savedTeamId = sessionStorage.getItem("insport_team_id");
      if (savedTeamId) {
        try {
          const team = await equipeAPI.getById(savedTeamId);
          setPlayerTeam(team);
        } catch (e) {
          console.error("Équipe non trouvée");
        }
      }
    } catch (err) {
      setError("Erreur lors du chargement des données");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async (e) => {
    e.preventDefault();

    if (!playerTeam) {
      setError("Vous devez rejoindre une équipe avant de créer un jeu");
      return;
    }

    if (!selectedArena) {
      setError("Veuillez sélectionner une arène");
      return;
    }

    if (!selectedSport) {
      setError("Veuillez sélectionner un sport pour le matchmaking");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      // 1. Chercher d'abord un game existant compatible (auto-match)
      const waitingGames = await gameAPI.getWaitingAtPoint(selectedArena);
      const compatibleGame = waitingGames.find(
        (g) =>
          g.sport?.code === selectedSport &&
          g.creatorTeam?.id !== playerTeam.id
      );

      if (compatibleGame) {
        // 2. Rejoindre le game existant automatiquement
        try {
          await gameAPI.join(compatibleGame.id, playerTeam.id);
          navigate(`/game/lobby/${compatibleGame.id}`);
          return;
        } catch (joinErr) {
          // L'auto-join a raté (ex : jeu déjà pris entre-temps) → créer un nouveau
          console.warn("Auto-join raté, création d'un nouveau jeu:", joinErr);
        }
      }

      // 3. Sinon créer un nouveau game et attendre
      const gameData = {
        pointId: selectedArena,
        sport: { code: selectedSport },
        creatorTeam: playerTeam,
      };

      const game = await gameAPI.create(gameData);
      navigate(`/game/lobby/${game.id}`);
    } catch (err) {
      setError("Erreur lors de la création du jeu");
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const selectedArenaData = arenas.find((a) => a.id === selectedArena);

  if (loading) {
    return (
      <div className="create-game-page">
        <Header />
        <main className="create-game-content">
          <div className="create-game-loading">
            <div className="spinner" />
            <p>Chargement des arènes...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="create-game-page">
      <Header />

      <main className="create-game-content">
        <div className="create-game-header">
          <button className="btn btn-ghost" onClick={() => navigate("/")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Retour
          </button>
        </div>

        <div className="create-game-hero animate-slideUp">
          <div className="create-game-hero__icon">⚔️</div>
          <h1>Créer un jeu</h1>
          <p>Lancez un défi et trouvez une équipe adverse</p>
        </div>

        {error && (
          <div className="create-game-error animate-slideDown">
            <span>⚠️</span>
            <p>{error}</p>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {!playerTeam ? (
          <div className="create-game-card create-game-warning animate-fadeIn">
            <div className="create-game-warning__icon">⚠️</div>
            <div className="create-game-warning__content">
              <h3>Équipe requise</h3>
              <p>Vous devez rejoindre une équipe pour créer un jeu.</p>
            </div>
            <button className="btn btn-primary btn-lg" onClick={() => navigate("/team")}>
              Rejoindre une équipe
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateGame} className="create-game-form animate-fadeIn">
            {/* Équipe actuelle */}
            <div className="create-game-card create-game-team-card">
              <span className="create-game-label">Votre équipe</span>
              <div className="create-game-team">
                <div
                  className="create-game-team__avatar"
                  style={{
                    background: `linear-gradient(135deg, ${playerTeam.couleur || "#3b82f6"} 0%, ${playerTeam.couleur || "#3b82f6"}dd 100%)`,
                  }}
                >
                  {playerTeam.nom?.charAt(0).toUpperCase()}
                </div>
                <div className="create-game-team__info">
                  <span className="create-game-team__name">{playerTeam.nom}</span>
                  <span className="badge badge-success">Prêt à jouer</span>
                </div>
              </div>
            </div>

            {/* Sélection arène */}
            <div className="create-game-card">
              <span className="create-game-label">Choisir une arène</span>

              <div className="create-game-arenas">
                {arenas.map((arena) => (
                  <div
                    key={arena.id}
                    className={`create-game-arena ${selectedArena === arena.id ? "selected" : ""}`}
                    onClick={() => setSelectedArena(arena.id)}
                  >
                    <div className="create-game-arena__icon">📍</div>
                    <div className="create-game-arena__info">
                      <span className="create-game-arena__name">
                        {arena.nom || `Arène ${arena.id}`}
                      </span>
                      <span className="create-game-arena__sports">
                        {arena.sportsDisponibles?.join(", ") || "Multi-sports"}
                      </span>
                    </div>
                    <div className="create-game-arena__check">
                      {selectedArena === arena.id && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {arenas.length === 0 && (
                <div className="create-game-empty">
                  <p>Aucune arène disponible</p>
                </div>
              )}
            </div>

            {/* Sport (obligatoire pour le matchmaking) */}
            <div className="create-game-card">
              <span className="create-game-label">Sport</span>
              {sports.length > 0 ? (
                <select
                  className="select"
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  required
                >
                  <option value="">-- Choisir un sport --</option>
                  {sports.map((sport) => (
                    <option key={sport.id || sport.code} value={sport.code}>
                      {sport.nom || sport.code}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="create-game-warning-inline">
                  <span>⚠️</span>
                  <span>Chargement des sports en cours...</span>
                </div>
              )}
              <p className="create-game-hint">Le sport est requis pour trouver un adversaire compatible</p>
            </div>

            {/* Preview */}
            {selectedArenaData && (
              <div className="create-game-preview animate-scaleIn">
                <div className="create-game-preview__header">
                  <span>Récapitulatif</span>
                </div>
                <div className="create-game-preview__content">
                  <div className="create-game-preview__row">
                    <span className="text-muted">Arène</span>
                    <span>{selectedArenaData.nom || `Arène ${selectedArenaData.id}`}</span>
                  </div>
                  <div className="create-game-preview__row">
                    <span className="text-muted">Sport</span>
                    <span>{selectedSport || "Tous"}</span>
                  </div>
                  <div className="create-game-preview__row">
                    <span className="text-muted">Mode</span>
                    <span className="badge badge-primary">Matchmaking</span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-success btn-lg w-full create-game-submit"
              disabled={creating || !selectedArena}
            >
              {creating ? (
                <>
                  <div className="spinner" style={{ width: 20, height: 20 }} />
                  Création en cours...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Lancer la recherche d'adversaire
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

export default CreateGamePage;
