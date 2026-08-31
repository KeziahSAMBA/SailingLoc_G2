/**
 * Normalize media values received from the API before they reach an image
 * element. Empty, whitespace-only and non-string values are represented by
 * null instead of an empty src attribute.
 */
export function normalizeImageSource(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
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
