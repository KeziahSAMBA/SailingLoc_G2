import axios from 'axios';
import { validatedApiBaseUrl } from '../security/apiOrigin.js';

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
const apiBaseUrl =
  validatedApiBaseUrl(configuredApiBaseUrl, {
    environment: deploymentBuild ? 'production' : 'development',
  }) || localDevelopmentApiBaseUrl;

// Timeout global : sans lui, une perte de connexion laisse l'UI bloquée sur un
// spinner infini. Les uploads (multipart) surchargent avec UPLOAD_TIMEOUT_MS.
export const UPLOAD_TIMEOUT_MS = 60000;

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_RESPONSE_HEADER = 'x-csrf-token';
const CSRF_TOKEN_REQUIRED_CODE = 'CSRF_TOKEN_REQUIRED';
// Le backend délivre le jeton via @dr.pogodin/csurf, dont le format est
// « sel-empreinte » en base64url, et non l'hexadécimal de l'implémentation
// maison précédente. Un jeton refusé ici empêcherait toute reprise CSRF.
const CSRF_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Le cookie CSRF reste HttpOnly sur le domaine API. Le frontend ne conserve
 * que la copie transmise par un en-tête CORS autorisé, en mémoire de module :
 * aucun stockage persistant ni accès direct aux cookies n'est nécessaire.
 */
let csrfToken = null;

export function captureCsrfToken(response) {
  const headers = response?.headers;
  const value = headers?.get?.(CSRF_HEADER_NAME) ?? headers?.[CSRF_RESPONSE_HEADER];
  if (typeof value === 'string' && CSRF_TOKEN_PATTERN.test(value)) {
    csrfToken = value;
  }
  return csrfToken;
}

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
  config.headers = config.headers || {};
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (MUTATING_METHODS.has(String(config.method || 'get').toUpperCase())) {
    if (csrfToken) config.headers[CSRF_HEADER_NAME] = csrfToken;
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
    captureCsrfToken(response);
    pendingCount = Math.max(0, pendingCount - 1);
    if (pendingCount === 0) oldestPendingAt = null;
    notifyActivity();
    return response;
  },
  (error) => {
    captureCsrfToken(error.response);
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

    // Lors du premier appel d'une session créée avant le déploiement CSRF (ou
    // après un rechargement qui a vidé la mémoire), le serveur renvoie ce code
    // précis et le jeton dans un en-tête CORS. Une seule reprise est autorisée.
    if (
      status === 403 &&
      error.response?.data?.code === CSRF_TOKEN_REQUIRED_CODE &&
      original &&
      !original._csrfRetry
    ) {
      captureCsrfToken(error.response);
      if (!csrfToken) return Promise.reject(error);
      original._csrfRetry = true;
      original.headers = original.headers || {};
      original.headers[CSRF_HEADER_NAME] = csrfToken;
      return api(original);
    }

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
