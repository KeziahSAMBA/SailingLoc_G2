import crypto from 'crypto';
import { getRuntimeEnvironment } from '../config/appConfig.js';
import { normalizeRequestOrigin } from '../utils/corsSecurity.js';

export const CSRF_COOKIE_NAME = 'sl_csrf';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';
export const CSRF_TOKEN_REQUIRED_CODE = 'CSRF_TOKEN_REQUIRED';
export const CSRF_TOKEN_INVALID_CODE = 'CSRF_TOKEN_INVALID';
const CSRF_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Le serveur principal utilise le middleware exporté ci-dessous directement.
// La fabrique reste disponible pour les applications/tests qui ont besoin de
// leur propre configuration sans partager l'état du serveur principal.
let runtimeEnvironment = getRuntimeEnvironment();
let runtimeAllowedOrigins = new Set();

export function configureCsrfProtection({
  environment = getRuntimeEnvironment(),
  allowedOrigins = new Set(),
} = {}) {
  runtimeEnvironment = environment;
  runtimeAllowedOrigins = new Set(allowedOrigins);
}

function isProductionLike(environment) {
  return ['production', 'staging'].includes(
    String(environment || getRuntimeEnvironment())
      .trim()
      .toLowerCase()
  );
}

export function csrfCookieOptions(environment = getRuntimeEnvironment()) {
  const productionLike = isProductionLike(environment);
  return {
    httpOnly: true,
    secure: productionLike,
    sameSite: productionLike ? 'strict' : 'lax',
    path: '/api',
    maxAge: CSRF_COOKIE_TTL_MS,
  };
}

function createCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function safeToken(value) {
  return typeof value === 'string' && CSRF_TOKEN_PATTERN.test(value) ? value : null;
}

/**
 * Compare the browser-provided token without leaking timing information about
 * the matching prefix. The length check is performed before timingSafeEqual,
 * which requires equal-sized buffers and must never receive attacker-shaped
 * input directly.
 */
export function csrfTokensMatch(expected, received) {
  const expectedToken = safeToken(expected);
  const receivedToken = safeToken(received);
  if (!expectedToken || !receivedToken || expectedToken.length !== receivedToken.length) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(expectedToken, 'utf8'),
    Buffer.from(receivedToken, 'utf8')
  );
}

/**
 * Middleware CSRF de l'application Express principale.
 *
 * Cette fonction est volontairement exportée et passée directement à
 * `app.use`: les outils d'analyse peuvent ainsi vérifier le lien entre la
 * lecture du cookie, son renouvellement et la validation du jeton. Le
 * comportement est identique à celui de la fabrique située plus bas.
 */
export function csrfProtection(req, res, next) {
  const incomingToken = safeToken(req.cookies?.[CSRF_COOKIE_NAME]);
  const csrfToken = incomingToken || createCsrfToken();
  const requestOrigin = normalizeRequestOrigin(req.get('origin'));
  const exposeToken = Boolean(requestOrigin && runtimeAllowedOrigins.has(requestOrigin));

  if (!incomingToken) {
    res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions(runtimeEnvironment));
  }
  if (exposeToken) {
    res.setHeader(CSRF_HEADER_NAME, csrfToken);
  }

  if (SAFE_METHODS.has(req.method) || !req.cookies?.sl_refresh) {
    return next();
  }

  const submittedToken = req.get(CSRF_HEADER_NAME);
  if (!incomingToken || !submittedToken) {
    return res.status(403).json({
      message: 'Jeton CSRF requis.',
      code: CSRF_TOKEN_REQUIRED_CODE,
    });
  }

  if (!csrfTokensMatch(csrfToken, submittedToken)) {
    return res.status(403).json({
      message: 'Jeton CSRF invalide.',
      code: CSRF_TOKEN_INVALID_CODE,
    });
  }

  return next();
}

/**
 * Double-submit CSRF protection for cookie-authenticated mutations.
 *
 * The token cookie stays HttpOnly. For an explicitly allowed browser origin,
 * the same value is exposed in X-CSRF-Token and kept only in frontend memory.
 * Bearer-only clients remain compatible because they do not carry the ambient
 * refresh cookie; requests without a refresh cookie therefore do not need a
 * CSRF token. CORS enforces the same origin allowlist at the app boundary.
 */
export function createCsrfProtection({
  environment = getRuntimeEnvironment(),
  allowedOrigins = new Set(),
} = {}) {
  const cookieOptions = csrfCookieOptions(environment);
  const trustedOrigins = new Set(allowedOrigins);

  return function csrfProtection(req, res, next) {
    const incomingToken = safeToken(req.cookies?.[CSRF_COOKIE_NAME]);
    const csrfToken = incomingToken || createCsrfToken();
    const requestOrigin = normalizeRequestOrigin(req.get('origin'));
    const exposeToken = Boolean(requestOrigin && trustedOrigins.has(requestOrigin));

    if (!incomingToken) {
      res.cookie(CSRF_COOKIE_NAME, csrfToken, cookieOptions);
    }
    if (exposeToken) {
      res.setHeader(CSRF_HEADER_NAME, csrfToken);
    }

    if (SAFE_METHODS.has(req.method) || !req.cookies?.sl_refresh) {
      return next();
    }

    // Compatibilité de déploiement : une session créée avant l'ajout du
    // double-submit possède déjà sl_refresh mais pas encore sl_csrf. Le client
    // reçoit le nouveau cookie et un code stable, puis peut rejouer une seule
    // fois la mutation. Une origine tierce ne peut pas lire ce cookie.
    const submittedToken = req.get(CSRF_HEADER_NAME);
    if (!incomingToken || !submittedToken) {
      return res.status(403).json({
        message: 'Jeton CSRF requis.',
        code: CSRF_TOKEN_REQUIRED_CODE,
      });
    }

    if (!csrfTokensMatch(csrfToken, submittedToken)) {
      return res.status(403).json({
        message: 'Jeton CSRF invalide.',
        code: CSRF_TOKEN_INVALID_CODE,
      });
    }

    return next();
  };
}
