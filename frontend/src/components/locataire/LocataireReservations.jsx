import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getBookings } from '../../services/locataireService.js';

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

function BookingCard({ booking }) {
  const { t } = useTranslation();
  const meta = getBookingStatus(t)[booking.status] || {
    label: booking.status,
    cls: 'bg-slate-500/15 text-slate-300',
  };
  const port = booking.boat?.port;
  const showReviewHint = booking.status === 'confirmed' && isPast(booking.end_date);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="flex flex-col sm:flex-row">
        {booking.boat?.image && (
          <img
            src={booking.boat.image}
            alt={`Bateau ${booking.boat?.name}`}
            loading="lazy"
            className="h-40 w-full object-cover sm:h-auto sm:w-48"
          />
        )}
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
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}
            >
              {meta.label}
            </span>
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
                ` ${t('locataireReservations.cancelledOn', { date: fmtDate(booking.cancellation_date) })}`}
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
}

function LocataireReservations() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const filters = useMemo(() => getFilters(t), [t]);

  useEffect(() => {
    document.title = t('locataireReservations.pageTitle');
  }, [t]);

  useEffect(() => {
    getBookings()
      .then((res) => setBookings(res.data.bookings || []))
      .catch((err) => setError(err.response?.data?.message || t('locataireReservations.loadError')))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? bookings : bookings.filter((b) => b.status === filter)),
    [bookings, filter]
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
        className="mb-5 flex flex-wrap gap-2"
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
              <BookingCard booking={b} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default LocataireReservations;
