import { useState } from 'react';
import { normalizeImageSource, selectImageSource } from '../../utils/imageSource.js';

const DEFAULT_BOAT_FALLBACK = '⛵';

/**
 * Render an API-provided image without ever emitting an empty src attribute.
 * A failed primary source is tried once against fallbackSrc. The fallback
 * image deliberately has no onError handler, so a broken fallback cannot loop.
 * When no fallback source is available, fallback is rendered as the existing
 * React placeholder (or null for media such as ports without a photo).
 */
export default function SafeImage({
  src,
  alt = '',
  className = '',
  style,
  fallback = DEFAULT_BOAT_FALLBACK,
  fallbackSrc = null,
  fallbackClassName,
  onError,
  ...imageProps
}) {
  const source = normalizeImageSource(src);
  const fallbackSource = normalizeImageSource(fallbackSrc);
  const [failedSource, setFailedSource] = useState(null);
  const selected = selectImageSource({ source, fallbackSource, failedSource });

  if (selected.kind === 'primary') {
    return (
      <img
        {...imageProps}
        src={selected.src}
        alt={alt}
        className={className}
        style={style}
        onError={(event) => {
          setFailedSource(selected.src);
          onError?.(event);
        }}
      />
    );
  }

  if (selected.kind === 'fallback') {
    return <img {...imageProps} src={selected.src} alt={alt} className={className} style={style} />;
  }

  if (fallback === null || fallback === false) return null;

  return (
    <span
      aria-hidden="true"
      className={fallbackClassName || className}
      style={{ display: 'block', ...style }}
    >
      {fallback}
    </span>
  );
}
