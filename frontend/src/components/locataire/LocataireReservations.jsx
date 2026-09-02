import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaStar } from 'react-icons/fa';
import {
  getBookings,
  cancelBooking,
  requestRefund,
  reportDispute,
  createBookingReview,
  getBookingInvoice,
} from '../../services/locataireService.js';
import { useToast } from '../../hooks/useToast.jsx';
import CardSkeleton from '../common/CardSkeleton.jsx';
import InvoiceButton from '../common/InvoiceButton.jsx';
import { formatDate } from '../../utils/formatDate.js';
import SafeImage from '../common/SafeImage.jsx';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const DATE_OPTS = { day: 'numeric', month: 'short', year: 'numeric' };

function getBookingStatus(t) {
  return {
    pending: {
      label: t('bookingStatus.pending'),
      cls: 'status-indicator status-indicator--warning bg-warning-base/15 text-warning-soft',
    },
    confirmed: {
      label: t('bookingStatus.confirmed'),
      cls: 'status-indicator status-indicator--success bg-success-base/15 text-success-soft',
    },
    refused: {
      label: t('bookingStatus.refused'),
      cls: 'status-indicator status-indicator--danger bg-danger-base/15 text-danger-soft',
    },
    cancelled: {
      label: t('bookingStatus.cancelled'),
      cls: 'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/80',
    },
  };
}

function getFilters(t) {
  return [
    { key: 'all', label: t('locataireReservations.filters.all') },
    { key: 'pending', label: t('locataireReservations.filters.pending') },
    { key: 'confirmed', label: t('locataireReservations.filters.confirmed') },
    { key: 'cancelled', label: t('locataireReservations.filters.cancelled') },
    { key: 'refused', label: t('locataireReservations.filters.refused') },
  ];
}

function getPeriodFilters(t) {
  return [
    { key: 'all', label: t('locataireReservations.periodFilters.all') },
    { key: 'upcoming', label: t('locataireReservations.periodFilters.upcoming') },
    { key: 'current', label: t('locataireReservations.periodFilters.current') },
    { key: 'past', label: t('locataireReservations.periodFilters.past') },
  ];
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

// Annulable uniquement avant le début du séjour (même règle que le backend).
function startsAfterToday(value) {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return start > today;
}

function BookingCard({ booking, busy, onAction, mirrored }) {
  const { t } = useTranslation();
  const boatLink = booking.boat?.id_boat != null ? `/product/${booking.boat.id_boat}` : '/product';
  const meta = getBookingStatus(t)[booking.status] || {
    label: booking.status,
    cls: 'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/80',
  };
  const port = booking.boat?.port;

  // Sous-état de paiement affiché à côté du statut.
  const paymentBadge =
    booking.status === 'pending' && booking.payment?.status === 'pending'
      ? {
          label: t('locataireReservations.paymentBadge.paid'),
          cls: 'status-indicator status-indicator--info bg-action/15 text-action-soft',
        }
      : booking.refund_requested
        ? {
            label: t('locataireReservations.paymentBadge.disputeOpen'),
            cls: 'status-indicator status-indicator--warning bg-warning-base/15 text-warning-soft',
          }
        : booking.payment?.status === 'refunded' && booking.payment?.refunded_amount != null
          ? {
              label: t('locataireReservations.paymentBadge.refunded'),
              cls: 'status-indicator status-indicator--success bg-success-base/15 text-success-soft',
            }
          : null;

  // Annulation possible avant le séjour ; demande de remboursement réservée aux
  // annulées dont le paiement encaissé n'a pas été remboursé automatiquement.
  const canCancel =
    (booking.status === 'pending' || booking.status === 'confirmed') &&
    startsAfterToday(booking.start_date);
  const canRefund =
    booking.status === 'cancelled' &&
    booking.payment?.status === 'success' &&
    !booking.refund_requested;
  const finished = booking.status === 'confirmed' && isPast(booking.end_date);
  const canDispute =
    (booking.status === 'cancelled' || finished) && !booking.refund_requested && !canRefund;
  const canReview = finished && !booking.reviewed;
  const canInvoice = booking.status === 'confirmed';

  return (
    <article className="group min-h-52 overflow-hidden rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl transition-all duration-300 hover:border-brand/60 hover:bg-surface/15 hover:shadow-xl hover:shadow-action/10 motion-safe:hover:-translate-y-1">
      {/* Colonne gauche de la grille : photo à droite ; colonne droite : photo à
          gauche — les photos se font face vers le centre. */}
      <div
        className={`flex min-h-52 flex-col sm:flex-row ${mirrored ? 'xl:flex-row-reverse' : ''}`}
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
            <h3 className="truncate text-base font-bold text-on-dark">
              <Link
                to={boatLink}
                state={
                  finished && !booking.reviewed
                    ? { reviewBookingId: booking.id_booking }
                    : undefined
                }
                className={`transition hover:text-brand-soft hover:underline ${FOCUS_RING}`}
                title={t('locataireReservations.viewProduct')}
              >
                {booking.boat?.name}
              </Link>
            </h3>
            {(booking.boat?.type || port) && (
              <p className="mt-0.5 truncate text-xs text-on-dark/60">
                {[booking.boat?.type, port && `${port.name} · ${port.city}`]
                  .filter(Boolean)
                  .join(' — ')}
              </p>
            )}
            {/* Badges toujours sous le nom, jamais à côté. */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {paymentBadge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${paymentBadge.cls}`}
                >
                  {paymentBadge.label}
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${meta.cls}`}
              >
                {meta.label}
              </span>
            </div>
          </header>

          {/* Ligne méta mono-ligne tronquée : la hauteur de carte reste fixe. */}
          <p className="mt-2.5 truncate text-sm text-on-dark/90">
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
              {t('locataireReservations.bookedOn')}{' '}
              <time dateTime={booking.booking_date}>{fmtDate(booking.booking_date)}</time>
            </span>
          </p>

          {booking.status === 'cancelled' && booking.cancellation_reason && (
            <p
              className="mt-2 truncate rounded-lg bg-surface/10 px-2.5 py-1.5 text-xs text-on-dark/70"
              title={booking.cancellation_reason}
            >
              <span className="font-semibold">{t('locataireReservations.cancellation')}</span>{' '}
              {booking.cancellation_reason}
              {booking.cancellation_date &&
                ` ${t('locataireReservations.cancelledOn', {
                  date: fmtDate(booking.cancellation_date),
                })}`}
            </p>
          )}

          {finished && (
            <p className="mt-2 truncate text-xs font-medium text-brand">
              {booking.reviewed
                ? t('locataireReservations.reviewDone')
                : t('locataireReservations.reviewHint')}
            </p>
          )}

          {(canCancel || canRefund || canDispute || canReview || canInvoice) && (
            <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
              {canInvoice && (
                <InvoiceButton
                  fetchInvoice={() => getBookingInvoice(booking.id_booking)}
                  label={t('invoice.rentalLabel')}
                  title={t('invoice.rentalTitle', { boat: booking.boat?.name })}
                />
              )}
              {canReview && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(booking, 'review')}
                  className={`inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-on-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  <FaStar aria-hidden className="text-[0.6875rem]" />
                  {t('locataireReservations.actions.review')}
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(booking, 'cancel')}
                  className={`rounded-full border border-glass/40 px-3 py-1 text-xs font-semibold text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('locataireReservations.actions.cancel')}
                </button>
              )}
              {canRefund && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(booking, 'refund')}
                  className={`rounded-full bg-action px-3 py-1 text-xs font-semibold text-on-dark transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('locataireReservations.actions.refund')}
                </button>
              )}
              {canDispute && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(booking, 'dispute')}
                  className={`rounded-full border border-warning-base/50 px-3 py-1 text-xs font-semibold text-warning-soft transition hover:bg-warning-base/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('locataireReservations.actions.dispute')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function LocataireReservations() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  // Modal d'annulation ou de demande de remboursement : { booking, action } | null.
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  // Photos jointes au signalement : { file, url (aperçu à révoquer) }.
  const [photos, setPhotos] = useState([]);
  // Modal d'avis : booking noté + note/commentaire saisis.
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
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
  const filters = useMemo(() => getFilters(t), [t]);
  const periodFilters = useMemo(() => getPeriodFilters(t), [t]);

  const deciding = decision ? busyId === decision.booking.id_booking : false;

  useEffect(() => {
    document.title = t('locataireReservations.pageTitle');
  }, [t]);

  const loadBookings = useCallback(() => {
    return getBookings()
      .then((res) => setBookings(res.data.bookings || []))
      .catch((err) =>
        setError(err.response?.data?.message || t('locataireReservations.loadError'))
      );
  }, [t]);

  useEffect(() => {
    loadBookings().finally(() => setLoading(false));
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
    if (!reviewBooking) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && busyId !== reviewBooking.id_booking) setReviewBooking(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [reviewBooking, busyId]);

  function handleAction(booking, action) {
    if (action === 'review') {
      setReviewBooking(booking);
      setReviewRating(0);
      setReviewComment('');
      setReviewError('');
      return;
    }
    setDecision({ booking, action });
    setReason('');
    setReasonError('');
  }

  function closeReviewModal() {
    if (reviewBooking && busyId === reviewBooking.id_booking) return;
    setReviewBooking(null);
    setReviewRating(0);
    setReviewComment('');
    setReviewError('');
  }

  async function submitReview() {
    const cleanComment = reviewComment.trim();
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError(t('locataireReservations.reviewModal.ratingRequired'));
      return;
    }
    if (cleanComment.length < 10) {
      setReviewError(t('locataireReservations.reviewModal.commentTooShort'));
      return;
    }

    setBusyId(reviewBooking.id_booking);
    setReviewError('');
    try {
      await createBookingReview(reviewBooking.id_booking, reviewRating, cleanComment);
      await loadBookings();
      showToast(t('locataireReservations.toasts.reviewSubmitted'), 'success');
      setReviewBooking(null);
      setReviewRating(0);
      setReviewComment('');
    } catch (err) {
      setReviewError(err.response?.data?.message || t('locataireReservations.toasts.reviewError'));
    } finally {
      setBusyId(null);
    }
  }

  async function executeDecision() {
    const { booking, action } = decision;
    const cleanReason = reason.trim();
    if (action !== 'cancel' && !cleanReason) {
      setReasonError(t('locataireReservations.modal.refundReasonRequired'));
      return;
    }
    setBusyId(booking.id_booking);
    try {
      if (action === 'cancel') {
        await cancelBooking(booking.id_booking, cleanReason || undefined);
        showToast(
          booking.payment?.status === 'success'
            ? t('locataireReservations.toasts.cancelledRefunded')
            : t('locataireReservations.toasts.cancelled'),
          'success'
        );
      } else if (action === 'refund') {
        await requestRefund(booking.id_booking, cleanReason);
        showToast(t('locataireReservations.toasts.refundRequested'), 'success');
      } else {
        await reportDispute(
          booking.id_booking,
          cleanReason,
          photos.map((p) => p.file)
        );
        showToast(t('locataireReservations.toasts.disputeSent'), 'success');
      }
      // Statuts, badges et boutons dépendent du paiement : on recharge la liste.
      await loadBookings();
      closeModal();
    } catch (err) {
      showToast(err.response?.data?.message || t('locataireReservations.toasts.error'), 'error');
    } finally {
      setBusyId(null);
    }
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
          {t('locataireReservations.title')}
        </h1>
        <p className="mt-1 text-sm text-on-dark/70">{t('locataireReservations.subtitle')}</p>
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
        ariaLabel={t('locataireReservations.filterAria')}
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
                  ? 'bg-action text-on-dark'
                  : 'bg-surface/10 text-on-dark/80 hover:bg-surface/20 hover:text-on-dark'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </ScrollableFilterRow>

      {/* Filtres par période (passées / en cours / à venir), cumulables avec le statut */}
      <ScrollableFilterRow
        className="mb-5"
        ariaLabel={t('locataireReservations.periodFilterAria')}
        contentKey={periodFilters.map((f) => `${f.key}:${f.label}`).join('|')}
      >
        {periodFilters.map((f) => {
          const active = periodFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setPeriodFilter(f.key)}
              aria-pressed={active}
              className={`shrink-0 snap-start rounded-full border px-3 py-1 text-xs font-medium transition ${FOCUS_RING} ${
                active
                  ? 'border-brand bg-brand/15 text-brand-soft'
                  : 'border-glass/30 bg-transparent text-on-dark/70 hover:border-glass/50 hover:text-on-dark'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </ScrollableFilterRow>

      {loading ? (
        <CardSkeleton count={4} height="h-52" />
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl px-4 py-8 text-center text-sm text-on-dark/70">
          {bookings.length === 0
            ? t('locataireReservations.emptyAll')
            : t('locataireReservations.emptyFiltered')}
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
                mirrored={i % 2 === 0}
              />
            </li>
          ))}
        </ul>
      )}

      {reviewBooking && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay/60 p-4"
          onClick={closeReviewModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="locataire-review-title"
            className="w-full max-w-md rounded-2xl border border-glass/20 bg-dark-surface/90 p-5 shadow-2xl backdrop-blur-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="locataire-review-title" className="text-lg font-semibold text-on-dark">
              {t('locataireReservations.reviewModal.title')}
            </h2>
            <p className="mt-1 text-sm text-on-dark/70">
              {reviewBooking.boat?.name}, {fmtDate(reviewBooking.start_date)} →{' '}
              {fmtDate(reviewBooking.end_date)}.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitReview();
              }}
            >
              <fieldset className="mt-5">
                <legend className="mb-2 text-xs font-medium text-on-dark/70">
                  {t('locataireReservations.reviewModal.ratingLabel')}
                </legend>
                <div className="flex gap-2" role="radiogroup">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={reviewRating === value}
                      aria-label={t('locataireReservations.reviewModal.starLabel', {
                        count: value,
                      })}
                      onClick={() => {
                        setReviewRating(value);
                        setReviewError('');
                      }}
                      className={`text-3xl leading-none transition hover:scale-110 ${
                        value <= reviewRating ? 'text-warning-soft' : 'text-on-dark/25'
                      } ${FOCUS_RING}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </fieldset>

              <label
                htmlFor="locataire-review-comment"
                className="mb-1 mt-5 block text-xs font-medium text-on-dark/70"
              >
                {t('locataireReservations.reviewModal.commentLabel')}
              </label>
              <textarea
                id="locataire-review-comment"
                rows={5}
                maxLength={1000}
                value={reviewComment}
                onChange={(e) => {
                  setReviewComment(e.target.value);
                  setReviewError('');
                }}
                placeholder={t('locataireReservations.reviewModal.commentPlaceholder')}
                className="w-full resize-y rounded-lg border border-glass/30 bg-surface/10 px-3 py-2 text-sm text-on-dark placeholder-on-dark/40 outline-none focus:border-brand"
              />
              <div className="mt-1 flex items-start justify-between gap-3">
                <p className="text-xs text-on-dark/50">
                  {t('locataireReservations.reviewModal.moderationHint')}
                </p>
                <span className="shrink-0 text-xs text-on-dark/50">
                  {reviewComment.length}/1000
                </span>
              </div>

              {reviewError && (
                <p role="alert" className="mt-2 text-xs font-medium text-danger-soft">
                  {reviewError}
                </p>
              )}

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={busyId === reviewBooking.id_booking}
                  onClick={closeReviewModal}
                  className={`rounded-full border border-glass/40 px-4 py-2 text-sm font-semibold text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('locataireReservations.reviewModal.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={busyId === reviewBooking.id_booking}
                  className={`rounded-full bg-brand px-4 py-2 text-sm font-semibold text-dark-strong transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
                >
                  {busyId === reviewBooking.id_booking
                    ? t('locataireReservations.reviewModal.submitting')
                    : t('locataireReservations.reviewModal.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'annulation / demande de remboursement */}
      {decision && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay/60 p-4"
          onClick={() => !deciding && closeModal()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="locataire-decision-title"
            className="w-full max-w-md rounded-2xl border border-glass/20 bg-surface/10 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="locataire-decision-title" className="text-lg font-semibold text-on-dark">
              {decision.action === 'cancel'
                ? t('locataireReservations.modal.cancelTitle')
                : decision.action === 'refund'
                  ? t('locataireReservations.modal.refundTitle')
                  : t('locataireReservations.modal.disputeTitle')}
            </h2>
            <p className="mt-1 text-sm text-on-dark/70">
              {decision.booking.boat?.name}, {fmtDate(decision.booking.start_date)} →{' '}
              {fmtDate(decision.booking.end_date)}.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeDecision();
              }}
            >
              <label
                htmlFor="locataire-decision-reason"
                className="mb-1 mt-4 block text-xs font-medium text-on-dark/70"
              >
                {decision.action === 'cancel'
                  ? t('locataireReservations.modal.cancelReasonLabel')
                  : decision.action === 'refund'
                    ? t('locataireReservations.modal.refundReasonLabel')
                    : t('locataireReservations.modal.disputeReasonLabel')}
              </label>
              <textarea
                id="locataire-decision-reason"
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReasonError('');
                }}
                autoFocus
                aria-describedby="locataire-decision-hint"
                aria-invalid={reasonError ? true : undefined}
                className="w-full rounded-lg border border-glass/30 bg-surface/10 px-3 py-2 text-sm text-on-dark placeholder-on-dark/40 outline-none focus:border-brand"
              />
              {reasonError && (
                <p role="alert" className="mt-1 text-xs text-danger-bright">
                  {reasonError}
                </p>
              )}

              {decision.action === 'dispute' && (
                <div className="mt-3">
                  <span className="mb-1 block text-xs font-medium text-on-dark/70">
                    {t('locataireReservations.modal.disputePhotosLabel')}
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
                          aria-label={t('locataireReservations.modal.disputeRemovePhoto')}
                          className={`absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-dark-muted text-xs text-on-dark hover:bg-danger-base ${FOCUS_RING}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {photos.length < 5 && (
                      <label
                        className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-lg border border-dashed border-glass/40 text-xl text-on-dark/70 transition hover:border-brand hover:text-brand ${FOCUS_RING}`}
                        title={t('locataireReservations.modal.disputeAddPhotos')}
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
              <p id="locataire-decision-hint" className="mt-2 text-xs text-on-dark/60">
                {decision.action === 'refund'
                  ? t('locataireReservations.modal.refundHint')
                  : decision.action === 'dispute'
                    ? t('locataireReservations.modal.disputeHint')
                    : decision.booking.payment?.status === 'success'
                      ? t('locataireReservations.modal.cancelHintPaid')
                      : decision.booking.payment?.status === 'pending'
                        ? t('locataireReservations.modal.cancelHintHold')
                        : t('locataireReservations.modal.cancelHintNone')}
              </p>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={deciding}
                  onClick={closeModal}
                  className={`rounded-full border border-glass/40 px-4 py-2 text-sm font-semibold text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('locataireReservations.modal.back')}
                </button>
                <button
                  type="submit"
                  disabled={deciding}
                  className={`rounded-full px-4 py-2 text-sm font-semibold text-on-dark transition disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING} ${
                    decision.action === 'cancel'
                      ? 'bg-danger/80 hover:bg-danger-base'
                      : 'bg-action hover:bg-action-hover'
                  }`}
                >
                  {deciding
                    ? t('locataireReservations.modal.working')
                    : decision.action === 'cancel'
                      ? t('locataireReservations.modal.confirmCancel')
                      : decision.action === 'refund'
                        ? t('locataireReservations.modal.submitRefund')
                        : t('locataireReservations.modal.submitDispute')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default LocataireReservations;
