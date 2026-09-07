import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import SafeImage from './SafeImage.jsx';

function ImageLightbox({ images, index, alt, onClose, onNavigate }) {
  const { t } = useTranslation();
  const closeRef = useRef(null);
  const total = images.length;
  const current = images[index];

  const goPrevious = useCallback(
    () => onNavigate((index - 1 + total) % total),
    [index, total, onNavigate]
  );
  const goNext = useCallback(() => onNavigate((index + 1) % total), [index, total, onNavigate]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && total > 1) goPrevious();
      else if (e.key === 'ArrowRight' && total > 1) goNext();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, goPrevious, goNext, total]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('product.lightbox.label')}
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-overlay/80 p-4 backdrop-blur-sm"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={t('product.lightbox.close')}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface/10 text-on-dark transition hover:bg-surface/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-on-dark"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrevious();
          }}
          aria-label={t('product.lightbox.previous')}
          className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full bg-surface/10 text-on-dark transition hover:bg-surface/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-on-dark sm:left-6"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      <figure onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-3">
        <SafeImage
          src={current?.url}
          alt={alt}
          className="max-h-[80vh] max-w-[92vw] rounded-2xl object-contain"
          fallbackClassName="flex h-[50vh] w-[80vw] items-center justify-center rounded-2xl bg-photo-surface text-6xl"
        />
        {total > 1 && (
          <figcaption className="rounded-full bg-overlay/60 px-3 py-1 text-sm font-medium text-on-dark">
            {t('product.lightbox.counter', { current: index + 1, total })}
          </figcaption>
        )}
      </figure>

      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label={t('product.lightbox.next')}
          className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-surface/10 text-on-dark transition hover:bg-surface/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-on-dark sm:right-6"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ImageLightbox;
