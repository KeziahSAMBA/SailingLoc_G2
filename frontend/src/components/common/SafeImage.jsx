import { useState } from 'react';
import {
  normalizeImageSource,
  selectImageSource,
  toRenderableImageSource,
} from '../../utils/imageSource.js';

const DEFAULT_BOAT_FALLBACK = '⛵';

/**
 * Render an API-provided image without ever emitting an empty or unsafe src
 * attribute. A failed primary source is tried once against fallbackSrc. The
 * fallback image deliberately has no onError handler, so a broken fallback
 * cannot loop.
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
  loading,
  decoding,
  width,
  height,
  fetchPriority,
  fetchpriority,
  draggable,
}) {
  const source = normalizeImageSource(src);
  const fallbackSource = normalizeImageSource(fallbackSrc);
  const [failedSource, setFailedSource] = useState(null);
  const selected = selectImageSource({ source, fallbackSource, failedSource });
  const priority = fetchPriority ?? fetchpriority;
  const renderableSource = toRenderableImageSource(selected.src);

  if (selected.kind === 'primary' && renderableSource) {
    return (
      <img
        src={renderableSource}
        alt={alt}
        className={className}
        style={style}
        loading={loading}
        decoding={decoding}
        width={width}
        height={height}
        fetchPriority={priority}
        draggable={draggable}
        onError={(event) => {
          setFailedSource(selected.src);
          onError?.(event);
        }}
      />
    );
  }

  if (selected.kind === 'fallback' && renderableSource) {
    return (
      <img
        src={renderableSource}
        alt={alt}
        className={className}
        style={style}
        loading={loading}
        decoding={decoding}
        width={width}
        height={height}
        fetchPriority={priority}
        draggable={draggable}
      />
    );
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
