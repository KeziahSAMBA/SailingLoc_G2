import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast.jsx';
import CardSkeleton from '../common/CardSkeleton.jsx';
import { getFavorites, removeFavorite } from '../../services/locataireService.js';
import SafeImage from '../common/SafeImage.jsx';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0';

function ScrollableFilterRow({ ariaLabel, children, className, contentKey }) {
  const scrollRef = useRef(null);
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false });

  const updateScrollEdges = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;

    const tolerance = 2;
    const next = {
      left: node.scrollLeft > tolerance,
      right: node.scrollLeft + node.clientWidth < node.scrollWidth - tolerance,
    };

    setScrollEdges((current) =>
      current.left === next.left && current.right === next.right ? current : next
    );
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    const frame = window.requestAnimationFrame(updateScrollEdges);
    const resizeObserver = window.ResizeObserver
      ? new window.ResizeObserver(updateScrollEdges)
      : null;

    resizeObserver?.observe(node);
    window.addEventListener('resize', updateScrollEdges);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateScrollEdges);
    };
  }, [contentKey, updateScrollEdges]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={scrollRef}
        onScroll={updateScrollEdges}
        className="flex max-w-full snap-x snap-proximity flex-nowrap gap-2 overflow-x-auto scroll-smooth pb-1 touch-pan-x [scrollbar-width:none] sm:snap-none sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label={ariaLabel}
      >
        {children}
      </div>

      {scrollEdges.left && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 items-center bg-gradient-to-r from-dark-strong/95 via-dark-strong/70 to-transparent pl-1 text-on-dark/90 sm:hidden"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 motion-safe:animate-pulse">
            <path
              d="m12.5 5-5 5 5 5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}

      {scrollEdges.right && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-end bg-gradient-to-l from-dark-strong/95 via-dark-strong/70 to-transparent pr-1 text-on-dark/90 sm:hidden"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 motion-safe:animate-pulse">
            <path
              d="m7.5 5 5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </div>
  );
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function FavoriteCard({ favorite, onRemove, removing }) {
  const { t } = useTranslation();
  const boat = favorite.boat;
  const boatLink = boat?.id_boat ? `/product/${boat.id_boat}` : undefined;

  return (
    <article className="group h-36 overflow-hidden rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl transition-all duration-300 hover:border-brand/60 hover:bg-surface/15 hover:shadow-xl hover:shadow-action/10 motion-safe:hover:-translate-y-1">
      <div className="flex h-full">
        {boat?.image ? (
          <SafeImage
            src={boat.image}
            alt={t('carrousel.boatImageAlt', { name: boat?.name })}
            loading="lazy"
            className="w-28 self-stretch object-cover transition-transform duration-500 md:w-36 motion-safe:group-hover:scale-105"
            fallbackClassName="flex w-28 shrink-0 items-center justify-center self-stretch bg-surface/5 text-3xl md:w-36"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex w-28 shrink-0 items-center justify-center self-stretch bg-surface/5 text-3xl md:w-36"
          >
            ⛵
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <h3 className="truncate text-base font-bold text-on-dark">
            {boatLink ? (
              <Link
                to={boatLink}
                className={`transition hover:text-brand-soft hover:underline ${FOCUS_RING}`}
              >
                {boat?.name}
              </Link>
            ) : (
              boat?.name
            )}
          </h3>
          <p className="mt-0.5 truncate text-xs text-on-dark/60">
            {[capitalize(boat?.type), boat?.port && `${boat.port.name} · ${boat.port.city}`]
              .filter(Boolean)
              .join(' — ')}
          </p>
          {boat?.capacity ? (
            <p className="mt-0.5 truncate text-xs text-on-dark/60">
              {t('locataireFavorites.persons', { count: boat.capacity })}
            </p>
          ) : null}

          <div className="mt-auto flex items-center justify-between gap-3 pt-2">
            <p className="truncate text-sm text-on-dark/80">
              <span className="font-bold text-brand">{EURO.format(boat?.daily_price ?? 0)}</span>{' '}
              {t('locataireFavorites.perDay')}
            </p>
            <button
              type="button"
              onClick={() => onRemove(boat.id_boat)}
              disabled={removing}
              className={`shrink-0 rounded-full border border-danger-base/40 px-3 py-1 text-xs font-semibold text-danger-soft transition hover:bg-danger-base/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            >
              {removing ? t('locataireFavorites.removing') : t('locataireFavorites.remove')}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function LocataireFavorites() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    document.title = t('locataireFavorites.pageTitle');
  }, [t]);

  useEffect(() => {
    getFavorites()
      .then((res) => setFavorites(res.data.favorites || []))
      .catch((err) => setError(err.response?.data?.message || t('locataireFavorites.loadError')))
      .finally(() => setLoading(false));
  }, []);

  // Filtres dynamiques : « Tous » + les types de bateau réellement présents.
  const filters = useMemo(() => {
    const types = [...new Set(favorites.map((f) => f.boat?.type).filter(Boolean))];
    return [
      { key: 'all', label: t('locataireFavorites.all') },
      ...types.map((type) => ({ key: type, label: capitalize(type) })),
    ];
  }, [favorites, t]);

  const filtered = useMemo(
    () => (filter === 'all' ? favorites : favorites.filter((f) => f.boat?.type === filter)),
    [favorites, filter]
  );

  async function handleRemove(idBoat) {
    setRemovingId(idBoat);
    try {
      await removeFavorite(idBoat);
      setFavorites((prev) => prev.filter((f) => f.boat.id_boat !== idBoat));
      showToast(t('locataireFavorites.removeSuccess'), 'success');
    } catch (err) {
      showToast(err.response?.data?.message || t('locataireFavorites.removeError'), 'error');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section aria-labelledby="favorites-title">
      <header className="mb-6">
        <h1 id="favorites-title" className="text-2xl font-bold text-on-dark">
          {t('locataireFavorites.title')}
        </h1>
        <p className="mt-1 text-sm text-on-dark/70">{t('locataireFavorites.subtitle')}</p>
      </header>

      {error && (
        <div
          role="alert"
          className="status-indicator status-indicator--danger rounded-lg border border-danger-base/40 bg-danger-base/10 px-4 py-2 text-sm text-danger-soft"
        >
          {error}
        </div>
      )}

      {/* Filtres par type de bateau (toujours affichés s'il y a des favoris) */}
      {!loading && favorites.length > 0 && (
        <ScrollableFilterRow
          className="mb-5"
          ariaLabel={t('locataireFavorites.filterAria')}
          contentKey={filters.map((f) => `${f.key}:${f.label}`).join('|')}
        >
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={active}
                className={`shrink-0 snap-start rounded-full px-3 py-1.5 text-sm font-medium transition ${FOCUS_RING} ${
                  active
                    ? 'bg-action text-action-text'
                    : 'bg-surface/10 text-on-dark/80 hover:bg-surface/20 hover:text-on-dark'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </ScrollableFilterRow>
      )}

      {loading ? (
        <CardSkeleton count={4} height="h-36" />
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl px-4 py-8 text-center text-sm text-on-dark/70">
          {favorites.length === 0
            ? t('locataireFavorites.emptyAll')
            : t('locataireFavorites.emptyFiltered')}
        </p>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {filtered.map((f) => (
            <li key={f.id_favorite} className="min-w-0">
              <FavoriteCard
                favorite={f}
                onRemove={handleRemove}
                removing={removingId === f.boat.id_boat}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default LocataireFavorites;
