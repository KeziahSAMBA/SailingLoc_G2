import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast.jsx';
import CardSkeleton from '../common/CardSkeleton.jsx';
import { getFavorites, removeFavorite } from '../../services/locataireService.js';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function FavoriteCard({ favorite, onRemove, removing }) {
  const { t } = useTranslation();
  const boat = favorite.boat;
  const boatLink = boat?.id_boat ? `/product/${boat.id_boat}` : undefined;

  return (
    <article className="group h-36 overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl transition-all duration-300 hover:border-[#5AB4EC]/60 hover:bg-white/15 hover:shadow-xl hover:shadow-sky-500/10 motion-safe:hover:-translate-y-1">
      <div className="flex h-full">
        {boat?.image ? (
          <img
            src={boat.image}
            alt={`Bateau ${boat?.name}`}
            loading="lazy"
            className="w-28 self-stretch object-cover transition-transform duration-500 md:w-36 motion-safe:group-hover:scale-105"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex w-28 shrink-0 items-center justify-center self-stretch bg-white/5 text-3xl md:w-36"
          >
            ⛵
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <h3 className="truncate text-base font-bold text-white">
            {boatLink ? (
              <Link
                to={boatLink}
                className={`transition hover:text-[#ABD4FF] hover:underline ${FOCUS_RING}`}
              >
                {boat?.name}
              </Link>
            ) : (
              boat?.name
            )}
          </h3>
          <p className="mt-0.5 truncate text-xs text-white/60">
            {[capitalize(boat?.type), boat?.port && `${boat.port.name} · ${boat.port.city}`]
              .filter(Boolean)
              .join(' — ')}
          </p>
          {boat?.capacity ? (
            <p className="mt-0.5 truncate text-xs text-white/60">
              {t('locataireFavorites.persons', { count: boat.capacity })}
            </p>
          ) : null}

          <div className="mt-auto flex items-center justify-between gap-3 pt-2">
            <p className="truncate text-sm text-white/80">
              <span className="font-bold text-[#5AB4EC]">
                {EURO.format(boat?.daily_price ?? 0)}
              </span>{' '}
              {t('locataireFavorites.perDay')}
            </p>
            <button
              type="button"
              onClick={() => onRemove(boat.id_boat)}
              disabled={removing}
              className={`shrink-0 rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
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
        <h1 id="favorites-title" className="text-2xl font-bold text-white">
          {t('locataireFavorites.title')}
        </h1>
        <p className="mt-1 text-sm text-white/70">{t('locataireFavorites.subtitle')}</p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {/* Filtres par type de bateau (toujours affichés s'il y a des favoris) */}
      {!loading && favorites.length > 0 && (
        <div
          className="mb-5 flex flex-wrap gap-2"
          role="group"
          aria-label={t('locataireFavorites.filterAria')}
        >
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${FOCUS_RING} ${
                  active
                    ? 'bg-sky-500 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <CardSkeleton count={4} height="h-36" />
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-8 text-center text-sm text-white/70">
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
