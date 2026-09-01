const PRODUCTION_LIKE_ENVIRONMENTS = new Set(['production', 'staging']);
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function originFromUrl(value, name, { requireHttps = false, allowPath = false } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${name} contient une origine invalide.`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    hostname.includes('*')
  ) {
    throw new Error(`${name} doit contenir uniquement des origines HTTP(S) sans identifiants.`);
  }
  if ((!allowPath && parsed.pathname !== '/') || parsed.search || parsed.hash) {
    throw new Error(`${name} ne doit pas contenir de chemin, query string ou fragment.`);
  }
  if (requireHttps && parsed.protocol !== 'https:') {
    throw new Error(`${name} doit utiliser HTTPS en production ou staging.`);
  }
  if (requireHttps && LOCAL_HOSTNAMES.has(hostname)) {
    throw new Error(`${name} ne peut pas utiliser un hôte local en production ou staging.`);
  }

  return parsed.origin;
}

/**
 * Build the exact set of browser origins allowed to send credentialed API
 * requests. APP_URL may contain an application path, so only its origin is
 * used for CORS. Additional origins must be explicitly listed as a
 * comma-separated CORS_ORIGINS value.
 */
export function allowedCorsOrigins({ appUrl, configuredOrigins = '', environment } = {}) {
  const env = String(environment || '')
    .trim()
    .toLowerCase();
  const requireHttps = PRODUCTION_LIKE_ENVIRONMENTS.has(env);
  const origins = new Set();
  const appOrigin = originFromUrl(appUrl, 'APP_URL', { requireHttps, allowPath: true });
  if (appOrigin) origins.add(appOrigin);

  for (const candidate of String(configuredOrigins || '').split(',')) {
    const origin = originFromUrl(candidate, 'CORS_ORIGINS', { requireHttps });
    if (origin) origins.add(origin);
  }

  return origins;
}

/**
 * Normalize an Origin header without accepting the special `null` origin or
 * URL forms that cannot be compared safely to the configured allowlist.
 */
export function normalizeRequestOrigin(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'null') return null;
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}
