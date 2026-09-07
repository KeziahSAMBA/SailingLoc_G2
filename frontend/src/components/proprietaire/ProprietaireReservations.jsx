import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getBookings,
  updateBookingStatus,
  reportDispute,
  getBookingInvoice,
  saveRenterReview,
} from '../../services/proprietaireService.js';
import { usePageExitNavigate } from '../../hooks/usePageTransition.js';
import { useToast } from '../../hooks/useToast.jsx';
import CardSkeleton from '../common/CardSkeleton.jsx';
import InvoiceButton from '../common/InvoiceButton.jsx';
import StarRatingInput from '../common/StarRatingInput.jsx';
import { formatDate } from '../../utils/formatDate.js';
import SafeImage from '../common/SafeImage.jsx';

const MIN_REVIEW_COMMENT = 10;

const REVIEW_STATUS_CLS = {
  pending: 'bg-warning-base/15 text-warning-soft',
  validated: 'bg-success-base/15 text-success-soft',
  refused: 'bg-danger-base/15 text-danger-soft',
};

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const DATE_OPTS = { day: 'numeric', month: 'short', year: 'numeric' };

const BOOKING_STATUS_CLS = {
  pending: 'status-indicator status-indicator--warning bg-warning-base/15 text-warning-soft',
  confirmed: 'status-indicator status-indicator--success bg-success-base/15 text-success-soft',
  refused: 'status-indicator status-indicator--danger bg-danger-base/15 text-danger-soft',
  cancelled: 'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/80',
};

const FILTER_KEYS = ['all', 'pending', 'confirmed', 'cancelled', 'refused'];
const PERIOD_KEYS = ['all', 'upcoming', 'current', 'past'];

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-action-bright focus-visible:ring-offset-0';

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

function fmtDate(value) {
  return formatDate(value, DATE_OPTS);
}

function isPast(value) {
  const end = new Date(value);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}

function startsAfterToday(value) {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return start > today;
}

// Position du séjour par rapport à aujourd'hui : passé (terminé), à venir
// (pas commencé) ou en cours (aujourd'hui dans le séjour, bornes incluses).
function matchesPeriod(booking, period) {
  if (period === 'past') return isPast(booking.end_date);
  if (period === 'upcoming') return startsAfterToday(booking.start_date);
  if (period === 'current')
    return !isPast(booking.end_date) && !startsAfterToday(booking.start_date);
  return true;
}

function BookingCard({ booking, busy, onAction, onViewLocataire, onReview, mirrored }) {
  const { t } = useTranslation();
  const statusCls =
    BOOKING_STATUS_CLS[booking.status] ||
    'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/80';
  const port = booking.boat?.port;
  const locataire = booking.locataire;
  // Une demande n'est actionnable qu'une fois payée par le locataire
  // (empreinte en attente) : la confirmation encaisse, le refus annule.
  const isPaid = booking.payment_status === 'pending';
  const canDecide = booking.status === 'pending' && isPaid;
  const canCancel = booking.status === 'confirmed' && !isPast(booking.end_date);
  const finished = booking.status === 'confirmed' && isPast(booking.end_date);
  const canDispute = (booking.status === 'cancelled' || finished) && !booking.has_open_dispute;
  const canInvoice = booking.status === 'confirmed';
  // Une location terminée peut recevoir l'avis du propriétaire sur le locataire.
  const myReview = booking.my_review;

  return (
    <article className="group min-h-56 overflow-hidden rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl transition-all duration-300 hover:border-brand-soft/60 hover:bg-surface/15 hover:shadow-xl hover:shadow-action/10 motion-safe:hover:-translate-y-1">
      {/* Colonne gauche de la grille : photo à droite ; colonne droite : photo à
          gauche — les photos se font face vers le centre. */}
      <div
        className={`flex min-h-56 flex-col sm:flex-row ${mirrored ? 'xl:flex-row-reverse' : ''}`}
      >
        <SafeImage
          src={booking.boat?.image}
          alt={t('carrousel.boatImageAlt', { name: booking.boat?.name })}
          loading="lazy"
          className="aspect-video w-full object-cover transition-transform duration-500 sm:aspect-auto sm:w-28 sm:self-stretch md:w-36 motion-safe:group-hover:scale-105"
          fallbackClassName="flex aspect-video w-full items-center justify-center bg-surface/5 text-3xl sm:aspect-auto sm:w-28 sm:self-stretch md:w-36"
        />

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <header className="min-w-0">
            <h3 className="truncate text-base font-bold text-on-dark">{booking.boat?.name}</h3>
            {(booking.boat?.type || port) && (
              <p className="mt-0.5 truncate text-xs text-on-dark/60">
                {[booking.boat?.type, port && `${port.name} · ${port.city}`]
                  .filter(Boolean)
                  .join(' — ')}
              </p>
            )}
            {/* Badges toujours sous le nom, jamais à côté. */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {booking.has_open_dispute && (
                <span className="status-indicator status-indicator--warning rounded-full bg-warning-base/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-warning-soft">
                  {t('proprietaireReservations.openDispute')}
                </span>
              )}
              {booking.status === 'pending' && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                    isPaid
                      ? 'status-indicator status-indicator--info bg-action/15 text-action-soft'
                      : 'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/70'
                  }`}
                >
                  {isPaid
                    ? t('proprietaireReservations.paidToValidate')
                    : t('proprietaireReservations.awaitingPayment')}
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${statusCls}`}
              >
                {t(`bookingStatus.${booking.status}`, { defaultValue: booking.status })}
              </span>
            </div>
          </header>

          {locataire && (
            <p className="mt-2 truncate text-xs text-on-dark/70">
              <button
                type="button"
                onClick={() => onViewLocataire(booking)}
                title={t('proprietaireReservations.viewLocataire')}
                className={`rounded font-semibold text-on-dark hover:text-brand-soft hover:underline ${FOCUS_RING}`}
              >
                {locataire.first_name} {locataire.last_name}
              </button>
              {locataire.email && (
                <a
                  href={`mailto:${locataire.email}`}
                  className={`ml-1.5 text-brand-soft hover:underline ${FOCUS_RING}`}
                >
                  {locataire.email}
                </a>
              )}
            </p>
          )}

          {/* Ligne méta mono-ligne tronquée : la hauteur de carte reste fixe. */}
          <p className="mt-1.5 truncate text-sm text-on-dark/90">
            <span className="font-bold text-on-dark">{EURO.format(booking.total_amount ?? 0)}</span>
            <span aria-hidden className="text-on-dark/30">
              {' • '}
            </span>
            <time dateTime={booking.start_date}>{fmtDate(booking.start_date)}</time>
            {' → '}
            <time dateTime={booking.end_date}>{fmtDate(booking.end_date)}</time>
            <span aria-hidden className="text-on-dark/30">
              {' • '}
            </span>
            <span className="text-xs text-on-dark/60">
              {t('proprietaireReservations.bookedOn')}{' '}
              <time dateTime={booking.booking_date}>{fmtDate(booking.booking_date)}</time>
            </span>
          </p>

          {booking.status === 'cancelled' && booking.cancellation_reason && (
            <p
              className="mt-2 truncate rounded-lg bg-surface/10 px-2.5 py-1.5 text-xs text-on-dark/70"
              title={booking.cancellation_reason}
            >
              <span className="font-semibold">
                {t('proprietaireReservations.cancellationLabel')}
              </span>{' '}
              {booking.cancellation_reason}
              {booking.cancellation_date &&
                t('proprietaireReservations.cancellationDate', {
                  date: fmtDate(booking.cancellation_date),
                })}
            </p>
          )}

          {(canDecide || canCancel || canDispute || canInvoice || finished) && (
            <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
              {finished && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onReview(booking)}
                  className={`rounded-full border border-photo-action/50 px-3 py-1 text-xs font-semibold text-photo-action transition hover:bg-photo-action/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {myReview
                    ? t('proprietaireReservations.review.edit')
                    : t('proprietaireReservations.review.add')}
                </button>
              )}
              {myReview && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                    REVIEW_STATUS_CLS[myReview.status] || 'bg-neutral/15 text-on-dark/70'
                  }`}
                >
                  {t(`proprietaireReservations.review.status.${myReview.status}`, {
                    defaultValue: myReview.status,
                  })}
                </span>
              )}
              {canInvoice && (
                <InvoiceButton
                  fetchInvoice={() => getBookingInvoice(booking.id_booking)}
                  label={t('invoice.commissionLabel')}
                  title={t('invoice.commissionTitle', { boat: booking.boat?.name })}
                />
              )}
              {canDecide && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAction(booking, 'confirm')}
                    className={`rounded-full bg-success-deep px-3 py-1 text-xs font-semibold text-on-dark transition hover:bg-success-base disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    {t('proprietaireReservations.confirm')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAction(booking, 'refuse')}
                    className={`rounded-full bg-danger/80 px-3 py-1 text-xs font-semibold text-on-dark transition hover:bg-danger-base disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    {t('proprietaireReservations.refuse')}
                  </button>
                </>
              )}
              {canCancel && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(booking, 'cancel')}
                  className={`rounded-full border border-glass/40 px-3 py-1 text-xs font-semibold text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('proprietaireReservations.cancelBooking')}
                </button>
              )}
              {canDispute && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(booking, 'dispute')}
                  className={`rounded-full border border-warning-base/50 px-3 py-1 text-xs font-semibold text-warning-soft transition hover:bg-warning-base/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('proprietaireReservations.reportProblem')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ProprietaireReservations() {
  const { t } = useTranslation();
  const pageExitNavigate = usePageExitNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  // Modal de décision (refus ou annulation) : { booking, action } | null.
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState('');
  // Photos jointes au signalement : { file, url (aperçu à révoquer) }.
  const [photos, setPhotos] = useState([]);
  // Modal d'avis propriétaire → locataire : { booking } | null.
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const { showToast } = useToast();

  function addPhotos(fileList) {
    // Copie immédiate : la FileList est vidée dès le reset de l'input.
    const entries = Array.from(fileList).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPhotos((prev) => {
      const next = [...prev, ...entries];
      next.slice(5).forEach((p) => URL.revokeObjectURL(p.url));
      return next.slice(0, 5);
    });
  }

  function removePhoto(index) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function closeModal() {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setDecision(null);
  }

  const deciding = decision ? busyId === decision.booking.id_booking : false;

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = t('proprietaireReservations.pageTitle');
  }, [t]);

  useEffect(() => {
    getBookings()
      .then((res) => setBookings(res.data.bookings || []))
      .catch((err) =>
        setError(err.response?.data?.message || t('proprietaireReservations.loadError'))
      )
      .finally(() => setLoading(false));
  }, []);

  // Fermeture de la modal au clavier (Échap), sauf pendant l'envoi.
  useEffect(() => {
    if (!decision) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !deciding) closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [decision, deciding]);

  useEffect(() => {
    if (!reviewModal) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !reviewBusy) setReviewModal(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [reviewModal, reviewBusy]);

  function openReview(booking) {
    setReviewModal(booking);
    setReviewRating(booking.my_review?.rating ?? 0);
    setReviewComment(booking.my_review?.comment ?? '');
  }

  async function submitReview(e) {
    e.preventDefault();
    if (reviewRating < 1 || reviewComment.trim().length < MIN_REVIEW_COMMENT) {
      showToast(t('proprietaireReservations.review.commentTooShort'), 'error');
      return;
    }
    setReviewBusy(true);
    try {
      const { data } = await saveRenterReview(
        reviewModal.id_booking,
        reviewRating,
        reviewComment.trim()
      );
      setBookings((prev) =>
        prev.map((b) =>
          b.id_booking === reviewModal.id_booking ? { ...b, my_review: data.review } : b
        )
      );
      showToast(t('proprietaireReservations.review.saved'), 'success');
      setReviewModal(null);
    } catch (err) {
      showToast(err.response?.data?.message || t('proprietaireReservations.review.error'), 'error');
    } finally {
      setReviewBusy(false);
    }
  }

  async function executeAction(booking, action, actionReason) {
    setBusyId(booking.id_booking);
    try {
      if (action === 'dispute') {
        await reportDispute(
          booking.id_booking,
          actionReason,
          photos.map((p) => p.file)
        );
        setBookings((prev) =>
          prev.map((b) =>
            b.id_booking === booking.id_booking ? { ...b, has_open_dispute: true } : b
          )
        );
        showToast(t('proprietaireReservations.reportSent'), 'success');
        closeModal();
        return;
      }
      const res = await updateBookingStatus(booking.id_booking, action, actionReason);
      const updated = res.data.booking;
      // Le paiement suit la décision : encaissé à la confirmation, annulé
      // (donc plus rien en attente) au refus ou à l'annulation.
      const payment_status = action === 'confirm' ? 'success' : null;
      setBookings((prev) =>
        prev.map((b) =>
          b.id_booking === updated.id_booking ? { ...b, ...updated, payment_status } : b
        )
      );
      const messages = {
        confirm: t('proprietaireReservations.confirmed'),
        refuse: t('proprietaireReservations.refused'),
        cancel: t('proprietaireReservations.cancelled'),
      };
      showToast(messages[action], 'success');
      setDecision(null);
    } catch (err) {
      showToast(err.response?.data?.message || t('proprietaireReservations.genericError'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  function handleAction(booking, action) {
    if (action === 'confirm') {
      executeAction(booking, 'confirm');
      return;
    }
    // Refus et annulation passent par la modal de confirmation.
    setDecision({ booking, action });
    setReason('');
  }

  // Le nom du locataire mène désormais à sa fiche complète (identité, locations,
  // avis) plutôt qu'à une pop-up ; la fiche produit joue sa sortie au passage.
  function viewLocataire(booking) {
    const id = booking.locataire?.id_user;
    if (id) pageExitNavigate(`/locataires/${id}`);
  }

  const filtered = useMemo(
    () =>
      bookings
        .filter((b) => filter === 'all' || b.status === filter)
        .filter((b) => matchesPeriod(b, periodFilter)),
    [bookings, filter, periodFilter]
  );

  return (
    <section aria-labelledby="reservations-title">
      <header className="mb-6">
        <h1 id="reservations-title" className="text-2xl font-bold text-on-dark">
          {t('proprietaireReservations.title')}
        </h1>
        <p className="mt-1 text-sm text-on-dark/70">{t('proprietaireReservations.subtitle')}</p>
      </header>

      {error && (
        <div
          role="alert"
          className="status-indicator status-indicator--danger rounded-lg border border-danger-base/40 bg-danger-base/10 px-4 py-2 text-sm text-danger-soft"
        >
          {error}
        </div>
      )}

      {/* Filtres par statut */}
      <ScrollableFilterRow
        className="mb-3"
        aria-label={t('proprietaireReservations.statusFilterAria')}
        contentKey={FILTER_KEYS.map(
          (key) => `${key}:${t(`proprietaireReservations.filters.${key}`)}`
        ).join('|')}
      >
        {FILTER_KEYS.map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={active}
              className={`shrink-0 snap-start rounded-full px-3 py-1.5 text-sm font-medium transition ${FOCUS_RING} ${
                active
                  ? 'bg-action text-action-text non-color-active'
                  : 'bg-surface/10 text-on-dark/80 hover:bg-surface/20 hover:text-on-dark'
              }`}
            >
              {t(`proprietaireReservations.filters.${key}`)}
            </button>
          );
        })}
      </ScrollableFilterRow>

      {/* Filtres par période (passées / en cours / à venir), cumulables avec le statut */}
      <ScrollableFilterRow
        className="mb-5"
        aria-label={t('proprietaireReservations.periodFilterAria')}
        contentKey={PERIOD_KEYS.map(
          (key) => `${key}:${t(`proprietaireReservations.periods.${key}`)}`
        ).join('|')}
      >
        {PERIOD_KEYS.map((key) => {
          const active = periodFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPeriodFilter(key)}
              aria-pressed={active}
              className={`shrink-0 snap-start rounded-full border px-3 py-1 text-xs font-medium transition ${FOCUS_RING} ${
                active
                  ? 'border-brand-soft bg-brand-soft/15 text-brand-soft non-color-active'
                  : 'border-glass/30 bg-transparent text-on-dark/70 hover:border-glass/50 hover:text-on-dark'
              }`}
            >
              {t(`proprietaireReservations.periods.${key}`)}
            </button>
          );
        })}
      </ScrollableFilterRow>

      {loading ? (
        <CardSkeleton count={4} height="h-56" />
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl px-4 py-8 text-center text-sm text-on-dark/70">
          {bookings.length === 0
            ? t('proprietaireReservations.emptyAll')
            : t('proprietaireReservations.emptyFilter')}
        </p>
      ) : (
        <ul key={`${filter}-${periodFilter}`} className="grid gap-3 xl:grid-cols-2">
          {filtered.map((b, i) => (
            <li
              key={b.id_booking}
              className={`min-w-0 ${i % 2 === 0 ? 'card-enter-from-left' : 'card-enter-from-right'}`}
              style={{ animationDelay: `${Math.min(i, 12) * 70}ms` }}
            >
              <BookingCard
                booking={b}
                busy={busyId === b.id_booking}
                onAction={handleAction}
                onViewLocataire={viewLocataire}
                onReview={openReview}
                mirrored={i % 2 === 0}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Modal : avis du propriétaire sur le locataire d'une location terminée */}
      {reviewModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay/60 p-4"
          onClick={() => !reviewBusy && setReviewModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="renter-review-title"
            className="w-full max-w-md rounded-2xl border border-glass/20 bg-surface/10 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="renter-review-title" className="text-lg font-semibold text-on-dark">
              {t('proprietaireReservations.review.title')}
            </h2>
            <p className="mt-1 text-sm text-on-dark/70">
              {reviewModal.locataire &&
                `${reviewModal.locataire.first_name} ${reviewModal.locataire.last_name} — `}
              {reviewModal.boat?.name}
            </p>

            <form onSubmit={submitReview} className="mt-4 flex flex-col gap-2">
              <span className="text-xs font-medium text-on-dark/70">
                {t('proprietaireReservations.review.ratingLabel')}
              </span>
              <StarRatingInput value={reviewRating} onChange={setReviewRating} />
              <label
                htmlFor="renter-review-comment"
                className="mt-1 text-xs font-medium text-on-dark/70"
              >
                {t('proprietaireReservations.review.commentLabel')}
              </label>
              <textarea
                id="renter-review-comment"
                rows={4}
                value={reviewComment}
                maxLength={1000}
                autoFocus
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={t('proprietaireReservations.review.commentPlaceholder')}
                className="w-full rounded-lg border border-glass/30 bg-surface/10 px-3 py-2 text-sm text-on-dark outline-none focus:border-brand-soft"
              />
              <p className="text-xs text-on-dark/60">
                {t('proprietaireReservations.review.pendingNotice')}
              </p>
              <div className="mt-3 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={() => setReviewModal(null)}
                  className={`rounded-full border border-glass/40 px-4 py-2 text-sm font-semibold text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('proprietaireReservations.review.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={reviewBusy}
                  className={`rounded-full bg-action px-4 py-2 text-sm font-semibold text-action-text transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
                >
                  {reviewBusy
                    ? t('proprietaireReservations.review.saving')
                    : t('proprietaireReservations.review.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de refus / annulation */}
      {decision && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay/60 p-4"
          onClick={() => !deciding && closeModal()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-title"
            className="w-full max-w-md rounded-2xl border border-glass/20 bg-surface/10 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="decision-title" className="text-lg font-semibold text-on-dark">
              {decision.action === 'refuse'
                ? t('proprietaireReservations.modal.refuseTitle')
                : decision.action === 'dispute'
                  ? t('proprietaireReservations.modal.disputeTitle')
                  : t('proprietaireReservations.modal.cancelTitle')}
            </h2>
            <p className="mt-1 text-sm text-on-dark/70">
              {decision.booking.boat?.name}
              {decision.booking.locataire &&
                ` — ${decision.booking.locataire.first_name} ${decision.booking.locataire.last_name}`}
              {t('proprietaireReservations.modal.range', {
                start: fmtDate(decision.booking.start_date),
                end: fmtDate(decision.booking.end_date),
              })}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (decision.action === 'dispute' && !reason.trim()) {
                  showToast(t('proprietaireReservations.describeProblemError'), 'error');
                  return;
                }
                executeAction(decision.booking, decision.action, reason.trim() || undefined);
              }}
            >
              {(decision.action === 'cancel' || decision.action === 'dispute') && (
                <>
                  <label
                    htmlFor="cancel-reason"
                    className="mb-1 mt-4 block text-xs font-medium text-on-dark/70"
                  >
                    {decision.action === 'dispute'
                      ? t('proprietaireReservations.modal.describeProblem')
                      : t('proprietaireReservations.modal.cancelReasonLabel')}
                  </label>
                  <textarea
                    id="cancel-reason"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    autoFocus
                    placeholder={
                      decision.action === 'dispute'
                        ? t('proprietaireReservations.modal.disputePlaceholder')
                        : t('proprietaireReservations.modal.cancelPlaceholder')
                    }
                    aria-describedby="cancel-reason-hint"
                    className="w-full rounded-lg border border-glass/30 bg-surface/10 px-3 py-2 text-sm text-on-dark placeholder-on-dark outline-none focus:border-brand-soft"
                  />
                </>
              )}
              {decision.action === 'dispute' && (
                <div className="mt-3">
                  <span className="mb-1 block text-xs font-medium text-on-dark/70">
                    {t('proprietaireReservations.modal.photosLabel')}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {photos.map((p, i) => (
                      <div key={p.url} className="relative">
                        <img
                          src={p.url}
                          alt=""
                          className="h-14 w-14 rounded-lg border border-glass/30 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label={t('proprietaireReservations.modal.removePhoto')}
                          className={`absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface/20 text-xs text-on-dark hover:bg-danger-base ${FOCUS_RING}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {photos.length < 5 && (
                      <label
                        className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-lg border border-dashed border-glass/40 text-xl text-on-dark/70 transition hover:border-brand-soft hover:text-brand-soft ${FOCUS_RING}`}
                        title={t('proprietaireReservations.modal.addPhotos')}
                      >
                        +
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="sr-only"
                          onChange={(e) => {
                            addPhotos(e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              <p id="cancel-reason-hint" className="mt-2 text-xs text-on-dark/60">
                {decision.action === 'refuse'
                  ? t('proprietaireReservations.modal.refuseNotice')
                  : decision.action === 'dispute'
                    ? t('proprietaireReservations.modal.disputeNotice')
                    : t('proprietaireReservations.modal.cancelNotice')}
              </p>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={deciding}
                  onClick={closeModal}
                  className={`rounded-full border border-glass/40 px-4 py-2 text-sm font-semibold text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('proprietaireReservations.modal.back')}
                </button>
                <button
                  type="submit"
                  disabled={deciding}
                  className={`rounded-full bg-danger/80 px-4 py-2 text-sm font-semibold text-on-dark transition hover:bg-danger-base disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
                >
                  {deciding
                    ? t('proprietaireReservations.modal.sending')
                    : decision.action === 'refuse'
                      ? t('proprietaireReservations.modal.refuseTitle')
                      : decision.action === 'dispute'
                        ? t('proprietaireReservations.modal.sendReport')
                        : t('proprietaireReservations.modal.confirmCancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProprietaireReservations;
