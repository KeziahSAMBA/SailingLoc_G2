const RASTER_MEDIA_TYPES = new Set([
  'image/avif',
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
  'image/vnd.microsoft.icon',
  'image/webp',
  'image/x-icon',
]);

const UNSAFE_URL_CHARACTERS = /[\\<>"'\s]/u;
const INVALID_PERCENT_ESCAPE = /%(?![0-9a-f]{2})/iu;
const AVATAR_XML_TEXT =
  '(?:(?:[^<>&"\'\u0000-\u001f\u007f-\u009f\u2028\u2029])|(?:&(amp|lt|gt|quot|apos);))+';
const GENERATED_AVATAR_SVG = new RegExp(
  '^<svg xmlns="http://www\\.w3\\.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="hsl\\((\\d{1,3}),42%,45%\\)"/><text x="50" y="50" dy="0\\.35em" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="42" font-weight="600" fill="#ffffff">(' +
    AVATAR_XML_TEXT +
    ')</text></svg>$',
  'u'
);
const ENCODED_PERCENT_ESCAPE = /%25([0-9a-f]{2})/giu;

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

function hasValidPercentEscapes(value) {
  return !INVALID_PERCENT_ESCAPE.test(value);
}

function containsUnsafeDecodedCharacters(value) {
  try {
    return hasControlCharacters(decodeURIComponent(value));
  } catch {
    return true;
  }
}

function hasCredentials(value) {
  const schemeSeparator = value.indexOf('//');
  if (schemeSeparator < 0) return false;
  const authorityStart = schemeSeparator + 2;
  const remainder = value.slice(authorityStart);
  const authorityEnd = remainder.search(/[/?#]/u);
  const authority = remainder.slice(0, authorityEnd < 0 ? remainder.length : authorityEnd);
  return authority.includes('@');
}

function normalizedHostname(hostname) {
  return String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^\[/u, '')
    .replace(/\]$/u, '')
    .replace(/\.$/u, '');
}

function isLocalDevelopmentHostname(hostname) {
  const normalized = normalizedHostname(hostname);
  if (['localhost', '0.0.0.0', '::', '::1'].includes(normalized)) return true;

  const parts = normalized.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/u.test(part))) return false;
  const bytes = parts.map(Number);
  return bytes.every((byte) => byte >= 0 && byte <= 255) && bytes[0] === 127;
}

function pageLocationContext(options = {}) {
  let pageOrigin = options.pageOrigin;
  if (!pageOrigin && typeof window !== 'undefined' && typeof window.location?.origin === 'string') {
    pageOrigin = window.location.origin;
  }
  if (typeof pageOrigin !== 'string' || !pageOrigin.trim()) return null;

  try {
    const parsed = new URL(pageOrigin);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return null;
    return {
      protocol: parsed.protocol,
      hostname: normalizedHostname(parsed.hostname),
    };
  } catch {
    return null;
  }
}

function isSafeHttpUrl(value, expectedProtocol = null, options = {}) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  if (expectedProtocol && parsed.protocol !== expectedProtocol) return false;
  if (!parsed.hostname || parsed.origin === 'null' || hasCredentials(value)) return false;
  if (hasUnsafePathSegments(rawHttpPath(value))) return false;
  if (parsed.protocol === 'http:') {
    const pageLocation = pageLocationContext(options);
    if (pageLocation?.protocol === 'https:') return false;

    const sourceHostname = normalizedHostname(parsed.hostname);
    const localLoopback = isLocalDevelopmentHostname(sourceHostname);
    if (!pageLocation) return localLoopback;
    if (pageLocation.protocol !== 'http:') return false;
    if (!localLoopback && sourceHostname !== pageLocation.hostname) return false;
  }
  return true;
}

function isSafeBase64(value) {
  if (!value || !/^[a-z0-9+/]+={0,2}$/iu.test(value)) return false;
  const unpadded = value.replace(/=+$/u, '');
  if (unpadded.length % 4 === 1) return false;
  return !value.includes('=') || value.length % 4 === 0;
}

function isSafeRasterDataUrl(value) {
  const comma = value.indexOf(',');
  if (comma < 0) return false;

  const metadata = value.slice(5, comma).split(';');
  const mediaType = metadata.shift()?.toLowerCase();
  return (
    metadata.length === 1 &&
    metadata[0].toLowerCase() === 'base64' &&
    RASTER_MEDIA_TYPES.has(mediaType) &&
    isSafeBase64(value.slice(comma + 1))
  );
}

function isSafeAvatarSvgDataUrl(value) {
  const payload = value.slice('data:image/svg+xml,'.length);
  if (!payload) return false;

  let svg;
  try {
    svg = decodeURIComponent(payload);
  } catch {
    return false;
  }

  const match = GENERATED_AVATAR_SVG.exec(svg);
  if (!match) return false;

  const hue = Number(match[1]);
  if (!Number.isInteger(hue) || hue < 0 || hue > 359) return false;

  const text = match[2];
  const decodedText = text.replace(/&(amp|lt|gt|quot|apos);/gu, (_, entity) => {
    const values = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    return values[entity];
  });
  return decodedText.length > 0 && Array.from(decodedText).length <= 4;
}

function rawHttpPath(value) {
  const authorityStart = value.indexOf('://') + 3;
  const pathStart = value.indexOf('/', authorityStart);
  if (pathStart < 0) return '/';

  const queryStart = value.indexOf('?', authorityStart);
  const fragmentStart = value.indexOf('#', authorityStart);
  const candidates = [queryStart, fragmentStart].filter((index) => index >= 0);
  const pathEnd = candidates.length ? Math.min(...candidates) : value.length;
  return pathStart < pathEnd ? value.slice(pathStart, pathEnd) : '/';
}

function hasUnsafePathSegments(value) {
  const path = value.split(/[?#]/u, 1)[0];
  if (!path) return true;

  return path.split('/').some((segment) => {
    let decoded = segment;
    for (let pass = 0; pass < 3; pass += 1) {
      let next;
      try {
        next = decodeURIComponent(decoded);
      } catch {
        return true;
      }
      if (
        next === '..' ||
        next.includes('/') ||
        next.includes('\\') ||
        hasControlCharacters(next)
      ) {
        return true;
      }
      if (next === decoded) return false;
      decoded = next;
    }
    return false;
  });
}

function isSafeRelativePath(value) {
  if (value.startsWith('//') || value.startsWith('\\') || /^[?#]/u.test(value)) return false;
  if (hasUnsafePathSegments(value)) return false;

  try {
    const resolved = new URL(value, 'https://sailingloc.invalid');
    return resolved.origin === 'https://sailingloc.invalid' && resolved.pathname !== '';
  } catch {
    return false;
  }
}

function isSafeBlobUrl(value, options) {
  const inner = value.slice('blob:'.length);
  if (!inner || inner.startsWith('//')) return false;

  if (/^(?:https?:)/iu.test(inner)) return isSafeHttpUrl(inner, null, options);
  if (!/^null\//iu.test(inner)) return false;

  const opaquePath = inner.slice('null/'.length);
  return Boolean(opaquePath) && !hasUnsafePathSegments(opaquePath);
}

function isAllowedImageSource(value, options) {
  if (
    !value ||
    hasControlCharacters(value) ||
    UNSAFE_URL_CHARACTERS.test(value) ||
    !hasValidPercentEscapes(value) ||
    containsUnsafeDecodedCharacters(value)
  ) {
    return false;
  }

  const lowerValue = value.toLowerCase();
  if (lowerValue.startsWith('data:image/svg+xml,')) return isSafeAvatarSvgDataUrl(value);
  if (lowerValue.startsWith('data:')) return isSafeRasterDataUrl(value);
  if (lowerValue.startsWith('blob:')) return isSafeBlobUrl(value, options);

  const scheme = value.match(/^([a-z][a-z\d+.-]*):/iu)?.[1]?.toLowerCase();
  if (scheme) return isSafeHttpUrl(value, scheme + ':', options);
  return isSafeRelativePath(value);
}

/**
 * Normalize media values received from the API before they reach an image
 * element. Empty, malformed and unsafe values are represented by null
 * instead of an empty or executable src attribute.
 */
export function normalizeImageSource(value, options = {}) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return isAllowedImageSource(normalized, options) ? normalized : null;
}

/**
 * Prepare an already validated source for a URL-valued DOM attribute.
 *
 * encodeURI is intentionally applied at the last boundary before React
 * renders the value. It is a sanitizer understood by CodeQL and keeps any
 * remaining URL metacharacters from being reinterpreted by the DOM. Existing
 * percent escapes are restored afterwards because encodeURI would otherwise
 * turn `%20` into `%2520` (and similarly for generated avatar SVGs).
 */
export function toRenderableImageSource(value, options = {}) {
  const normalized = normalizeImageSource(value, options);
  if (normalized === null) return null;

  try {
    return encodeURI(normalized).replace(ENCODED_PERCENT_ESCAPE, '%$1');
  } catch {
    return null;
  }
}

export function isSafeImageSource(value, options = {}) {
  return normalizeImageSource(value, options) !== null;
}

/**
 * Select at most one source for a SafeImage render. A failed source is
 * intentionally excluded from the candidates so a failed fallback becomes a
 * terminal state instead of re-entering an onError loop.
 */
export function selectImageSource({ source, fallbackSource = null, failedSource = null } = {}) {
  const primary = normalizeImageSource(source);
  const fallback = normalizeImageSource(fallbackSource);
  const failed = normalizeImageSource(failedSource);

  if (primary && primary !== failed) return { kind: 'primary', src: primary };
  if (fallback && fallback !== failed && fallback !== primary) {
    return { kind: 'fallback', src: fallback };
  }
  return { kind: 'none', src: null };
}
