import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { missionAPI } from "../api/api.js";
import Header from "../components/Header.jsx";
import {
  IconTarget, IconCheck, IconClock, IconAlertTriangle,
  IconTrophy, IconStar, IconSearch, IconList,
} from "../components/Icons.jsx";
import { SkeletonList } from "../components/Skeleton.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import "../styles/missions.css";

const MISSION_TYPE_LABELS = {
  RECAPTURE_RECENT_LOSS: "Reconquête",
  BREAK_ROUTE: "Rupture de route",
  DIVERSITY_SPORT: "Diversité sport",
};

const PRIORITY_LABELS = { HIGH: "Haute", MEDIUM: "Moyenne", LOW: "Basse" };

const formatMissionType = (type) => MISSION_TYPE_LABELS[type] || type;
const formatPriority = (p) => PRIORITY_LABELS[p] || p;

const formatTimeRemaining = (endsAt) => {
  if (!endsAt) return "";
  const diff = new Date(endsAt) - new Date();
  if (diff <= 0) return "Expiré";
  const totalMinutes = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}j ${hours % 24}h restant`;
  if (hours > 0) return `${hours}h ${totalMinutes % 60}min restant`;
  return `${totalMinutes}min restant`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const FILTERS = [
  { key: null,      label: "Toutes"   },
  { key: "ACTIVE",  label: "Actives"  },
  { key: "SUCCESS", label: "Réussies" },
  { key: "EXPIRED", label: "Expirées" },
  { key: "FAILED",  label: "Échouées" },
];

export default function MissionsPage() {
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [details, setDetails] = useState({});
  const [filter, setFilter] = useState("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const teamId = sessionStorage.getItem("insport_team_id");

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    loadMissions();
  }, [filter]);

  const loadMissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await missionAPI.getByTeam(teamId, filter);
      const list = Array.isArray(data) ? data : [];
      setMissions(list);

      // Fetch details for each mission (to get description and payload)
      const detailResults = await Promise.all(
        list.map((m) => missionAPI.getById(m.id).catch(() => null))
      );
      const detailMap = {};
      for (const d of detailResults) {
        if (d) detailMap[d.id] = d;
      }
      setDetails(detailMap);
    } catch (err) {
      setError("Erreur lors du chargement des missions");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Counts by status for the stats bar
  const countByStatus = (status) =>
    missions.filter((m) => m.status === status).length;

  // If no filter, show all—otherwise filter applies server-side already
  const activeMissions = filter
    ? missions
    : missions;

  if (!teamId) {
    return (
      <div className="missions-container">
        <Header />
        <main className="missions-content">
          <div className="missions-hero">
            <h1 className="missions-title"><IconTarget size={28} /> Missions</h1>
          </div>
          <div className="missions-no-team">
            <span className="missions-no-team__icon"><IconAlertTriangle size={32} /></span>
            <p className="missions-no-team__text">
              Rejoins une équipe pour accéder aux missions dynamiques !
            </p>
            <button
              className="missions-no-team__link"
              onClick={() => navigate("/team")}
            >
              Rejoindre une équipe
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="missions-container">
      <Header />

      <main className="missions-content">
        {/* Title */}
        <div className="missions-hero">
          <h1 className="missions-title"><IconTarget size={24} /> Missions</h1>
          <p className="missions-subtitle">
            Complète des missions pour gagner des points et de l'XP
          </p>
        </div>

        {/* Filter tabs */}
        <div className="missions-filters">
          {FILTERS.map((f) => (
            <button
              key={f.key ?? "all"}
              className={`missions-filter-btn${filter === f.key ? " missions-filter-btn--active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Error */}
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* Loading */}
        {loading && <SkeletonList count={3} lines={2} />}

        {/* Mission list */}
        {!loading && !error && (
          <>
            {activeMissions.length === 0 ? (
              <div className="missions-empty">
                <div className="missions-empty__icon">
                  {filter === "ACTIVE" ? <IconSearch size={32} /> : <IconList size={32} />}
                </div>
                <p className="missions-empty__text">
                  {filter === "ACTIVE"
                    ? "Aucune mission active pour le moment"
                    : `Aucune mission ${(FILTERS.find((f) => f.key === filter)?.label || "").replace(/[^\w\sÀ-ÿ]/g, "").trim().toLowerCase()}`}
                </p>
                <p className="missions-empty__hint">
                  Les missions sont générées automatiquement chaque jour à 6h
                </p>
              </div>
            ) : (
              <div className="missions-list">
                {activeMissions.map((mission) => {
                  const detail = details[mission.id];
                  const progressPct = Math.min(
                    100,
                    (mission.progressCurrent / mission.progressTarget) * 100
                  );
                  const isUrgent =
                    mission.status === "ACTIVE" &&
                    mission.endsAt &&
                    new Date(mission.endsAt) - new Date() < 86_400_000; // < 24h

                  return (
                    <div
                      key={mission.id}
                      className={`mission-card mission-card--${mission.status}`}
                    >
                      {/* Header */}
                      <div className="mission-card__header">
                        <div className="mission-card__left">
                          <span className={`mission-card__type mission-card__type--${mission.type}`}>
                            {formatMissionType(mission.type)}
                          </span>
                          <span className={`mission-card__priority mission-card__priority--${mission.priority}`}>
                            {formatPriority(mission.priority)}
                          </span>
                          <h3 className="mission-card__title">{mission.title}</h3>
                        </div>
                        <span className={`mission-card__status mission-card__status--${mission.status}`}>
                          {mission.status === "ACTIVE" && "En cours"}
                          {mission.status === "SUCCESS" && <><IconCheck size={13} /> Réussie</>}
                          {mission.status === "EXPIRED" && "Expirée"}
                          {mission.status === "FAILED" && "Échouée"}
                        </span>
                      </div>

                      {/* Description */}
                      {detail?.description && (
                        <p className="mission-card__description">{detail.description}</p>
                      )}

                      {/* Progress bar */}
                      <div className="mission-card__progress">
                        <div className="mission-card__progress-bar">
                          <div
                            className={`mission-card__progress-fill mission-card__progress-fill--${mission.status === "SUCCESS" ? "SUCCESS" : "ACTIVE"}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="mission-card__progress-text">
                          {mission.progressCurrent}/{mission.progressTarget}
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="mission-card__footer">
                        <div className="mission-card__rewards">
                          <span className="mission-card__reward mission-card__reward--points">
                            <IconTrophy size={13} /> +{mission.rewardTeamPoints} pts
                          </span>
                          {detail?.rewardTeamXp > 0 && (
                            <span className="mission-card__reward mission-card__reward--xp">
                              <IconStar size={13} /> +{detail.rewardTeamXp} XP
                            </span>
                          )}
                        </div>
                        {mission.status === "ACTIVE" && mission.endsAt && (
                          <span
                            className={`mission-card__timer${isUrgent ? " mission-card__timer--urgent" : ""}`}
                          >
                            <IconClock size={13} /> {formatTimeRemaining(mission.endsAt)}
                          </span>
                        )}
                        {mission.status === "SUCCESS" && detail?.completedAt && (
                          <span className="mission-card__completed">
                            Terminée le {formatDate(detail.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
