import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBookings, cancelBooking, requestRefund } from '../../services/locataireService.js';
import { useToast } from '../../hooks/useToast.jsx';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

function getBookingStatus(t) {
  return {
    pending: { label: t('bookingStatus.pending'), cls: 'bg-amber-500/15 text-amber-300' },
    confirmed: { label: t('bookingStatus.confirmed'), cls: 'bg-emerald-500/15 text-emerald-300' },
    refused: { label: t('bookingStatus.refused'), cls: 'bg-red-500/15 text-red-300' },
    cancelled: { label: t('bookingStatus.cancelled'), cls: 'bg-slate-500/15 text-slate-300' },
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
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

function fmtDate(value) {
  return value ? DATE.format(new Date(value)) : '';
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

function BookingCard({ booking, busy, onAction }) {
  const { t } = useTranslation();
  const boatLink = booking.boat?.id_boat != null ? `/product/${booking.boat.id_boat}` : '/product';
  const meta = getBookingStatus(t)[booking.status] || {
    label: booking.status,
    cls: 'bg-slate-500/15 text-slate-300',
  };
  const port = booking.boat?.port;
  const showReviewHint = booking.status === 'confirmed' && isPast(booking.end_date);

  // Sous-état de paiement affiché à côté du statut.
  const paymentBadge =
    booking.status === 'pending' && booking.payment?.status === 'pending'
      ? { label: t('locataireReservations.paymentBadge.paid'), cls: 'bg-sky-500/15 text-sky-300' }
      : booking.refund_requested
        ? {
            label: t('locataireReservations.paymentBadge.refundRequested'),
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

  const cardContent = (
    <article className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 transition hover:border-slate-600 hover:bg-slate-900">
      <div className="flex flex-col sm:flex-row">
        {booking.boat?.image ? (
          <img
            src={booking.boat.image}
            alt={`Bateau ${booking.boat?.name}`}
            loading="lazy"
            className="h-40 w-full object-cover sm:h-auto sm:w-48"
          />
        ) : null}

        <div className="flex-1 p-5">
          <header className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white">{booking.boat?.name}</h3>

              {(booking.boat?.type || port) && (
                <p className="mt-0.5 text-sm text-slate-400">
                  {[booking.boat?.type, port && `${port.name} · ${port.city}`]
                    .filter(Boolean)
                    .join(' — ')}
                </p>
              )}

              <p className="mt-2 text-sm font-semibold text-[#5AB4EC] transition group-hover:text-[#ABD4FF]">
                {t('locataireReservations.viewProduct')}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
              {paymentBadge && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentBadge.cls}`}
                >
                  {paymentBadge.label}
                </span>
              )}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
                {meta.label}
              </span>
            </div>
          </header>

          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-slate-400">{t('locataireReservations.dates')}</dt>
              <dd className="font-medium text-slate-100">
                <time dateTime={booking.start_date}>{fmtDate(booking.start_date)}</time> →{' '}
                <time dateTime={booking.end_date}>{fmtDate(booking.end_date)}</time>
              </dd>
            </div>

            <div>
              <dt className="text-slate-400">{t('locataireReservations.amount')}</dt>
              <dd className="font-medium text-slate-100">
                {EURO.format(booking.total_amount ?? 0)}
              </dd>
            </div>

            <div>
              <dt className="text-slate-400">{t('locataireReservations.bookedOn')}</dt>
              <dd className="font-medium text-slate-100">
                <time dateTime={booking.booking_date}>{fmtDate(booking.booking_date)}</time>
              </dd>
            </div>
          </dl>

          {booking.status === 'cancelled' && booking.cancellation_reason && (
            <p className="mt-3 rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-slate-300">
              <span className="font-semibold">{t('locataireReservations.cancellation')}</span>{' '}
              {booking.cancellation_reason}
              {booking.cancellation_date &&
                ` ${t('locataireReservations.cancelledOn', {
                  date: fmtDate(booking.cancellation_date),
                })}`}
            </p>
          )}

          {showReviewHint && (
            <p className="mt-3 text-xs font-medium text-[#5AB4EC]">
              {booking.reviewed
                ? t('locataireReservations.reviewDone')
                : t('locataireReservations.reviewHint')}
            </p>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <div>
      <Link
        to={boatLink}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        {cardContent}
      </Link>
      {/* Actions hors du lien : pas de bouton imbriqué dans un <a>. */}
      {(canCancel || canRefund) && (
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {canCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction(booking, 'cancel')}
              className={`rounded-full border border-slate-600 px-4 py-1.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            >
              {t('locataireReservations.actions.cancel')}
            </button>
          )}
          {canRefund && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction(booking, 'refund')}
              className={`rounded-full bg-[#0A3172] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0d3f92] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            >
              {t('locataireReservations.actions.refund')}
            </button>
          )}
        </div>
      )}
    </div>
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
  const { showToast } = useToast();
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
      if (e.key === 'Escape' && !deciding) setDecision(null);
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
    if (action === 'refund' && !cleanReason) {
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
      } else {
        await requestRefund(booking.id_booking, cleanReason);
        showToast(t('locataireReservations.toasts.refundRequested'), 'success');
      }
      // Statuts, badges et boutons dépendent du paiement : on recharge la liste.
      await loadBookings();
      setDecision(null);
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
        <p className="mt-1 text-sm text-slate-400">{t('locataireReservations.subtitle')}</p>
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
                  ? 'bg-[#0A3172] text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
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
                  : 'border-slate-700 bg-transparent text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-slate-300">{t('locataireReservations.loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-8 text-center text-sm text-slate-400">
          {bookings.length === 0
            ? t('locataireReservations.emptyAll')
            : t('locataireReservations.emptyFiltered')}
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((b) => (
            <li key={b.id_booking}>
              <BookingCard booking={b} busy={busyId === b.id_booking} onAction={handleAction} />
            </li>
          ))}
        </ul>
      )}

      {/* Modal d'annulation / demande de remboursement */}
      {decision && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !deciding && setDecision(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="locataire-decision-title"
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="locataire-decision-title" className="text-lg font-semibold text-white">
              {decision.action === 'cancel'
                ? t('locataireReservations.modal.cancelTitle')
                : t('locataireReservations.modal.refundTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
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
                className="mb-1 mt-4 block text-xs font-medium text-slate-400"
              >
                {decision.action === 'cancel'
                  ? t('locataireReservations.modal.cancelReasonLabel')
                  : t('locataireReservations.modal.refundReasonLabel')}
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
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-[#5AB4EC]"
              />
              {reasonError && (
                <p role="alert" className="mt-1 text-xs text-red-400">
                  {reasonError}
                </p>
              )}
              <p id="locataire-decision-hint" className="mt-2 text-xs text-slate-500">
                {decision.action === 'refund'
                  ? t('locataireReservations.modal.refundHint')
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
                  onClick={() => setDecision(null)}
                  className={`rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('locataireReservations.modal.back')}
                </button>
                <button
                  type="submit"
                  disabled={deciding}
                  className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING} ${
                    decision.action === 'cancel'
                      ? 'bg-red-600/80 hover:bg-red-500'
                      : 'bg-[#0A3172] hover:bg-[#0d3f92]'
                  }`}
                >
                  {deciding
                    ? t('locataireReservations.modal.working')
                    : decision.action === 'cancel'
                      ? t('locataireReservations.modal.confirmCancel')
                      : t('locataireReservations.modal.submitRefund')}
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
