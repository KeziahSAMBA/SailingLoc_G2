import axios from 'axios';

const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();
const localDevelopmentApiBaseUrl = 'http://localhost:4000/api';
const deploymentBuild = ['production', 'staging'].includes(
  String(import.meta.env.VITE_BUILD_ENV || (import.meta.env.PROD ? 'production' : 'development'))
    .trim()
    .toLowerCase()
);

// The Docker/Railway build validator catches this earlier. Keep a runtime
// guard as a second line of defence against a stale/cached static bundle or a
// deployment that forgot to rebuild after changing its service variables.
if (deploymentBuild && !configuredApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL est obligatoire dans le bundle de déploiement.');
}

if (deploymentBuild && configuredApiBaseUrl) {
  try {
    const parsedApiBaseUrl = new URL(configuredApiBaseUrl);
    if (
      parsedApiBaseUrl.protocol !== 'https:' ||
      ['localhost', '127.0.0.1', '::1', '[::1]'].includes(parsedApiBaseUrl.hostname.toLowerCase())
    ) {
      throw new Error('unsafe API origin');
    }
  } catch {
    throw new Error('VITE_API_BASE_URL doit être une URL HTTPS publique en déploiement.');
  }
}

// Timeout global : sans lui, une perte de connexion laisse l'UI bloquée sur un
// spinner infini. Les uploads (multipart) surchargent avec UPLOAD_TIMEOUT_MS.
export const UPLOAD_TIMEOUT_MS = 60000;

const api = axios.create({
  baseURL: configuredApiBaseUrl || localDevelopmentApiBaseUrl,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken = null;
let refreshPromise = null;
let onAuthFailure = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setOnAuthFailure(fn) {
  onAuthFailure = fn;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

const REFRESH_URL = '/users/refresh';
// Endpoints d'authentification : un 401 y est une réponse métier légitime
// (mauvais identifiants), pas une session expirée → on ne tente pas de refresh.
const AUTH_URLS = ['/users/login', '/admin/login'];

// Suivi des requêtes en vol (comptage + horodatage de la plus ancienne
// pending, et de la dernière panne réseau confirmée), pour la détection de
// chargement bloqué de usePageLoadGate.js — interceptors dédiés et
// indépendants du refresh de session ci-dessous, pour ne pas risquer d'en
// perturber la logique.
let pendingCount = 0;
let oldestPendingAt = null;
// error.response n'existe QUE pour une vraie réponse HTTP (4xx/5xx) : absent,
// la requête n'a jamais atteint/reçu de réponse du serveur (backend éteint,
// coupure réseau, DNS, CORS, timeout).
let lastNetworkFailureAt = null;
// L'app ne fait aucune annulation de requête (pas d'AbortController) : un
// remontage forcé (retry de usePageLoadGate.js) laisse donc l'ancienne
// requête vivre en arrière-plan, orpheline. Sans étiquette de génération,
// son échec tardif (après que la nouvelle tentative a déjà réussi)
// pollue lastNetworkFailureAt et rouvre l'écran à tort. bumpGeneration()
// (appelée juste avant chaque remontage) rend obsolètes les requêtes
// encore en vol : leur échec est compté dans pendingCount (pour ne pas
// fausser le décompte) mais ignoré pour lastNetworkFailureAt.
let currentGeneration = 0;
const activityListeners = new Set();

function notifyActivity() {
  activityListeners.forEach((fn) => fn({ pendingCount, oldestPendingAt, lastNetworkFailureAt }));
}

export function onRequestActivity(fn) {
  activityListeners.add(fn);
  return () => activityListeners.delete(fn);
}

export function bumpGeneration() {
  currentGeneration += 1;
}

api.interceptors.request.use((config) => {
  config.__generation = currentGeneration;
  pendingCount += 1;
  if (pendingCount === 1) oldestPendingAt = Date.now();
  notifyActivity();
  return config;
});

api.interceptors.response.use(
  (response) => {
    pendingCount = Math.max(0, pendingCount - 1);
    if (pendingCount === 0) oldestPendingAt = null;
    notifyActivity();
    return response;
  },
  (error) => {
    pendingCount = Math.max(0, pendingCount - 1);
    if (pendingCount === 0) oldestPendingAt = null;
    if (!error.response && error.config?.__generation === currentGeneration) {
      lastNetworkFailureAt = Date.now();
    }
    notifyActivity();
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !original ||
      original._retry ||
      original.url?.endsWith(REFRESH_URL) ||
      AUTH_URLS.some((url) => original.url?.endsWith(url))
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = api.post(REFRESH_URL).finally(() => {
          refreshPromise = null;
        });
      }
      const { data } = await refreshPromise;
      accessToken = data.accessToken;
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      accessToken = null;
      if (onAuthFailure) onAuthFailure();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
