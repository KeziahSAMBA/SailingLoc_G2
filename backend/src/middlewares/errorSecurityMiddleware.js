import {
  redactSensitive,
  sanitizeLogText,
  sanitizePublicBody,
  serializeSanitizedLog,
} from '../utils/privacy.js';

export const GENERIC_SERVER_MESSAGE = 'Une erreur interne est survenue.';

const STATUS_MESSAGES = Object.freeze({
  400: 'Requête invalide.',
  401: 'Authentification requise.',
  403: 'Accès refusé.',
  404: 'Ressource introuvable.',
  409: 'Conflit avec l’état actuel de la ressource.',
  413: 'Corps de requête trop volumineux.',
  415: 'Type de contenu non supporté.',
  422: 'Données invalides.',
  429: 'Trop de requêtes. Réessayez plus tard.',
  500: GENERIC_SERVER_MESSAGE,
  502: 'Service temporairement indisponible.',
  503: 'Service temporairement indisponible.',
  504: 'Service temporairement indisponible.',
});

function statusOf(error) {
  const status = Number(error?.status ?? error?.statusCode);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

function safePath(req) {
  const route = req?.route?.path;
  const path = route ? `${req.baseUrl || ''}${route}` : String(req?.path || '/');
  // Reset/verification tokens are path segments, not named object keys.  A
  // long opaque segment is therefore removed before the line reaches logs.
  return sanitizeLogText(path.replace(/\/[^/]{32,}(?=\/|$)/g, '/[REDACTED]'), 300);
}

export function logInternalError(req, error, context = undefined) {
  const details = {
    method: req?.method ? sanitizeLogText(req.method, 16) : undefined,
    path: safePath(req),
    error: redactSensitive(error, { maxDepth: 4, maxEntries: 40 }),
    ...(context ? { context: redactSensitive(context, { maxDepth: 3, maxEntries: 20 }) } : {}),
  };
  // One sanitized line prevents CR/LF log injection while retaining the stack
  // and structured fields for operators in the internal log sink.
  console.error(`[request-error] ${serializeSanitizedLog(details)}`);
}

export function publicError(error, options = {}) {
  const status = statusOf(error);
  const fallback =
    STATUS_MESSAGES[status] || (status >= 500 ? GENERIC_SERVER_MESSAGE : 'Requête invalide.');
  const candidate = options.message ?? error?.publicMessage ?? error?.message;
  const message = status >= 500 ? fallback : sanitizeLogText(candidate, 240) || fallback;
  return { status, body: { message } };
}

// Controllers can continue to own their response shape for now, but all
// exception paths call this small adapter.  It preserves known 4xx UX while
// making every 5xx response generic and leaving the actual error for logs.
export function sendError(res, error, options = {}) {
  const { status, body } = publicError(error, options);
  if (res.locals) res.locals.apiError = error;
  return res.status(status).json(body);
}

// Legacy controllers in this application used `res.status(...).json(...)`
// directly.  This guard is intentionally kept at the application boundary so
// a future route cannot accidentally reintroduce a detailed 5xx response.
export function safeErrorResponses(req, res, next) {
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500) {
      if (res.locals?.apiError && !res.locals.apiErrorLogged) {
        res.locals.apiErrorLogged = true;
        logInternalError(req, res.locals.apiError);
      }
      return sendJson({ message: GENERIC_SERVER_MESSAGE });
    }
    if (res.statusCode >= 400) return sendJson(sanitizePublicBody(body));
    return sendJson(body);
  };
  next();
}

export function secureErrorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const { status, body } = publicError(error);
  if (status >= 500) logInternalError(req, error);
  if (res.locals) {
    res.locals.apiError = error;
    res.locals.apiErrorLogged = true;
  }
  return res.status(status).json(body);
}

// Express 4 does not forward rejected promises from async handlers.  Routes
// that do not catch their own errors can use this adapter to reach the central
// handler without changing their public response contract.
export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
