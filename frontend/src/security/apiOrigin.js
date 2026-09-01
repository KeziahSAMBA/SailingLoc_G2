const PRODUCTION_LIKE_ENVIRONMENTS = new Set(['production', 'staging']);
const LOCAL_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::',
  '::1',
  '0:0:0:0:0:0:0:1',
]);

function normalizedHostname(hostname) {
  return String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/\.$/, '');
}

function ipv4Bytes(hostname) {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const bytes = parts.map(Number);
  return bytes.every((byte) => byte >= 0 && byte <= 255) ? bytes : null;
}

function mappedIpv4Bytes(hostname) {
  const matched = hostname.match(/^(?:::ffff:|0:0:0:0:0:ffff:)(.+)$/i);
  if (!matched) return null;
  const dotted = ipv4Bytes(matched[1]);
  if (dotted) return dotted;
  const words = matched[1].split(':');
  if (words.length !== 2 || words.some((word) => !/^[0-9a-f]{1,4}$/i.test(word))) return null;
  const [high, low] = words.map((word) => Number.parseInt(word, 16));
  return [high >> 8, high & 0xff, low >> 8, low & 0xff];
}

function isLocalHostname(hostname) {
  const normalized = normalizedHostname(hostname);
  const bytes = ipv4Bytes(normalized) || mappedIpv4Bytes(normalized);
  return (
    LOCAL_HOSTNAMES.has(normalized) ||
    Boolean(bytes && (bytes[0] === 127 || bytes.every((byte) => byte === 0)))
  );
}

export function isProductionLike(environment, railwayBuild = false) {
  return (
    PRODUCTION_LIKE_ENVIRONMENTS.has(
      String(environment || '')
        .trim()
        .toLowerCase()
    ) || railwayBuild
  );
}

export function validatedApiBaseUrl(
  value,
  { environment = 'production', railwayBuild = false } = {}
) {
  const configuredValue = String(value || '').trim();
  const productionLike = isProductionLike(environment, railwayBuild);
  if (!configuredValue) {
    if (productionLike) {
      throw new Error('VITE_API_BASE_URL est obligatoire pour un build de déploiement.');
    }
    return null;
  }

  let parsed;
  try {
    parsed = new URL(configuredValue);
  } catch {
    throw new Error('VITE_API_BASE_URL doit être une URL HTTP(S) valide.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('VITE_API_BASE_URL doit utiliser HTTP ou HTTPS.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(
      'VITE_API_BASE_URL ne doit contenir ni identifiants, ni query string, ni fragment.'
    );
  }
  if (parsed.pathname.replace(/\/+$/g, '') !== '/api') {
    throw new Error('VITE_API_BASE_URL doit cibler exactement le chemin /api.');
  }
  if (productionLike && parsed.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL doit utiliser HTTPS pour staging et production.');
  }
  if (productionLike && isLocalHostname(parsed.hostname)) {
    throw new Error('VITE_API_BASE_URL ne peut pas cibler un hôte local pour un déploiement.');
  }
  if (parsed.origin === 'null' || /[\s;"'\\]/.test(parsed.origin)) {
    throw new Error('VITE_API_BASE_URL contient une origine invalide.');
  }
  return `${parsed.origin}/api`;
}

export function validatedApiOrigin(value, options = {}) {
  const apiBaseUrl = validatedApiBaseUrl(value, options);
  return apiBaseUrl ? new URL(apiBaseUrl).origin : null;
}
