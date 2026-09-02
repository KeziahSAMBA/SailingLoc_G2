import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBoats, deleteBoat } from '../../services/proprietaireService.js';
import { useToast } from '../../hooks/useToast.jsx';
import CardSkeleton from '../common/CardSkeleton.jsx';
import SafeImage from '../common/SafeImage.jsx';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const BOAT_STATUS_CLS = {
  draft: 'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/80',
  pending: 'status-indicator status-indicator--warning bg-warning-base/15 text-warning-soft',
  published: 'status-indicator status-indicator--success bg-success-base/15 text-success-soft',
  refused: 'status-indicator status-indicator--danger bg-danger-base/15 text-danger-soft',
};

const FILTER_KEYS = ['all', 'draft', 'pending', 'published', 'refused'];

// Styles de focus clavier communs aux éléments cliquables (accessibilité).
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0';

const PAGE_SIZE = 9;

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

function BoatCard({ boat, busy, onDelete }) {
  const { t } = useTranslation();
  const statusCls =
    BOAT_STATUS_CLS[boat.status] ||
    'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/80';

  return (
    <article className="group flex h-full min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl transition-all duration-300 hover:border-brand/60 hover:shadow-xl hover:shadow-action/10">
      {boat.image ? (
        <SafeImage
          src={boat.image}
          alt={t('proprietaireBoats.boatAlt', { name: boat.name })}
          loading="lazy"
          className="h-36 w-full shrink-0 object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
          fallbackClassName="flex h-36 w-full shrink-0 items-center justify-center bg-surface/5 text-3xl text-on-dark/50"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-36 w-full shrink-0 items-center justify-center bg-surface/5 text-sm text-on-dark/50"
        >
          {t('proprietaireBoats.noPhoto')}
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-on-dark">{boat.name}</h2>
            <p className="mt-0.5 truncate text-xs text-on-dark/60">
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
            <dt className="text-xs text-on-dark/60">{t('proprietaireBoats.pricePerDay')}</dt>
            <dd className="font-medium text-on-dark">
              {boat.daily_price != null ? EURO.format(boat.daily_price) : '—'}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-xs text-on-dark/60">{t('proprietaireBoats.capacity')}</dt>
            <dd className="font-medium text-on-dark">
              {boat.capacity != null
                ? t('proprietaireBoats.people', { count: boat.capacity })
                : '—'}
            </dd>
          </div>
        </dl>

        {boat.pending_bookings > 0 && (
          <p className="mt-3 rounded-lg bg-warning-base/10 px-3 py-1.5 text-xs font-medium text-warning-soft">
            {t('proprietaireBoats.pendingBookings', { count: boat.pending_bookings })}
          </p>
        )}

        {boat.status === 'refused' && (
          <p className="mt-3 rounded-lg bg-danger-base/10 px-3 py-1.5 text-xs text-danger-soft">
            {t('proprietaireBoats.refusedNotice')}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <Link
            to={`/proprietaire/bateaux/${boat.id_boat}/modifier`}
            className={`rounded-full bg-action px-4 py-1.5 text-xs font-semibold text-on-dark transition hover:bg-action-hover ${FOCUS_RING}`}
          >
            {boat.status === 'draft'
              ? t('proprietaireBoats.editDraft')
              : t('proprietaireBoats.edit')}
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(boat)}
            className={`rounded-full border border-danger-base/40 px-4 py-1.5 text-xs font-semibold text-danger-soft transition hover:bg-danger-base/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
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
          <h1 id="boats-title" className="text-2xl font-bold text-on-dark">
            {t('proprietaireBoats.title')}
          </h1>
          <p className="mt-1 text-sm text-on-dark/70">{t('proprietaireBoats.subtitle')}</p>
        </div>
        <Link
          to="/proprietaire/bateaux/nouveau"
          className={`shrink-0 rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-on-dark shadow transition hover:bg-action-hover ${FOCUS_RING}`}
        >
          {t('proprietaireBoats.addBoat')}
        </Link>
      </header>

      {error && (
        <div
          role="alert"
          className="status-indicator status-indicator--danger mb-5 rounded-lg border border-danger-base/40 bg-danger-base/10 px-4 py-2 text-sm text-danger-soft"
        >
          {error}
        </div>
      )}

      {/* Filtres par statut */}
      <ScrollableFilterRow
        className="mb-5"
        ariaLabel={t('proprietaireBoats.filterAria')}
        contentKey={FILTER_KEYS.map(
          (key) => `${key}:${t(`proprietaireBoats.filters.${key}`)}:${counts[key] || 0}`
        ).join('|')}
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
              className={`shrink-0 snap-start rounded-full px-3 py-1.5 text-sm font-medium transition ${FOCUS_RING} ${
                active
                  ? 'bg-action text-on-dark'
                  : 'bg-surface/10 text-on-dark/80 hover:bg-surface/20 hover:text-on-dark'
              }`}
            >
              {t(`proprietaireBoats.filters.${key}`)}
              {key !== 'all' && count > 0 && ` (${count})`}
            </button>
          );
        })}
      </ScrollableFilterRow>

      {loading ? (
        <CardSkeleton count={6} height="h-64" withIcon />
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl px-4 py-8 text-center text-sm text-on-dark/70">
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
              <p className="text-xs text-on-dark/60" aria-live="polite">
                {t('proprietaireBoats.paginationLabel')} {(safePage - 1) * PAGE_SIZE + 1}
                {' – '}
                {Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length}
              </p>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage === 1}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${FOCUS_RING}`}
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
                        ? 'bg-action text-on-dark'
                        : 'text-on-dark/80 hover:bg-surface/10 hover:text-on-dark'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage === pageCount}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${FOCUS_RING}`}
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay/60 p-4"
          onClick={() => !deleting && setToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-boat-title"
            className="w-full max-w-md rounded-2xl border border-glass/20 bg-surface/10 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-boat-title" className="text-lg font-semibold text-on-dark">
              {toDelete.status === 'draft'
                ? t('proprietaireBoats.deleteDraftTitle')
                : t('proprietaireBoats.deleteListingTitle')}
            </h2>
            <p className="mt-1 text-sm text-on-dark/70">
              {toDelete.name}
              {toDelete.port && ` — ${toDelete.port.name} · ${toDelete.port.city}`}
            </p>
            <p className="mt-3 text-sm text-on-dark/80">
              {toDelete.status === 'published'
                ? t('proprietaireBoats.deletePublishedWarning')
                : t('proprietaireBoats.deleteWarning')}
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setToDelete(null)}
                className={`rounded-full border border-glass/40 px-4 py-2 text-sm font-semibold text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                {t('proprietaireBoats.back')}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className={`rounded-full bg-danger/80 px-4 py-2 text-sm font-semibold text-on-dark transition hover:bg-danger-base disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
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
