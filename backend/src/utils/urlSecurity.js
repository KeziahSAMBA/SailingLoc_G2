import { initConfig, getRuntimeEnvironment } from '../config/appConfig.js';

const PRODUCTION_LIKE_ENVS = new Set(['production', 'staging']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function trimBasePath(pathname) {
  const value = String(pathname || '').replace(/\/+$/g, '');
  return value === '/' ? '' : value;
}

function parseCanonicalAppUrl(appUrl, environment = getRuntimeEnvironment()) {
  const value = String(appUrl || '').trim();
  if (!value) throw new Error('APP_URL est obligatoire pour construire une URL publique.');

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('APP_URL est invalide.');
  }

  const env = String(environment || '')
    .trim()
    .toLowerCase();
  const local = LOCAL_HOSTS.has(parsed.hostname.toLowerCase());
  const secureRequired = PRODUCTION_LIKE_ENVS.has(env);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('APP_URL doit utiliser HTTP ou HTTPS.');
  }
  if (secureRequired && (parsed.protocol !== 'https:' || local)) {
    throw new Error('APP_URL doit être une origine HTTPS publique.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('APP_URL ne doit contenir ni identifiants, ni query string, ni fragment.');
  }

  parsed.pathname = trimBasePath(parsed.pathname);
  return parsed;
}

// Return the configured application origin/path after parsing it as a URL.  No
// request header participates in this decision, so Host-header spoofing cannot
// poison links persisted in the database or sent in emails.
export function canonicalAppUrl(appUrl, environment) {
  const config = appUrl === undefined ? initConfig() : { APP_URL: appUrl };
  return parseCanonicalAppUrl(config.APP_URL, environment).toString().replace(/\/$/, '');
}

export function buildAppUrl(pathname = '', query = undefined) {
  const base = new URL(`${canonicalAppUrl()}/`);
  const rawPath = String(pathname || '');
  if (/^[a-z][a-z\d+.-]*:/i.test(rawPath) || rawPath.includes('\\') || rawPath.includes('\0')) {
    throw new Error('Chemin d’URL invalide.');
  }

  const relativePath = rawPath.replace(/^\/+/, '');
  const target = new URL(relativePath, base);
  if (target.origin !== base.origin) throw new Error('Chemin d’URL invalide.');
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) target.searchParams.set(key, String(value));
    }
  }
  return target.toString();
}

export function publicAssetUrl(kind, filename) {
  if (!['boats', 'avatars'].includes(kind)) throw new Error('Type de ressource publique invalide.');
  const safeFilename = String(filename || '');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/.test(safeFilename)) {
    throw new Error('Nom de ressource publique invalide.');
  }
  return buildAppUrl(`/uploads/${kind}/${encodeURIComponent(safeFilename)}`);
}
