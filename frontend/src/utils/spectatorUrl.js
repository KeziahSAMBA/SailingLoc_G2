const INVALID_PERCENT_ESCAPE = /%(?![0-9a-f]{2})/iu;
const SCHEME = /^[a-z][a-z\d+.-]*:/iu;

function hasControlCharacters(value) {
  for (const character of String(value)) {
    const codePoint = character.codePointAt(0);
    if (
      (codePoint >= 0 && codePoint <= 31) ||
      (codePoint >= 127 && codePoint <= 159) ||
      codePoint === 0x2028 ||
      codePoint === 0x2029
    ) {
      return true;
    }
  }
  return false;
}

function hasForbiddenCharacters(value) {
  if (hasControlCharacters(value) || value.includes('\\') || INVALID_PERCENT_ESCAPE.test(value)) {
    return true;
  }

  try {
    const decoded = decodeURIComponent(value);
    return hasControlCharacters(decoded) || decoded.includes('\\');
  } catch {
    return true;
  }
}

function getOrigin(origin) {
  if (typeof origin !== 'string' || !origin) return null;

  try {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.origin === 'null' || parsed.username || parsed.password) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Normalize the path entered in the admin spectator address bar.
 *
 * The spectator iframe is intentionally limited to the current web origin.
 * Returning `/` for rejected input keeps the existing address-bar UX while
 * ensuring that malformed, external or ambiguous URLs never reach the iframe.
 */
export function normalizeSpectatorPath(value, origin) {
  if (typeof value !== 'string' || !value) return '/';
  if (hasForbiddenCharacters(value)) return '/';

  const currentOrigin = getOrigin(origin);
  if (!currentOrigin) return '/';

  const normalized = value.trim();
  if (!normalized) return '/';

  // Explicit schemes and protocol-relative URLs are never valid spectator
  // paths, even when they happen to point back to this same origin.
  if (normalized.startsWith('//') || normalized.startsWith('\\') || SCHEME.test(normalized)) {
    return '/';
  }

  const candidate = normalized.startsWith('/') ? normalized : `/${normalized}`;
  try {
    const resolved = new URL(candidate, currentOrigin);
    const expectedProtocol = new URL(currentOrigin).protocol;
    if (
      resolved.origin !== currentOrigin ||
      resolved.username ||
      resolved.password ||
      resolved.protocol !== expectedProtocol
    ) {
      return '/';
    }
  } catch {
    return '/';
  }

  return candidate;
}

/**
 * Append the spectator mode query parameter to an already normalized path.
 * The path is validated again so the final iframe URL remains same-origin if
 * this helper is ever reused outside the component's current state flow.
 */
export function withSpectatorMode(value, mode, origin) {
  const path = normalizeSpectatorPath(value, origin);
  const hashIndex = path.indexOf('#');
  const pathAndQuery = hashIndex < 0 ? path : path.slice(0, hashIndex);
  const hashPart = hashIndex < 0 ? '' : path.slice(hashIndex);
  const queryIndex = pathAndQuery.indexOf('?');
  const pathPart = queryIndex < 0 ? pathAndQuery : pathAndQuery.slice(0, queryIndex);
  const queryPart = queryIndex < 0 ? '' : pathAndQuery.slice(queryIndex + 1);
  const params = new URLSearchParams(queryPart);
  params.set('spectator', String(mode ?? ''));
  return `${pathPart}?${params.toString()}${hashPart}`;
}
