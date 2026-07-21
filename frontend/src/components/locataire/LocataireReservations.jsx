import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getBookings,
  cancelBooking,
  requestRefund,
  reportDispute,
} from '../../services/locataireService.js';
import { useToast } from '../../hooks/useToast.jsx';
import CardSkeleton from '../common/CardSkeleton.jsx';
import { formatDate } from '../../utils/formatDate.js';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const DATE_OPTS = { day: 'numeric', month: 'short', year: 'numeric' };

function getBookingStatus(t) {
  return {
    pending: { label: t('bookingStatus.pending'), cls: 'bg-amber-500/15 text-amber-300' },
    confirmed: { label: t('bookingStatus.confirmed'), cls: 'bg-emerald-500/15 text-emerald-300' },
    refused: { label: t('bookingStatus.refused'), cls: 'bg-red-500/15 text-red-300' },
    cancelled: { label: t('bookingStatus.cancelled'), cls: 'bg-slate-500/15 text-white/80' },
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
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

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
    cls: 'bg-slate-500/15 text-white/80',
  };
  const port = booking.boat?.port;
  const showReviewHint = booking.status === 'confirmed' && isPast(booking.end_date);

  // Sous-état de paiement affiché à côté du statut.
  const paymentBadge =
    booking.status === 'pending' && booking.payment?.status === 'pending'
      ? { label: t('locataireReservations.paymentBadge.paid'), cls: 'bg-sky-500/15 text-sky-300' }
      : booking.refund_requested
        ? {
            label: t('locataireReservations.paymentBadge.disputeOpen'),
            cls: 'bg-amber-500/15 text-amber-300',
          }
        : booking.payment?.status === 'refunded' && booking.payment?.refunded_amount != null
          ? {
              label: t('locataireReservations.paymentBadge.refunded'),
              cls: 'bg-emerald-500/15 text-emerald-300',
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

  return (
    <article className="group h-52 overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl transition-all duration-300 hover:border-[#5AB4EC]/60 hover:bg-white/15 hover:shadow-xl hover:shadow-sky-500/10 motion-safe:hover:-translate-y-1">
      {/* Colonne gauche de la grille : photo à droite ; colonne droite : photo à
          gauche — les photos se font face vers le centre. */}
      <div className={`flex h-full ${mirrored ? 'xl:flex-row-reverse' : ''}`}>
        {booking.boat?.image ? (
          <img
            src={booking.boat.image}
            alt={`Bateau ${booking.boat?.name}`}
            loading="lazy"
            className="hidden w-28 self-stretch object-cover transition-transform duration-500 sm:block md:w-36 motion-safe:group-hover:scale-105"
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <header className="min-w-0">
            <h3 className="truncate text-base font-bold text-white">
              <Link
                to={boatLink}
                className={`transition hover:text-[#ABD4FF] hover:underline ${FOCUS_RING}`}
                title={t('locataireReservations.viewProduct')}
              >
                {booking.boat?.name}
              </Link>
            </h3>
            {(booking.boat?.type || port) && (
              <p className="mt-0.5 truncate text-xs text-white/60">
                {[booking.boat?.type, port && `${port.name} · ${port.city}`]
                  .filter(Boolean)
                  .join(' — ')}
              </p>
            )}
            {/* Badges toujours sous le nom, jamais à côté. */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {paymentBadge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${paymentBadge.cls}`}
                >
                  {paymentBadge.label}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
                {meta.label}
              </span>
            </div>
          </header>

          {/* Ligne méta mono-ligne tronquée : la hauteur de carte reste fixe. */}
          <p className="mt-2.5 truncate text-sm text-white/90">
            <span className="font-bold text-white">{EURO.format(booking.total_amount ?? 0)}</span>
            <span aria-hidden className="text-white/30">
              {' • '}
            </span>
            <time dateTime={booking.start_date}>{fmtDate(booking.start_date)}</time>
            {' → '}
            <time dateTime={booking.end_date}>{fmtDate(booking.end_date)}</time>
            <span aria-hidden className="text-white/30">
              {' • '}
            </span>
            <span className="text-xs text-white/60">
              {t('locataireReservations.bookedOn')}{' '}
              <time dateTime={booking.booking_date}>{fmtDate(booking.booking_date)}</time>
            </span>
          </p>

          {booking.status === 'cancelled' && booking.cancellation_reason && (
            <p
              className="mt-2 truncate rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white/70"
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

          {showReviewHint && (
            <p className="mt-2 truncate text-xs font-medium text-[#5AB4EC]">
              {booking.reviewed
                ? t('locataireReservations.reviewDone')
                : t('locataireReservations.reviewHint')}
            </p>
          )}

          {(canCancel || canRefund || canDispute) && (
            <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
              {canCancel && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(booking, 'cancel')}
                  className={`rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('locataireReservations.actions.cancel')}
                </button>
              )}
              {canRefund && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(booking, 'refund')}
                  className={`rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('locataireReservations.actions.refund')}
                </button>
              )}
              {canDispute && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(booking, 'dispute')}
                  className={`rounded-full border border-amber-500/50 px-3 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
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

  function handleAction(booking, action) {
    setDecision({ booking, action });
    setReason('');
    setReasonError('');
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
        <h1 id="reservations-title" className="text-2xl font-bold text-white">
          {t('locataireReservations.title')}
        </h1>
        <p className="mt-1 text-sm text-white/70">{t('locataireReservations.subtitle')}</p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {/* Filtres par statut */}
      <div
        className="mb-3 flex flex-wrap gap-2"
        role="group"
        aria-label={t('locataireReservations.filterAria')}
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

      {/* Filtres par période (passées / en cours / à venir), cumulables avec le statut */}
      <div
        className="mb-5 flex flex-wrap gap-2"
        role="group"
        aria-label={t('locataireReservations.periodFilterAria')}
      >
        {periodFilters.map((f) => {
          const active = periodFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setPeriodFilter(f.key)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${FOCUS_RING} ${
                active
                  ? 'border-[#5AB4EC] bg-[#5AB4EC]/15 text-[#ABD4FF]'
                  : 'border-white/30 bg-transparent text-white/70 hover:border-white/50 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <CardSkeleton count={4} height="h-52" />
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-8 text-center text-sm text-white/70">
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

      {/* Modal d'annulation / demande de remboursement */}
      {decision && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !deciding && closeModal()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="locataire-decision-title"
            className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="locataire-decision-title" className="text-lg font-semibold text-white">
              {decision.action === 'cancel'
                ? t('locataireReservations.modal.cancelTitle')
                : decision.action === 'refund'
                  ? t('locataireReservations.modal.refundTitle')
                  : t('locataireReservations.modal.disputeTitle')}
            </h2>
            <p className="mt-1 text-sm text-white/70">
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
                className="mb-1 mt-4 block text-xs font-medium text-white/70"
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
                className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-[#5AB4EC]"
              />
              {reasonError && (
                <p role="alert" className="mt-1 text-xs text-red-400">
                  {reasonError}
                </p>
              )}

              {decision.action === 'dispute' && (
                <div className="mt-3">
                  <span className="mb-1 block text-xs font-medium text-white/70">
                    {t('locataireReservations.modal.disputePhotosLabel')}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {photos.map((p, i) => (
                      <div key={p.url} className="relative">
                        <img
                          src={p.url}
                          alt=""
                          className="h-14 w-14 rounded-lg border border-white/30 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label={t('locataireReservations.modal.disputeRemovePhoto')}
                          className={`absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs text-white hover:bg-red-500 ${FOCUS_RING}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {photos.length < 5 && (
                      <label
                        className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/40 text-xl text-white/70 transition hover:border-[#5AB4EC] hover:text-[#5AB4EC] ${FOCUS_RING}`}
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
              <p id="locataire-decision-hint" className="mt-2 text-xs text-white/60">
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
                  className={`rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('locataireReservations.modal.back')}
                </button>
                <button
                  type="submit"
                  disabled={deciding}
                  className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING} ${
                    decision.action === 'cancel'
                      ? 'bg-red-600/80 hover:bg-red-500'
                      : 'bg-sky-500 hover:bg-sky-600'
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
