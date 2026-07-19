import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { getDashboard } from '../../services/locataireService.js';

const NUMBER = new Intl.NumberFormat('fr-FR');
const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const DATE_SHORT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

function getBookingStatus(t) {
  return {
    pending: { label: t('bookingStatus.pending'), cls: 'bg-amber-500/15 text-amber-300' },
    confirmed: { label: t('bookingStatus.confirmed'), cls: 'bg-emerald-500/15 text-emerald-300' },
    refused: { label: t('bookingStatus.refused'), cls: 'bg-red-500/15 text-red-300' },
    cancelled: { label: t('bookingStatus.cancelled'), cls: 'bg-slate-500/15 text-white/80' },
  };
}

// Styles de focus clavier communs aux cartes cliquables (accessibilité).
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

function fmtDate(value) {
  return value ? DATE.format(new Date(value)) : '';
}

function fmtDateShort(value) {
  return value ? DATE_SHORT.format(new Date(value)) : '';
}

// Nombre de jours avant une date (>= 0).
function daysUntil(value) {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((start - today) / 86400000));
}

function StatCard({ label, value, accent, to, loading }) {
  const { t } = useTranslation();
  const display = loading ? '…' : NUMBER.format(value ?? 0);
  return (
    <li>
      <Link
        to={to}
        aria-label={
          loading
            ? t('locataireDashboard.statLoading', { label })
            : t('locataireDashboard.statValue', { label, value: display })
        }
        className={`block rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5 transition hover:border-white/40 hover:bg-white/15 ${FOCUS_RING}`}
      >
        <span className="block text-xs font-semibold uppercase tracking-wide text-white/70">
          {label}
        </span>
        <span className={`mt-2 block text-3xl font-bold ${accent}`} aria-hidden="true">
          {display}
        </span>
      </Link>
    </li>
  );
}

function NextBookingCard({ booking }) {
  const { t } = useTranslation();
  const days = daysUntil(booking.start_date);
  const port = booking.boat?.port;

  return (
    <Link
      to="/locataire/reservations"
      className={`block rounded-2xl border border-[#5AB4EC]/50 bg-[#5AB4EC]/10 p-5 backdrop-blur-xl transition hover:border-[#5AB4EC] sm:p-6 ${FOCUS_RING}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5AB4EC]">
            {t('locataireDashboard.nextBooking.label')}
          </p>
          <h3 className="mt-1 text-xl font-bold text-white sm:text-2xl">{booking.boat?.name}</h3>
          {(booking.boat?.type || port) && (
            <p className="mt-1 text-sm text-white/80">
              {[booking.boat?.type, port && `${port.name} · ${port.city}`]
                .filter(Boolean)
                .join(' — ')}
            </p>
          )}
        </div>
        <span className="rounded-full bg-[#5AB4EC]/15 px-3 py-1 text-sm font-semibold text-[#5AB4EC]">
          {days === 0
            ? t('locataireDashboard.nextBooking.today')
            : t('locataireDashboard.nextBooking.inDays', { days })}
        </span>
      </header>

      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <dt className="text-white/70">{t('locataireDashboard.nextBooking.dates')}</dt>
          <dd className="font-medium text-white">
            <time dateTime={booking.start_date}>{fmtDate(booking.start_date)}</time> →{' '}
            <time dateTime={booking.end_date}>{fmtDate(booking.end_date)}</time>
          </dd>
        </div>
        <div>
          <dt className="text-white/70">{t('locataireDashboard.nextBooking.amount')}</dt>
          <dd className="font-medium text-white">{EURO.format(booking.total_amount ?? 0)}</dd>
        </div>
      </dl>
    </Link>
  );
}

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const meta = getBookingStatus(t)[status] || {
    label: status,
    cls: 'bg-slate-500/15 text-white/80',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function RecentBookings({ bookings }) {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="recent-bookings-title"
      className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id="recent-bookings-title" className="text-sm font-semibold text-white/90">
          {t('locataireDashboard.recentBookings.title')}
        </h2>
        <Link
          to="/locataire/reservations"
          className={`rounded text-xs font-medium text-[#5AB4EC] hover:underline ${FOCUS_RING}`}
        >
          {t('locataireDashboard.recentBookings.seeAll')}
        </Link>
      </header>

      {bookings.length === 0 ? (
        <p className="mt-4 text-sm text-white/70">{t('locataireDashboard.recentBookings.empty')}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/15">
          {bookings.map((b) => (
            <li
              key={b.id_booking}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{b.boat?.name}</p>
                <p className="text-xs text-white/70">
                  <time dateTime={b.start_date}>{fmtDateShort(b.start_date)}</time> →{' '}
                  <time dateTime={b.end_date}>{fmtDateShort(b.end_date)}</time>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={b.status} />
                <span className="text-sm font-medium text-white">
                  {EURO.format(b.total_amount ?? 0)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FavoritesPreview({ favorites }) {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="favorites-title"
      className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id="favorites-title" className="text-sm font-semibold text-white/90">
          {t('locataireDashboard.favoritesPreview.title')}
        </h2>
        <Link
          to="/locataire/favoris"
          className={`rounded text-xs font-medium text-[#5AB4EC] hover:underline ${FOCUS_RING}`}
        >
          {t('locataireDashboard.favoritesPreview.seeAll')}
        </Link>
      </header>

      {favorites.length === 0 ? (
        <p className="mt-4 text-sm text-white/70">
          {t('locataireDashboard.favoritesPreview.empty')}
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {favorites.map((f) => (
            <li key={f.id_favorite}>
              <Link
                to="/locataire/favoris"
                className={`block overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl transition hover:border-white/40 ${FOCUS_RING}`}
              >
                <figure className="m-0">
                  {f.boat?.image ? (
                    <img
                      src={f.boat.image}
                      alt={`Bateau ${f.boat?.name}`}
                      loading="lazy"
                      className="aspect-[4/3] w-full bg-slate-800 object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex aspect-[4/3] w-full items-center justify-center bg-slate-800 text-slate-600"
                    >
                      ⛵
                    </span>
                  )}
                  <figcaption className="p-3">
                    <span className="block truncate text-sm font-medium text-white">
                      {f.boat?.name}
                    </span>
                    <span className="block truncate text-xs text-white/70">
                      {[f.boat?.type, f.boat?.port?.city].filter(Boolean).join(' · ')}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-[#5AB4EC]">
                      {EURO.format(f.boat?.daily_price ?? 0)}{' '}
                      {t('locataireDashboard.favoritesPreview.perDay')}
                    </span>
                  </figcaption>
                </figure>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LocataireDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = t('locataireDashboard.pageTitle');
  }, [t]);

  useEffect(() => {
    getDashboard()
      .then((res) => setStats(res.data.stats))
      .catch((err) => setError(err.response?.data?.message || t('locataireDashboard.loadError')))
      .finally(() => setLoading(false));
  }, []);

  const pendingDocuments = stats?.pendingDocuments ?? 0;
  const missingDocuments = stats?.missingDocuments ?? 0;

  // Message d'alerte documents : combine manquants et en attente/refusés.
  const docsAlertParts = [];
  if (missingDocuments > 0) {
    docsAlertParts.push(t('locataireDashboard.docsAlert.missing', { count: missingDocuments }));
  }
  if (pendingDocuments > 0) {
    docsAlertParts.push(t('locataireDashboard.docsAlert.pending', { count: pendingDocuments }));
  }

  return (
    <section aria-labelledby="dashboard-title" aria-busy={loading}>
      <h1 id="dashboard-title" className="text-2xl font-bold text-white">
        {t('locataireDashboard.title')}
      </h1>
      <p className="mt-1 text-sm text-white/70">
        {t('locataireDashboard.greeting', { name: user?.first_name })}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {/* Alerte : documents à compléter (manquants, en attente ou refusés). */}
      {!loading && docsAlertParts.length > 0 && (
        <Link
          to="/locataire/documents"
          role="alert"
          className={`mt-6 flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 transition hover:bg-amber-500/20 ${FOCUS_RING}`}
        >
          <span aria-hidden="true" className="text-lg">
            ⚠️
          </span>
          <span>
            {t('locataireDashboard.docsAlert.prefix')}{' '}
            <strong>{docsAlertParts.join(` ${t('locataireDashboard.docsAlert.and')} `)}</strong>.{' '}
            {t('locataireDashboard.docsAlert.suffix')}
          </span>
        </Link>
      )}

      {/* Prochaine réservation : carte large mise en avant. */}
      {!loading && stats?.nextBooking && (
        <section className="mt-6" aria-label={t('locataireDashboard.nextBooking.sectionAria')}>
          <NextBookingCard booking={stats.nextBooking} />
        </section>
      )}

      <h2 className="sr-only" id="kpis-title">
        {t('locataireDashboard.kpisTitle')}
      </h2>
      <ul
        aria-labelledby="kpis-title"
        className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label={t('locataireDashboard.stats.activeBookings')}
          accent="text-white"
          value={stats?.activeBookings}
          to="/locataire/reservations"
          loading={loading}
        />
        <StatCard
          label={t('locataireDashboard.stats.reviewsToLeave')}
          accent="text-emerald-400"
          value={stats?.reviewsToLeave}
          to="/locataire/reservations"
          loading={loading}
        />
        <StatCard
          label={t('locataireDashboard.stats.favorites')}
          accent="text-[#5AB4EC]"
          value={stats?.favorites}
          to="/locataire/favoris"
          loading={loading}
        />
        <StatCard
          label={t('locataireDashboard.stats.unreadMessages')}
          accent="text-amber-400"
          value={stats?.unreadMessages}
          to="/locataire/messages"
          loading={loading}
        />
      </ul>

      {!loading && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <RecentBookings bookings={stats?.recentBookings ?? []} />
          <FavoritesPreview favorites={stats?.favoriteBoatsPreview ?? []} />
        </div>
      )}
    </section>
  );
}

export default LocataireDashboard;
