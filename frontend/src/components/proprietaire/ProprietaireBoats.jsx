import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBoats, deleteBoat } from '../../services/proprietaireService.js';
import { useToast } from '../../hooks/useToast.jsx';
import CardSkeleton from '../common/CardSkeleton.jsx';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const BOAT_STATUS_CLS = {
  draft: 'bg-slate-500/15 text-white/80',
  pending: 'bg-amber-500/15 text-amber-300',
  published: 'bg-emerald-500/15 text-emerald-300',
  refused: 'bg-red-500/15 text-red-300',
};

const FILTER_KEYS = ['all', 'draft', 'pending', 'published', 'refused'];

// Styles de focus clavier communs aux éléments cliquables (accessibilité).
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

const PAGE_SIZE = 9;

function BoatCard({ boat, busy, onDelete }) {
  const { t } = useTranslation();
  const statusCls = BOAT_STATUS_CLS[boat.status] || 'bg-slate-500/15 text-white/80';

  return (
    <article className="group flex h-full min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl transition-all duration-300 hover:border-[#5AB4EC]/60 hover:shadow-xl hover:shadow-sky-500/10">
      {boat.image ? (
        <img
          src={boat.image}
          alt={t('proprietaireBoats.boatAlt', { name: boat.name })}
          loading="lazy"
          className="h-36 w-full shrink-0 object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-36 w-full shrink-0 items-center justify-center bg-white/5 text-sm text-white/50"
        >
          {t('proprietaireBoats.noPhoto')}
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white">{boat.name}</h2>
            <p className="mt-0.5 truncate text-xs text-white/60">
              {[boat.type, boat.port && `${boat.port.name} · ${boat.port.city}`]
                .filter(Boolean)
                .join(' — ')}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls}`}
          >
            {t(`proprietaireBoats.status.${boat.status}`, { defaultValue: boat.status })}
          </span>
        </header>

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {/* Champs possiblement vides sur un brouillon. */}
          <div className="flex items-baseline gap-1.5">
            <dt className="text-xs text-white/60">{t('proprietaireBoats.pricePerDay')}</dt>
            <dd className="font-medium text-white">
              {boat.daily_price != null ? EURO.format(boat.daily_price) : '—'}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-xs text-white/60">{t('proprietaireBoats.capacity')}</dt>
            <dd className="font-medium text-white">
              {boat.capacity != null
                ? t('proprietaireBoats.people', { count: boat.capacity })
                : '—'}
            </dd>
          </div>
        </dl>

        {boat.pending_bookings > 0 && (
          <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">
            {t('proprietaireBoats.pendingBookings', { count: boat.pending_bookings })}
          </p>
        )}

        {boat.status === 'refused' && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
            {t('proprietaireBoats.refusedNotice')}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <Link
            to={`/proprietaire/bateaux/${boat.id_boat}/modifier`}
            className={`rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-600 ${FOCUS_RING}`}
          >
            {boat.status === 'draft'
              ? t('proprietaireBoats.editDraft')
              : t('proprietaireBoats.edit')}
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(boat)}
            className={`rounded-full border border-red-500/40 px-4 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
          >
            {t('proprietaireBoats.delete')}
          </button>
        </div>
      </div>
    </article>
  );
}

function ProprietaireBoats() {
  const { t } = useTranslation();
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  // Modal de confirmation de suppression : bateau ciblé + envoi en cours.
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = t('proprietaireBoats.pageTitle');
  }, [t]);

  useEffect(() => {
    getBoats()
      .then((res) => setBoats(res.data.boats || []))
      .catch((err) => setError(err.response?.data?.message || t('proprietaireBoats.loadError')))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? boats : boats.filter((b) => b.status === filter)),
    [boats, filter]
  );

  // Compteur par statut affiché sur les filtres (ex. « Publiés (12) »).
  const counts = useMemo(() => {
    const c = { all: boats.length };
    for (const b of boats) c[b.status] = (c[b.status] || 0) + 1;
    return c;
  }, [boats]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Filtrer ou supprimer peut rendre la page courante inexistante.
  const safePage = Math.min(page, pageCount);
  const pageBoats = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  useEffect(() => {
    setPage(1);
  }, [filter]);

  // Fermeture de la modal au clavier (Échap), sauf pendant l'envoi.
  useEffect(() => {
    if (!toDelete) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !deleting) setToDelete(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toDelete, deleting]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteBoat(toDelete.id_boat);
      setBoats((prev) => prev.filter((b) => b.id_boat !== toDelete.id_boat));
      showToast(
        toDelete.status === 'draft'
          ? t('proprietaireBoats.draftDeleted')
          : t('proprietaireBoats.listingDeleted'),
        'success'
      );
      setToDelete(null);
    } catch (err) {
      showToast(err.response?.data?.message || t('proprietaireBoats.genericError'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section aria-labelledby="boats-title">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="boats-title" className="text-2xl font-bold text-white">
            {t('proprietaireBoats.title')}
          </h1>
          <p className="mt-1 text-sm text-white/70">{t('proprietaireBoats.subtitle')}</p>
        </div>
        <Link
          to="/proprietaire/bateaux/nouveau"
          className={`shrink-0 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-sky-600 ${FOCUS_RING}`}
        >
          {t('proprietaireBoats.addBoat')}
        </Link>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {/* Filtres par statut */}
      <div
        className="mb-5 flex flex-wrap gap-2"
        role="group"
        aria-label={t('proprietaireBoats.filterAria')}
      >
        {FILTER_KEYS.map((key) => {
          const active = filter === key;
          const count = counts[key] || 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={active}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${FOCUS_RING} ${
                active
                  ? 'bg-sky-500 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              {t(`proprietaireBoats.filters.${key}`)}
              {key !== 'all' && count > 0 && ` (${count})`}
            </button>
          );
        })}
      </div>

      {loading ? (
        <CardSkeleton count={6} height="h-64" withIcon />
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-8 text-center text-sm text-white/70">
          {boats.length === 0
            ? t('proprietaireBoats.emptyAll')
            : t('proprietaireBoats.emptyFilter')}
        </p>
      ) : (
        <>
          {/* auto-rows-fr + h-full : toutes les cartes gardent la même hauteur, quel que soit leur contenu. */}
          <ul className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pageBoats.map((b) => (
              <li key={b.id_boat} className="h-full">
                <BoatCard
                  boat={b}
                  busy={deleting && toDelete?.id_boat === b.id_boat}
                  onDelete={setToDelete}
                />
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <nav
              aria-label="Pagination des bateaux"
              className="mt-5 flex flex-wrap items-center justify-between gap-3"
            >
              <p className="text-xs text-white/60" aria-live="polite">
                {t('proprietaireBoats.paginationLabel')} {(safePage - 1) * PAGE_SIZE + 1}
                {' – '}
                {Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length}
              </p>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage === 1}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${FOCUS_RING}`}
                >
                  {t('pagination.previous')}
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={n === safePage ? 'page' : undefined}
                    aria-label={t('pagination.page', { n })}
                    className={`min-w-[2rem] rounded-full px-2.5 py-1.5 text-sm font-medium transition ${FOCUS_RING} ${
                      n === safePage
                        ? 'bg-sky-500 text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage === pageCount}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${FOCUS_RING}`}
                >
                  {t('pagination.next')}
                </button>
              </div>
            </nav>
          )}
        </>
      )}

      {/* Modal de confirmation de suppression */}
      {toDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !deleting && setToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-boat-title"
            className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-boat-title" className="text-lg font-semibold text-white">
              {toDelete.status === 'draft'
                ? t('proprietaireBoats.deleteDraftTitle')
                : t('proprietaireBoats.deleteListingTitle')}
            </h2>
            <p className="mt-1 text-sm text-white/70">
              {toDelete.name}
              {toDelete.port && ` — ${toDelete.port.name} · ${toDelete.port.city}`}
            </p>
            <p className="mt-3 text-sm text-white/80">
              {toDelete.status === 'published'
                ? t('proprietaireBoats.deletePublishedWarning')
                : t('proprietaireBoats.deleteWarning')}
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setToDelete(null)}
                className={`rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                {t('proprietaireBoats.back')}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className={`rounded-full bg-red-600/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
              >
                {deleting ? t('proprietaireBoats.deleting') : t('proprietaireBoats.deleteConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProprietaireBoats;
