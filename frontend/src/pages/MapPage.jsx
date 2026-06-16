import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Polygon } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { areneAPI, routeAPI, zoneAPI, gameAPI, equipeAPI, missionAPI, contextAPI } from "../api/api.js"; // [F7 - MODIFIÉ] ajout contextAPI
import { useAuth } from "../context/AuthContext.jsx";
import Header from "../components/Header.jsx";
import ContextBonusDisplay from "../components/ContextBonusDisplay.jsx"; // [F7 - AJOUTÉ]
import "../styles/map.css";

// Fix des icônes Leaflet pour Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Icône du joueur (pin bleu standard)
const playerIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const SPORT_META = {
  FOOTBALL:     { emoji: "⚽", label: "Football" },
  BASKET:       { emoji: "🏀", label: "Basketball" },
  TENNIS:       { emoji: "🎾", label: "Tennis" },
  MUSCULATION:  { emoji: "🏋️", label: "Musculation" },
  NATATION:     { emoji: "🏊", label: "Natation" },
  ATHLETISME:   { emoji: "🏃", label: "Athlétisme" },
  CYCLISME:     { emoji: "🚴", label: "Cyclisme" },
  GOLF:         { emoji: "⛳", label: "Golf" },
  RUGBY:        { emoji: "🏉", label: "Rugby" },
  VOLLEYBALL:   { emoji: "🏐", label: "Volleyball" },
  HANDBALL:     { emoji: "🤾", label: "Handball" },
  SPORT_COMBAT: { emoji: "🥋", label: "Sport de combat" },
  BOWLING:      { emoji: "🎳", label: "Bowling" },
  PATINAGE:     { emoji: "⛸️", label: "Patinage" },
  SKI:          { emoji: "⛷️", label: "Ski" },
};

const formatSport = (code) => {
  const m = SPORT_META[code];
  return m ? `${m.emoji} ${m.label}` : code;
};

const parseEvidenceItems = (rawEvidence) => {
  if (!rawEvidence || typeof rawEvidence !== "string") return [];

  const normalized = rawEvidence.includes(" — ")
    ? rawEvidence.split(" — ").slice(1).join(" — ")
    : rawEvidence;

  let chunks = [];
  if (normalized.includes("|")) {
    chunks = normalized.split("|");
  } else {
    // Nouveau format attendu: "Lieu A (type, 120m), Lieu B (type, 340m)"
    // On extrait chaque bloc "...(...)" pour éviter de casser les noms contenant des virgules.
    const matches = normalized.match(/[^|]+?\([^)]*\)/g);
    chunks = matches && matches.length > 0 ? matches : [normalized];
  }

  return chunks
    .map((c) => c.trim().replace(/^,\s*/, ""))
    .filter(Boolean)
    .map((item) => {
      // Nouveau format: "Nom du lieu (type lisible, 120m)"
      const newFmt = item.match(/^(.*)\(([^,()]+)(?:,\s*([0-9]+m))?\)\s*$/);
      if (newFmt) {
        return {
          name: newFmt[1].trim(),
          placeType: newFmt[2].trim(),
          distance: newFmt[3]?.trim() || null,
        };
      }

      // Ancien format: "Nom [type_google] → TERRAIN"
      const oldFmt = item.match(/^(.*?)\s*\[([^\]]+)\]\s*→\s*([A-Z_]+)/);
      if (oldFmt) {
        return {
          name: oldFmt[1].trim(),
          placeType: oldFmt[2].replace(/^NAME:/, "nom").trim(),
          distance: null,
        };
      }

      return { name: item, placeType: null, distance: null };
    });
};

const isNoiseEvidenceType = (placeType) => {
  if (!placeType) return false;
  const t = String(placeType).toLowerCase();
  return t === "health";
};

const confidencePercent = (value) => {
  if (value == null || Number.isNaN(Number(value))) return 0;
  const n = Number(value);
  if (n <= 1) return Math.round(Math.max(0, n) * 100);
  if (n <= 100) return Math.round(n);
  return 100;
};

const DNA_COLORS = {
  ABYSSE: { bg: "#0c4a6e", color: "#38bdf8", glow: "#0ea5e9", label: "Abysse", desc: "Zone aquatique" },
  OLYMPE: { bg: "#78350f", color: "#fbbf24", glow: "#f59e0b", label: "Olympe", desc: "Lieu iconique"  },
  EDEN:   { bg: "#14532d", color: "#4ade80", glow: "#22c55e", label: "Éden",   desc: "Sanctuaire naturel" },
  NEXUS:  { bg: "#7f1d1d", color: "#f87171", glow: "#ef4444", label: "Nexus",  desc: "Carrefour urbain" },
  NEUTRE: { bg: "#1f2937", color: "#94a3b8", glow: "#6b7280", label: "Neutre", desc: "" },
};

// SVG icon paths for each terrain type (viewBox 0 0 24 24)
const DNA_SVG = {
  ABYSSE: `<path d="M2 11c2.5-3.5 5-3.5 7.5 0s5 3.5 7.5 0s5-3.5 7.5 0" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/>
           <path d="M2 16c2.5-3.5 5-3.5 7.5 0s5 3.5 7.5 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  OLYMPE: `<circle cx="12" cy="12" r="3.5" fill="currentColor"/>
           <line x1="12" y1="2" x2="12" y2="5.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
           <line x1="12" y1="18.5" x2="12" y2="22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
           <line x1="2" y1="12" x2="5.5" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
           <line x1="18.5" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
           <line x1="5.6" y1="5.6" x2="7.8" y2="7.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
           <line x1="16.2" y1="16.2" x2="18.4" y2="18.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
           <line x1="18.4" y1="5.6" x2="16.2" y2="7.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
           <line x1="7.8" y1="16.2" x2="5.6" y2="18.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  EDEN:   `<path d="M12 22V12M12 12C11 7 7 5 4 7c2 2 5.5 4 8 5M12 12C13 7 17 5 20 7c-2 2-5.5 4-8 5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  NEXUS:  `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="none"/>`,
  NEUTRE: `<circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/>
           <circle cx="12" cy="12" r="1.5" fill="currentColor"/>`,
};

function getDnaIcon(dnaType, hasMission, controllingTeamId, isAffinityMatch = false) {
  const dna   = DNA_COLORS[dnaType] || DNA_COLORS.NEUTRE;
  const svgPath = DNA_SVG[dnaType] || DNA_SVG.NEUTRE;
  const ringColor = controllingTeamId
    ? (TEAM_COLORS[controllingTeamId] || TEAM_COLORS.default)
    : dna.color;

  // [S4] Affinity match → icône légèrement plus grande + glow renforcé
  const baseS = isAffinityMatch ? 44 : 38;
  const S     = hasMission ? Math.max(baseS, 46) : baseS;
  const inner = isAffinityMatch ? 30 : (hasMission ? 30 : 26);
  const half  = S / 2;
  const glowAlpha = isAffinityMatch ? '88' : '44';
  const glowSize  = isAffinityMatch ? '18px' : '14px';

  const missionRing = hasMission
    ? `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"
          style="position:absolute;top:0;left:0;"
          class="dna-mission-ring">
        <circle cx="${half}" cy="${half}" r="${half - 3}" fill="none"
          stroke="#f59e0b" stroke-width="2.5"
          stroke-dasharray="6 4" stroke-linecap="round"/>
      </svg>`
    : '';

  // [S4] Anneau or pulsant = indicateur d'affinité + highlight "meilleure arène"
  const affinityRing = isAffinityMatch
    ? `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"
          style="position:absolute;top:0;left:0;"
          class="dna-affinity-ring">
        <circle cx="${half}" cy="${half}" r="${half - 3}" fill="none"
          stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
      </svg>`
    : '';

  // [S4] Badge étoile dans le coin supérieur droit
  const affinityBadge = isAffinityMatch
    ? `<div style="position:absolute;top:-2px;right:-2px;width:14px;height:14px;
                   background:#f59e0b;border-radius:50%;
                   display:flex;align-items:center;justify-content:center;
                   border:1.5px solid rgba(0,0,0,0.35);font-size:8px;line-height:1;">★</div>`
    : '';

  return L.divIcon({
    html: `
      <div style="position:relative;width:${S}px;height:${S}px;display:flex;align-items:center;justify-content:center;">
        ${missionRing}
        ${affinityRing}
        <div style="
          width:${inner}px;height:${inner}px;
          border-radius:50%;
          background:${dna.bg};
          border:2.5px solid ${ringColor};
          box-shadow:0 0 0 1px rgba(0,0,0,0.3),0 3px 10px rgba(0,0,0,0.5),0 0 ${glowSize} ${dna.glow}${glowAlpha};
          display:flex;align-items:center;justify-content:center;
          color:${dna.color};
        ">
          <svg width="14" height="14" viewBox="0 0 24 24">${svgPath}</svg>
        </div>
        ${affinityBadge}
      </div>`,
    className:   "",
    iconSize:    [S, S],
    iconAnchor:  [half, half],
    popupAnchor: [0, -(half + 6)],
  });
}

const CENTER_FRANCE = [46.2276, 2.2137];

function MapController({ playerLocation, onRecenter }) {
  const map = useMap();

  const handleRecenter = () => {
    if (playerLocation) {
      map.setView(playerLocation, 15, { animate: true, duration: 0.5 });
    }
  };

  if (onRecenter) {
    onRecenter.current = handleRecenter;
  }

  return null;
}

const TEAM_COLORS = {
  1: "#3b82f6",
  2: "#ef4444",
  3: "#22c55e",
  4: "#f59e0b",
  5: "#8b5cf6",
  default: "#6b7280",
};

const getTeamColor = (teamId) => TEAM_COLORS[teamId] || TEAM_COLORS.default;

const MISSION_TYPE_LABELS = {
  RECAPTURE_RECENT_LOSS: "Reconquête",
  BREAK_ROUTE: "Rupture de route",
  DIVERSITY_SPORT: "Diversité sport",
};
const formatMissionType = (type) => MISSION_TYPE_LABELS[type] || type;

const formatTimeRemaining = (endsAt) => {
  if (!endsAt) return "";
  const diff = new Date(endsAt) - new Date();
  if (diff <= 0) return "Expiré";
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}j ${hours % 24}h`;
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${mins}min`;
};

function MapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const teamId = sessionStorage.getItem("insport_team_id"); // [F7 - AJOUTÉ] extrait ici pour le passer à ContextBonusDisplay
  const [arenes, setArenes] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [zones, setZones] = useState([]);
  const [playerLocation, setPlayerLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(CENTER_FRANCE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // GPS optionnel : null = pas demandé, false = refusé/échec, [lat,lng] = disponible
  const [geoStatus, setGeoStatus] = useState(null);
  const recenterRef = useRef(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showArenas, setShowArenas] = useState(true);
  const [launchingGame, setLaunchingGame] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [missions, setMissions] = useState([]);
  const [missionsByArena, setMissionsByArena] = useState({});
  // [F7 - AJOUTÉ] états pour la re-identification des terrains via Google Places
  const [refreshingTerrains, setRefreshingTerrains] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);
  // [F7 - AJOUTÉ] états pour la découverte de nouveaux stades via Google Places
  const [discoveringArenas, setDiscoveringArenas] = useState(false);
  const [discoverResult, setDiscoverResult] = useState(null);
  // [S4] Filtre DNA (null = tous les types) + affinité de l'équipe courante
  const [dnaFilter, setDnaFilter] = useState(null);
  const [teamAffinity, setTeamAffinity] = useState(null);
  // Filtre sport (null = tous les sports)
  const [sportFilter, setSportFilter] = useState(null);

  const handleLaunchGame = async (arene) => {
    const teamId = sessionStorage.getItem("insport_team_id");

    if (!teamId) {
      navigate("/team");
      return;
    }

    try {
      setLaunchingGame(arene.id);
      const team = await equipeAPI.getById(teamId);
      const sportCode = arene.sportsDisponibles?.[0] ?? null;

      // Cherche d'abord un game en attente sur cette arène (auto-matchmaking)
      const waitingGames = await gameAPI.getWaitingAtPoint(arene.id);
      const compatibleGame = waitingGames.find(
        (g) =>
          (!sportCode || !g.sport?.code || g.sport.code === sportCode) &&
          g.creatorTeam?.id !== team.id
      );

      if (compatibleGame) {
        await gameAPI.join(compatibleGame.id, team.id);
        navigate(`/game/lobby/${compatibleGame.id}`);
        return;
      }

      // Aucun adversaire trouvé : créer un nouveau jeu
      const gameData = {
        pointId: arene.id,
        sport: sportCode ? { code: sportCode } : null,
        creatorTeam: team,
      };

      const game = await gameAPI.create(gameData);
      navigate(`/game/lobby/${game.id}`);
    } catch (err) {
      console.error("Erreur lors du lancement du jeu:", err);
    } finally {
      setLaunchingGame(null);
    }
  };

  /**
   * Demande la position GPS — appelé uniquement si l'utilisateur clique sur "Ma position".
   * La carte fonctionne parfaitement sans GPS : elle est centrée sur la France par défaut.
   * On ne demande JAMAIS la localisation au chargement pour éviter le blocage.
   */
  const simulatePosition = useCallback(() => {
    // Position simulée : centre de Paris
    const simLat = 48.8566, simLng = 2.3522;
    setPlayerLocation([simLat, simLng]);
    setMapCenter([simLat, simLng]);
    setGeoStatus("simulated");
  }, []);

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      simulatePosition();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setPlayerLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        setGeoStatus([latitude, longitude]);
      },
      () => {
        // GPS refusé ou indisponible → simulation Paris
        simulatePosition();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [simulatePosition]);

  // NE PAS appeler requestGeolocation au montage : la carte s'ouvre sans demande GPS

  /**
   * Réinitialise complètement les arènes puis relance une découverte limitée.
   * Appelle POST /api/arenes/reset-and-discover avec maxNewArenes=10.
   */
  const handleRefreshTerrains = useCallback(async () => {
    if (refreshingTerrains) return; // évite les double-clics
    setRefreshingTerrains(true);
    setRefreshResult(null);
    try {
      const result = await areneAPI.resetAndDiscover({
        scope: 'FRANCE',
        radiusMeters: 10000,
        maxNewArenes: 10,
      });
      const added = result?.discovery?.added ?? 0;
      const deleted = result?.deleted ?? 0;
      setRefreshResult(`✅ Reset effectué (${deleted} supprimées), ${added} nouvelle(s) arène(s) identifiée(s)`);

      // Recharger les arènes pour refléter le nouvel état
      const arenesData = await areneAPI.getAll().catch(() => []);
      setArenes(Array.isArray(arenesData) ? arenesData : []);
      setDnaFilter(null);
      setSportFilter(null);
    } catch (err) {
      setRefreshResult(`❌ Erreur: ${err.message}`);
    } finally {
      setRefreshingTerrains(false);
      // Cache le message de résultat après 4 secondes
      setTimeout(() => setRefreshResult(null), 4000);
    }
  }, [refreshingTerrains]);

  /**
   * Ajoute des arènes supplémentaires sans reset.
   * Chaque clic tente d'ajouter jusqu'à 10 nouvelles arènes.
   */
  const handleDiscoverArenas = useCallback(async () => {
    if (discoveringArenas) return; // évite les double-clics
    setDiscoveringArenas(true);
    setDiscoverResult(null);
    try {
      const result = await areneAPI.discoverFrance(10000, 10);
      const added = result?.added ?? 0;
      if (added === 0) {
        setDiscoverResult(`ℹ️ Aucune nouvelle arène trouvée sur ce clic (limite 10).`);
      } else {
        setDiscoverResult(`✅ ${added} nouvelle(s) arène(s) ajoutée(s) (jusqu'à 10 par clic)`);
      }

      // Recharge les arènes pour afficher les nouveaux marqueurs sur la carte
      const arenesData = await areneAPI.getAll().catch(() => []);
      setArenes(Array.isArray(arenesData) ? arenesData : []);
      setDnaFilter(null);
      setSportFilter(null);
    } catch (err) {
      setDiscoverResult(`❌ Erreur: ${err.message}`);
    } finally {
      setDiscoveringArenas(false);
      // Cache le message après 6 secondes
      setTimeout(() => setDiscoverResult(null), 6000);
    }
  }, [discoveringArenas]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const teamId = sessionStorage.getItem("insport_team_id");

        const [arenesData, routesData, zonesData, missionsData] = await Promise.all([
          areneAPI.getAll().catch(() => []),
          routeAPI.getAll().catch(() => []),
          zoneAPI.getAll().catch(() => []),
          teamId ? missionAPI.getByTeam(teamId, "ACTIVE").catch(() => []) : Promise.resolve([]),
        ]);

        setArenes(Array.isArray(arenesData) ? arenesData : []);
        setRoutes(Array.isArray(routesData) ? routesData : []);
        setZones(Array.isArray(zonesData) ? zonesData : []);

        const mList = Array.isArray(missionsData) ? missionsData : [];
        setMissions(mList);

        // Construire un index arenaId -> missions[]
        // On fetche le détail de chaque mission pour avoir le payload avec arenaId
        const arenaMap = {};
        const details = await Promise.all(
          mList.map((m) => missionAPI.getById(m.id).catch(() => null))
        );
        for (const detail of details) {
          if (!detail || !detail.payload) continue;
          const arenaId = detail.payload.arenaId || detail.payload.pointId;
          if (arenaId != null) {
            const key = String(arenaId);
            if (!arenaMap[key]) arenaMap[key] = [];
            arenaMap[key].push(detail);
          }
        }
        setMissionsByArena(arenaMap);

        // [S4] Récupère l'affinité terrain de l'équipe pour le highlight des arènes
        if (teamId) {
          equipeAPI.getById(teamId)
            .then(team => setTeamAffinity(team?.affinityType || null))
            .catch(() => {});
        }

        setError(null);
      } catch (err) {
        setError(`Erreur: ${err.message}`);
        setArenes([]);
        setRoutes([]);
        setZones([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filtre les arènes par DNA et/ou sport
  const filteredArenes = arenes.filter(a => {
    if (dnaFilter && a.dnaType !== dnaFilter) return false;
    if (sportFilter && a.sportPrincipal !== sportFilter
        && !a.sportsDisponibles?.includes(sportFilter)) return false;
    return true;
  });

  // Sports présents sur la carte (pour le filtre)
  const sportsOnMap = [...new Set(
    arenes.flatMap(a => [
      a.sportPrincipal,
      ...(a.sportsDisponibles || []),
    ].filter(Boolean))
  )].sort();

  return (
    <div className="map-page">
      <Header />

      <div className="map-container">
        <MapContainer
          center={mapCenter}
          zoom={playerLocation ? 15 : 6}
          className="map-leaflet"
          maxBounds={[[41.0, -5.5], [51.5, 10.0]]}
          maxBoundsViscosity={0.7}
          minZoom={5}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController playerLocation={playerLocation} onRecenter={recenterRef} />

          {playerLocation && (
            <Marker position={playerLocation} icon={playerIcon}>
              <Popup className="map-popup">
                <div className="map-popup-content">
                  <h4>{geoStatus === "simulated" ? "Position simulée" : "Ma position"}</h4>
                  <p>{geoStatus === "simulated" ? "Paris (48.86, 2.35)" : (user?.pseudo || "Joueur")}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {showZones && zones.map((zone) => {
            const arenes = zone.arenes || [];
            if (arenes.length < 3) return null;
            const positions = arenes.map((a) => [a.latitude, a.longitude]);
            const color = getTeamColor(zone.controllingTeamId);

            return (
              <Polygon
                key={zone.id}
                positions={positions}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 2 }}
              >
                <Popup className="map-popup">
                  <div className="map-popup-content">
                    <h4>{zone.nom || `Zone ${zone.id}`}</h4>
                    <p className="map-popup-meta">
                      {zone.controllingTeamId ? `Contrôlée par Équipe ${zone.controllingTeamId}` : "Zone libre"}
                    </p>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {showRoutes && routes.map((route) => {
            const arenes = route.arenes || [];
            if (arenes.length < 2) return null;
            const positions = arenes.map((a) => [a.latitude, a.longitude]);

            return (
              <Polyline
                key={route.id}
                positions={positions}
                pathOptions={{ color: "#f59e0b", weight: 4, opacity: 0.8, dashArray: "8, 8" }}
              >
                <Popup className="map-popup">
                  <div className="map-popup-content">
                    <h4>{route.nom || `Route ${route.id}`}</h4>
                    {route.bonusActif && <span className="map-popup-badge">Bonus actif</span>}
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {showArenas && filteredArenes.map((arene) => {
            const arenaMissions = missionsByArena[String(arene.id)] || [];
            const hasMission = arenaMissions.length > 0;
            // [S4] Arène dont le DNA correspond à l'affinité de l'équipe = meilleure arène
            const isAffinityMatch = !!(teamAffinity && arene.dnaType === teamAffinity);

            return (
              <Marker
                key={arene.id}
                position={[arene.latitude, arene.longitude]}
                icon={getDnaIcon(arene.dnaType, hasMission, arene.controllingTeamId, isAffinityMatch)}
              >
                <Popup
                  className={`map-popup map-popup--arena${hasMission ? " map-popup--mission" : ""}`}
                  maxWidth={320}
                  autoPan={true}
                  autoPanPadding={[20, 20]}
                  keepInView={true}
                >
                  <div
                    className="map-popup-content"
                    onWheelCapture={(e) => e.stopPropagation()}
                    onTouchMoveCapture={(e) => e.stopPropagation()}
                  >
                    {/* Section 1 : Infos arène */}
                    <h4>{arene.nom || `Arène ${arene.id}`}</h4>

                    {/* DNA type + meta */}
                    {(() => {
                      const dna = DNA_COLORS[arene.dnaType];
                      const svg = DNA_SVG[arene.dnaType];
                      return dna && arene.dnaType !== "NEUTRE" ? (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "7px 11px",
                          borderRadius: "10px",
                          background: `${dna.bg}`,
                          border: `1px solid ${dna.color}33`,
                          marginBottom: "10px",
                        }}>
                          <div style={{
                            width: "28px", height: "28px",
                            borderRadius: "50%",
                            background: `${dna.color}22`,
                            border: `1.5px solid ${dna.color}55`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: dna.color, flexShrink: 0,
                          }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: svg }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: dna.color, fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                              {dna.label}
                            </div>
                            <div style={{ color: "#94a3b8", fontSize: "0.68rem" }}>{dna.desc}</div>
                            {arene.dnaConfidence > 0 && (
                              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "4px" }}>
                                <div style={{ width: "48px", height: "2px", borderRadius: "1px", background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
                                  <div style={{ width: `${confidencePercent(arene.dnaConfidence)}%`, height: "100%", background: dna.color, opacity: 0.65 }} />
                                </div>
                                <span style={{ color: "#64748b", fontSize: "0.62rem" }}>
                                  {confidencePercent(arene.dnaConfidence)}%
                                  {arene.dnaPlacesCount > 0 ? ` · ${arene.dnaPlacesCount} lieux` : ""}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Evidence : pourquoi ce type de terrain (données stockées en DB, sans appel API) */}
                    {arene.dnaEvidence && (
                      <div className="map-popup-evidence">
                        <div className="map-popup-evidence-label">Identifié depuis</div>
                        {parseEvidenceItems(arene.dnaEvidence)
                          .filter((item) => !isNoiseEvidenceType(item.placeType))
                          .slice(0, 3)
                          .map((item, i) => (
                          <div key={i} className="map-popup-evidence-item">
                            <span className="map-popup-evidence-place">{item.name}</span>
                            {item.placeType && (
                              <span className="map-popup-evidence-type"> · {item.placeType}</span>
                            )}
                            {item.distance && (
                              <span className="map-popup-evidence-distance"> ({item.distance})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* [S4] Badge affinité — highlight "meilleure arène" pour l'équipe */}
                    {isAffinityMatch && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '3px 9px', borderRadius: '20px', marginBottom: '8px',
                        background: 'rgba(245,158,11,0.12)',
                        border: '1px solid rgba(245,158,11,0.35)',
                        color: '#f59e0b', fontSize: '0.72rem', fontWeight: 700,
                      }}>
                        ★ Terrain de prédilection
                      </div>
                    )}

                    {/* Badge sport principal */}
                    {arene.sportPrincipal && (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: "6px",
                        padding: "4px 11px", borderRadius: "20px", marginBottom: "8px",
                        background: "rgba(99,102,241,0.12)",
                        border: "1px solid rgba(99,102,241,0.35)",
                        color: "#a5b4fc", fontSize: "0.76rem", fontWeight: 600,
                      }}>
                        {formatSport(arene.sportPrincipal)}
                      </div>
                    )}

                    {/* Sports disponibles */}
                    {arene.sportsDisponibles?.length > 0 && (
                      <div className="map-popup-sports">
                        {arene.sportsDisponibles.map((sport) => (
                          <span key={sport} className="map-popup-sport">
                            {formatSport(sport)}
                          </span>
                        ))}
                      </div>
                    )}
                    {arene.controllingTeamId && (
                      <p className="map-popup-meta">Contrôlée par Équipe {arene.controllingTeamId}</p>
                    )}

                    {/* Bonus contextuels terrain + aura */}
                    <ContextBonusDisplay
                      areneId={arene.id}
                      teamId={teamId ? Number(teamId) : null}
                    />

                    <button
                      className="map-popup-action"
                      onClick={() => handleLaunchGame(arene)}
                      disabled={launchingGame === arene.id}
                    >
                      {launchingGame === arene.id ? "Création..." : "Lancer un jeu"}
                    </button>

                    {/* Section 2 : Missions actives sur cette arène */}
                    {hasMission && (
                      <div className="map-popup-missions">
                        <div className="map-popup-missions-header">Missions actives</div>
                        {arenaMissions.map((mission) => (
                          <div key={mission.id} className="map-popup-mission-card">
                            <div className="map-popup-mission-type">{formatMissionType(mission.type)}</div>
                            <div className="map-popup-mission-title">{mission.title}</div>
                            {mission.description && (
                              <div className="map-popup-mission-desc">{mission.description}</div>
                            )}
                            <div className="map-popup-mission-progress">
                              <div className="map-popup-mission-bar">
                                <div
                                  className="map-popup-mission-bar-fill"
                                  style={{ width: `${Math.min(100, (mission.progressCurrent / mission.progressTarget) * 100)}%` }}
                                />
                              </div>
                              <span>{mission.progressCurrent}/{mission.progressTarget}</span>
                            </div>
                            <div className="map-popup-mission-footer">
                              <span className="map-popup-mission-reward">+{mission.rewardTeamPoints} pts</span>
                              <span className="map-popup-mission-timer">
                                {formatTimeRemaining(mission.endsAt)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Barre de statut : chargement / erreur / nb arènes */}
        <div className="map-status">
          {loading && <span className="map-status-item map-status-item--loading">Chargement...</span>}
          {error && <span className="map-status-item map-status-item--error">{error}</span>}
          {/* Affiche le résultat de la re-identification des terrains */}
          {refreshResult && (
            <span className="map-status-item map-status-item--success">{refreshResult}</span>
          )}
          {/* [F7 - AJOUTÉ] Message résultat de la découverte de stades */}
          {discoverResult && (
            <span className="map-status-item map-status-item--success">{discoverResult}</span>
          )}
          {!loading && !error && (
            <span className="map-status-item map-status-item--success">{arenes.length} arènes</span>
          )}
          {/* Badge affinité de l'équipe — toujours visible sur la carte */}
          {teamAffinity && (() => {
            const info = DNA_COLORS[teamAffinity];
            const count = arenes.filter(a => a.dnaType === teamAffinity).length;
            return info ? (
              <span
                className="map-status-item map-affinity-badge"
                style={{ '--ac': info.color, '--ab': info.bg }}
                title={`Votre affinité : ${info.label} — ${count} arène(s) avantageuse(s)`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24"
                  dangerouslySetInnerHTML={{ __html: DNA_SVG[teamAffinity] }} />
                {info.label} · {count}
              </span>
            ) : null;
          })()}
        </div>

        {/* Boutons de contrôle (haut gauche) */}
        <div className="map-controls">
          {/* Bouton "Ma position" : always visible, déclenche le GPS seulement au clic.
              Si la position est déjà connue, recentre la carte. Sinon demande le GPS. */}
          <button
            className={`map-control-btn${playerLocation ? " map-control-btn--primary" : ""}`}
            onClick={() => playerLocation ? recenterRef.current?.() : requestGeolocation()}
            title={playerLocation
              ? (geoStatus === "simulated" ? "Position simulée (Paris) — cliquer pour recentrer" : "Recentrer sur ma position")
              : "Détecter ma position (GPS ou simulation)"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {playerLocation
              ? (geoStatus === "simulated" ? "Simulée (Paris)" : "Ma position")
              : "Position"}
          </button>
          <button
            className="map-control-btn"
            onClick={handleRefreshTerrains}
            disabled={refreshingTerrains}
            title="Force la re-identification de tous les types de terrain via Google Places API"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12a9 9 0 11-6.3-8.6"/><polyline points="21 3 21 9 15 9"/>
            </svg>
            {refreshingTerrains ? "Chargement..." : "Terrains"}
          </button>
          <button
            className="map-control-btn"
            onClick={handleDiscoverArenas}
            disabled={discoveringArenas}
            title="Recherche de nouveaux stades via Google Places dans 10 villes françaises"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            {discoveringArenas ? "Recherche..." : "Explorer"}
          </button>
          <button className="map-control-btn" onClick={() => navigate("/")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Accueil
          </button>
        </div>

        {/* Layer controls */}
        <div className="map-layers">
          <div className="map-layers-header">
            <span>Couches</span>
          </div>
          <label className="map-layer-item">
            <input type="checkbox" checked={showArenas} onChange={(e) => setShowArenas(e.target.checked)} />
            <span className="map-layer-icon map-layer-icon--arena"></span>
            <span>Arènes ({arenes.length})</span>
          </label>
          <label className="map-layer-item">
            <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} />
            <span className="map-layer-icon map-layer-icon--zone"></span>
            <span>Zones ({zones.length})</span>
          </label>
          <label className="map-layer-item">
            <input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} />
            <span className="map-layer-icon map-layer-icon--route"></span>
            <span>Routes ({routes.length})</span>
          </label>

          {/* [S4] Filtre DNA */}
          <div className="map-layers-header" style={{ marginTop: '14px' }}>Filtre DNA</div>
          <div className="map-dna-filter">
            <button
              className={`map-dna-chip${dnaFilter === null ? ' active' : ''}`}
              style={{ '--dc': '#e2e8f0', '--db': '#374151' }}
              onClick={() => setDnaFilter(null)}
            >
              Tous
            </button>
            {Object.entries(DNA_COLORS)
              .filter(([type]) => arenes.some(a => a.dnaType === type))
              .map(([type, info]) => (
                <button
                  key={type}
                  className={`map-dna-chip${dnaFilter === type ? ' active' : ''}`}
                  style={{ '--dc': info.color, '--db': info.bg }}
                  onClick={() => setDnaFilter(dnaFilter === type ? null : type)}
                  title={info.desc}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24"
                    dangerouslySetInnerHTML={{ __html: DNA_SVG[type] }} />
                  {info.label}
                </button>
              ))}
          </div>

          {/* Filtre Sport */}
          {sportsOnMap.length > 0 && (
            <>
              <div className="map-layers-header" style={{ marginTop: '14px' }}>Filtre Sport</div>
              <div className="map-dna-filter">
                <button
                  className={`map-dna-chip${sportFilter === null ? ' active' : ''}`}
                  style={{ '--dc': '#e2e8f0', '--db': '#374151' }}
                  onClick={() => setSportFilter(null)}
                >
                  Tous
                </button>
                {sportsOnMap.map(sport => {
                  const m = SPORT_META[sport];
                  return (
                    <button
                      key={sport}
                      className={`map-dna-chip${sportFilter === sport ? ' active' : ''}`}
                      style={{ '--dc': '#a5b4fc', '--db': '#1e1b4b' }}
                      onClick={() => setSportFilter(sportFilter === sport ? null : sport)}
                      title={m?.label || sport}
                    >
                      {m ? `${m.emoji} ${m.label}` : sport}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Legend toggle */}
        <button className="map-legend-toggle" onClick={() => setShowLegend(!showLegend)}>
          {showLegend
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          }
        </button>

        {/* Legend */}
        {showLegend && (
          <div className="map-legend">
            <div className="map-legend-header">Légende</div>
            <div className="map-legend-content">
              {/* DNA Terrain Types */}
              <div className="map-legend-section">Terrains</div>
              {Object.entries(DNA_COLORS).map(([type, info]) => (
                <div key={type} className="map-legend-item">
                  <span className="map-legend-dna" style={{ background: info.bg, border: `2px solid ${info.color}`, color: info.color }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: DNA_SVG[type] || DNA_SVG.NEUTRE }} />
                  </span>
                  <span>{info.label}</span>
                </div>
              ))}
              <div className="map-legend-divider"></div>
              {/* Teams */}
              <div className="map-legend-section">Équipes (bordure)</div>
              {Object.entries(TEAM_COLORS)
                .filter(([key]) => key !== "default")
                .map(([teamId, color]) => (
                  <div key={teamId} className="map-legend-item">
                    <span className="map-legend-color" style={{ background: color }}></span>
                    <span>Équipe {teamId}</span>
                  </div>
                ))}
              <div className="map-legend-item">
                <span className="map-legend-color" style={{ background: TEAM_COLORS.default }}></span>
                <span>Non contrôlée</span>
              </div>
              <div className="map-legend-divider"></div>
              <div className="map-legend-item">
                <span className="map-legend-route"></span>
                <span>Route</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapPage;
