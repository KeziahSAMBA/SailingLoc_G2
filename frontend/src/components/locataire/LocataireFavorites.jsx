import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast.jsx';
import { getFavorites, removeFavorite } from '../../services/locataireService.js';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function FavoriteRow({ favorite, onRemove, removing }) {
  const { t } = useTranslation();
  const boat = favorite.boat;
  const boatLink = boat?.id_boat ? `/product/${boat.id_boat}` : undefined;

  // Contenu partagé entre la version cliquable (Link) et la version inerte ;
  // group-hover: n'agit que sous un parent .group, donc uniquement dans le Link.
  const cardBody = (
    <>
      {boat?.image ? (
        <img
          src={boat.image}
          alt={`Bateau ${boat?.name}`}
          loading="lazy"
          className="h-32 w-full shrink-0 rounded-lg bg-slate-800 object-cover sm:h-20 sm:w-28"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-32 w-full shrink-0 items-center justify-center rounded-lg bg-slate-800 text-3xl text-slate-600 sm:h-20 sm:w-28"
        >
          ⛵
        </span>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold text-white group-hover:text-[#ABD4FF]">{boat?.name}</h3>
        <p className="mt-0.5 truncate text-sm text-slate-400">
          {[capitalize(boat?.type), boat?.port && `${boat.port.name} · ${boat.port.city}`]
            .filter(Boolean)
            .join(' — ')}
        </p>
        {boat?.capacity ? (
          <p className="mt-0.5 text-xs text-slate-400">
            {t('locataireFavorites.persons', { count: boat.capacity })}
          </p>
        ) : null}
      </div>
    </>
  );

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {boatLink ? (
          <Link
            to={boatLink}
            className={`group flex min-w-0 items-center gap-4 sm:flex-1 ${FOCUS_RING}`}
          >
            {cardBody}
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-4 sm:flex-1">{cardBody}</div>
        )}

        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-[#5AB4EC]">
              {EURO.format(boat?.daily_price ?? 0)}
            </span>{' '}
            {t('locataireFavorites.perDay')}
          </p>
          <button
            type="button"
            onClick={() => onRemove(boat.id_boat)}
            disabled={removing}
            className={`shrink-0 rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
          >
            {removing ? t('locataireFavorites.removing') : t('locataireFavorites.remove')}
          </button>
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
        <p className="mt-1 text-sm text-slate-400">{t('locataireFavorites.subtitle')}</p>
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
                    ? 'bg-[#0A3172] text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-slate-300">{t('locataireFavorites.loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-8 text-center text-sm text-slate-400">
          {favorites.length === 0
            ? t('locataireFavorites.emptyAll')
            : t('locataireFavorites.emptyFiltered')}
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((f) => (
            <li key={f.id_favorite}>
              <FavoriteRow
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
