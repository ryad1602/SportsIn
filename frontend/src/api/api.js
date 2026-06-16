/**
 * Service API pour communiquer avec le backend Spring Boot
 * Tous les appels API transitent par ce service
 */

const API_BASE_URL = '/api'; // Utilise le proxy Vite

/**
 * Fonction utilitaire pour faire des requêtes
 */
const fetchAPI = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('insport_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Erreur ${response.status}: ${errorData}`);
    }

    // Vérifier si la réponse contient du JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return response;
  } catch (error) {
    console.error('Erreur API:', error);
    throw error;
  }
};

/**
 * ========== AUTH ==========
 */
export const authAPI = {
  login: async (identifier, password) => fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password })
  }),
  register: async (pseudo, email, password) => fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ pseudo, email, password })
  }),
  getProfile: async (id) => fetchAPI(`/auth/me/${id}`),
  updateProfile: async (id, data) => fetchAPI(`/auth/profile/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

/**
 * ========== EQUIPE ==========
 */
export const equipeAPI = {
  getAll: async () => fetchAPI('/equipes'),
  getById: async (id) => fetchAPI(`/equipes/${id}`),
  create: async (data) => fetchAPI('/equipes', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id, data) => fetchAPI(`/equipes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id) => fetchAPI(`/equipes/${id}`, { method: 'DELETE' }),
  join: async (equipeId, joueurId) => fetchAPI(`/equipes/${equipeId}/join`, { method: 'POST', body: JSON.stringify({ joueurId }) }),
  leave: async (joueurId) => fetchAPI('/equipes/leave', { method: 'POST', body: JSON.stringify({ joueurId }) }),
  /** [F7.1] Met à jour l'affinité de terrain de l'équipe. */
  updateAffinity: async (id, affinityType) => fetchAPI(`/equipes/${id}/affinity`, {
    method: 'PATCH',
    body: JSON.stringify({ affinityType }),
  }),
  /** [F10 - AJOUTÉ] Retourne le statut du Terrain Mastery. */
  getTerrainMastery: async (id) => fetchAPI(`/equipes/${id}/terrain-mastery`),
};

/**
 * ========== JOUEUR ==========
 */
export const joueurAPI = {
  getAll: async () => fetchAPI('/joueurs'),
  getById: async (id) => fetchAPI(`/joueurs/${id}`),
  getByEquipe: async (equipeId) => fetchAPI(`/joueurs/equipe/${equipeId}`),
  create: async (data) => fetchAPI('/joueurs', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id, data) => fetchAPI(`/joueurs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id) => fetchAPI(`/joueurs/${id}`, { method: 'DELETE' }),
};

/**
 * ========== ARENE ==========
 */
export const areneAPI = {
  getAll: async () => fetchAPI('/arenes'),
  getById: async (id) => fetchAPI(`/arenes/${id}`),
  getBySport: async (sport) => fetchAPI(`/arenes/sport/${sport}`),
  getByEquipe: async (equipeId) => fetchAPI(`/arenes/equipe/${equipeId}`),
  create: async (data) => fetchAPI('/arenes', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id, data) => fetchAPI(`/arenes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id) => fetchAPI(`/arenes/${id}`, { method: 'DELETE' }),

  /**
   * [F7 - AJOUTÉ] Découvre des stades près d'un point GPS via Google Places (type=stadium)
   * et les ajoute automatiquement en base s'ils ne sont pas encore connus.
   * @param {number} lat - latitude
   * @param {number} lng - longitude
   * @param {number} radiusMeters - rayon de recherche en mètres (défaut 5000)
   */
  discoverNear: async (lat, lng, radiusMeters = 5000, maxNewArenes = 10) =>
    fetchAPI('/arenes/discover', {
      method: 'POST',
      body: JSON.stringify({ lat, lng, radiusMeters, maxNewArenes })
    }),

  /**
   * [F7 - AJOUTÉ] Découvre des stades dans les 10 grandes villes françaises et les ajoute
   * en base. C'est l'action du bouton "🏟️ Explorer" dans MapPage.
   */
  discoverFrance: async (radiusMeters = 10000, maxNewArenes = 10) =>
    fetchAPI('/arenes/discover-france', {
      method: 'POST',
      body: JSON.stringify({ radiusMeters, maxNewArenes })
    }),

  /** Supprime toutes les arènes existantes. */
  deleteAll: async () => fetchAPI('/arenes', { method: 'DELETE' }),

  /**
   * Supprime toutes les arènes puis en redécouvre un lot limité.
   * scope: "FRANCE" ou "NEAR"
   */
  resetAndDiscover: async ({ scope = 'FRANCE', lat = 48.8566, lng = 2.3522, radiusMeters = 10000, maxNewArenes = 10 } = {}) =>
    fetchAPI('/arenes/reset-and-discover', {
      method: 'POST',
      body: JSON.stringify({ scope, lat, lng, radiusMeters, maxNewArenes })
    }),

  /** Simule reset+discover sans écrire en base. */
  resetAndDiscoverDryRun: async ({ scope = 'FRANCE', lat = 48.8566, lng = 2.3522, radiusMeters = 10000, maxNewArenes = 10 } = {}) =>
    fetchAPI('/arenes/reset-and-discover/dry-run', {
      method: 'POST',
      body: JSON.stringify({ scope, lat, lng, radiusMeters, maxNewArenes })
    }),
};

/**
 * ========== SPORT ==========
 */
export const sportAPI = {
  getAll: async () => fetchAPI('/sports'),
  getById: async (id) => fetchAPI(`/sports/${id}`),
  getByCode: async (code) => fetchAPI(`/sports/code/${code}`),
  create: async (data) => fetchAPI('/sports', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id, data) => fetchAPI(`/sports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id) => fetchAPI(`/sports/${id}`, { method: 'DELETE' }),
};

/**
 * ========== SESSION ==========
 */
export const sessionAPI = {
  getAll: async () => fetchAPI('/sessions'),
  getById: async (id) => fetchAPI(`/sessions/${id}`),
  getActive: async () => fetchAPI('/sessions/active'),
  create: async (data) => fetchAPI('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id, data) => fetchAPI(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id) => fetchAPI(`/sessions/${id}`, { method: 'DELETE' }),
  terminate: async (id) => fetchAPI(`/sessions/${id}/terminate`, { method: 'POST' }),
};

/**
 * ========== METRIC VALUE ==========
 */
export const metricValueAPI = {
  getAll: async () => fetchAPI('/metrics'),
  getBySession: async (sessionId) => fetchAPI(`/metrics/session/${sessionId}`),
  create: async (data) => fetchAPI('/metrics', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id, data) => fetchAPI(`/metrics/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id) => fetchAPI(`/metrics/${id}`, { method: 'DELETE' }),
};

/**
 * ========== ROUTE ==========
 */
export const routeAPI = {
  getAll: async () => fetchAPI('/routes'),
};

/**
 * ========== ZONE ==========
 */
export const zoneAPI = {
  getAll: async () => fetchAPI('/zones'),
  getById: async (id) => fetchAPI(`/zones/${id}`),
  getByAreneId: async (areneId) => fetchAPI(`/zones/arene/${areneId}`),
};

/**
 * ========== GAME ==========
 */
export const gameAPI = {
  getAll: async () => fetchAPI('/games'),
  getById: async (id) => fetchAPI(`/games/${id}`),
  getWaiting: async () => fetchAPI('/games/waiting'),
  getWaitingAtPoint: async (pointId) => fetchAPI(`/games/point/${pointId}/waiting`),
  create: async (data) => fetchAPI('/games', { method: 'POST', body: JSON.stringify(data) }),
  join: async (id, opponentTeamId) => fetchAPI(`/games/${id}/join`, { method: 'POST', body: JSON.stringify({ opponentTeamId }) }),
  start: async (id) => fetchAPI(`/games/${id}/start`, { method: 'POST' }),
  complete: async (id, winnerTeamId) => fetchAPI(`/games/${id}/complete`, { method: 'POST', body: JSON.stringify({ winnerTeamId }) }),
  delete: async (id) => fetchAPI(`/games/${id}`, { method: 'DELETE' }),
};

/**
 * ========== MISSION ==========
 */
export const missionAPI = {
  getByTeam: async (teamId, status) => {
    const query = status ? `?status=${status}` : '';
    return fetchAPI(`/teams/${teamId}/missions${query}`);
  },
  getById: async (missionId) => fetchAPI(`/missions/${missionId}`),
  generate: async (teamId) => fetchAPI(`/teams/${teamId}/missions/generate`, { method: 'POST' }),
  refresh: async (missionId) => fetchAPI(`/missions/${missionId}/refresh`, { method: 'POST' }),
};

/**
 * ========== PROGRESSION & PERKS ==========
 */
export const progressionAPI = {
  getProgression: async (teamId) => fetchAPI(`/teams/${teamId}/progression`),
  getAllPerks: async () => fetchAPI('/perks'),
  activatePerk: async (teamId, perkCode, targetId) => fetchAPI(`/teams/${teamId}/perks/activate`, {
    method: 'POST',
    body: JSON.stringify({ perkCode, targetId }),
  }),
  getActivePerks: async (teamId) => fetchAPI(`/teams/${teamId}/perks/active`),
};

/**
 * ========== MESSAGE (Chat équipe) ==========
 */
export const messageAPI = {
  getByEquipe: async (equipeId) => fetchAPI(`/messages/equipe/${equipeId}`),
  send: async (joueurId, equipeId, contenu) => fetchAPI('/messages', {
    method: 'POST',
    body: JSON.stringify({ joueurId, equipeId, contenu }),
  }),
  delete: async (id) => fetchAPI(`/messages/${id}`, { method: 'DELETE' }),
};

/**
 * ========== CONTEXT (Avantage du Terrain) ========== [F7 - AJOUTÉ]
 */
export const contextAPI = {
  /** Bonus contextuels pour une équipe sur une arène. teamId est optionnel. */
  getArenaContext: async (areneId, teamId) => {
    const query = teamId ? `?teamId=${teamId}` : '';
    return fetchAPI(`/context/arene/${areneId}${query}`);
  },
  /** Force l'identification du terrain via Google Places. */
  identifyArena: async (areneId) =>
    fetchAPI(`/context/arene/${areneId}/identify`, { method: 'POST' }),
  /** Retourne l'aura actuelle d'une équipe et son historique. */
  getTeamAura: async (teamId) => fetchAPI(`/context/team/${teamId}/aura`),
  /** Identifie uniquement les arènes sans dnaType (s'arrête si déjà identifié). */
  identifyAllArenas: async () =>
    fetchAPI('/context/arenes/identify-all', { method: 'POST' }),

  /** [F7.1] Force la re-identification de TOUTES les arènes via Google Places API,
   * même celles déjà identifiées (écrase les valeurs pré-chargées depuis data.sql).
   * À utiliser depuis le bouton "Rafraîchir terrains" dans MapPage.
   */
  forceIdentifyAllArenas: async () =>
    fetchAPI('/context/arenes/identify-all?force=true', { method: 'POST' }),

};

export default {
  authAPI,
  equipeAPI,
  joueurAPI,
  areneAPI,
  sportAPI,
  sessionAPI,
  metricValueAPI,
  routeAPI,
  zoneAPI,
  gameAPI,
  missionAPI,
  progressionAPI,
  messageAPI,
  contextAPI,  // [F7 - AJOUTÉ]
};
