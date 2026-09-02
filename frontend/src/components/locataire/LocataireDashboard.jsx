import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { getDashboard } from '../../services/locataireService.js';
import { formatDate } from '../../utils/formatDate.js';
import SafeImage from '../common/SafeImage.jsx';

const NUMBER = new Intl.NumberFormat('fr-FR');
const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const DATE_OPTS = { day: 'numeric', month: 'long', year: 'numeric' };
const DATE_SHORT_OPTS = {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
};

function getBookingStatus(t) {
  return {
    pending: { label: t('bookingStatus.pending'), cls: 'bg-warning-base/15 text-warning-soft' },
    confirmed: { label: t('bookingStatus.confirmed'), cls: 'bg-success-base/15 text-success-soft' },
    refused: { label: t('bookingStatus.refused'), cls: 'bg-danger-base/15 text-danger-soft' },
    cancelled: { label: t('bookingStatus.cancelled'), cls: 'bg-neutral/15 text-on-dark/80' },
  };
}

// Styles de focus clavier communs aux cartes cliquables (accessibilité).
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0';

function fmtDate(value) {
  return formatDate(value, DATE_OPTS);
}

function fmtDateShort(value) {
  return formatDate(value, DATE_SHORT_OPTS);
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
    <li className="h-full">
      <Link
        to={to}
        aria-label={
          loading
            ? t('locataireDashboard.statLoading', { label })
            : t('locataireDashboard.statValue', { label, value: display })
        }
        className={`block h-full rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl p-5 transition hover:border-glass/40 hover:bg-surface/15 ${FOCUS_RING}`}
      >
        <span className="block text-xs font-semibold uppercase tracking-wide text-on-dark/70">
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
      className={`block rounded-2xl border border-brand/50 bg-brand/10 p-5 backdrop-blur-xl transition hover:border-brand sm:p-6 ${FOCUS_RING}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {t('locataireDashboard.nextBooking.label')}
          </p>
          <h3 className="mt-1 text-xl font-bold text-on-dark sm:text-2xl">{booking.boat?.name}</h3>
          {(booking.boat?.type || port) && (
            <p className="mt-1 text-sm text-on-dark/80">
              {[booking.boat?.type, port && `${port.name} · ${port.city}`]
                .filter(Boolean)
                .join(' — ')}
            </p>
          )}
        </div>
        <span className="rounded-full bg-brand/15 px-3 py-1 text-sm font-semibold text-brand">
          {days === 0
            ? t('locataireDashboard.nextBooking.today')
            : t('locataireDashboard.nextBooking.inDays', { days })}
        </span>
      </header>

      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <dt className="text-on-dark/70">{t('locataireDashboard.nextBooking.dates')}</dt>
          <dd className="font-medium text-on-dark">
            <time dateTime={booking.start_date}>{fmtDate(booking.start_date)}</time> →{' '}
            <time dateTime={booking.end_date}>{fmtDate(booking.end_date)}</time>
          </dd>
        </div>
        <div>
          <dt className="text-on-dark/70">{t('locataireDashboard.nextBooking.amount')}</dt>
          <dd className="font-medium text-on-dark">{EURO.format(booking.total_amount ?? 0)}</dd>
        </div>
      </dl>
    </Link>
  );
}

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const meta = getBookingStatus(t)[status] || {
    label: status,
    cls: 'bg-neutral/15 text-on-dark/80',
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
      className="rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl p-5"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id="recent-bookings-title" className="text-sm font-semibold text-on-dark/90">
          {t('locataireDashboard.recentBookings.title')}
        </h2>
        <Link
          to="/locataire/reservations"
          className={`rounded text-xs font-medium text-brand hover:underline ${FOCUS_RING}`}
        >
          {t('locataireDashboard.recentBookings.seeAll')}
        </Link>
      </header>

      {bookings.length === 0 ? (
        <p className="mt-4 text-sm text-on-dark/70">
          {t('locataireDashboard.recentBookings.empty')}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-glass/15">
          {bookings.map((b) => (
            <li
              key={b.id_booking}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-on-dark">{b.boat?.name}</p>
                <p className="text-xs text-on-dark/70">
                  <time dateTime={b.start_date}>{fmtDateShort(b.start_date)}</time> →{' '}
                  <time dateTime={b.end_date}>{fmtDateShort(b.end_date)}</time>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={b.status} />
                <span className="text-sm font-medium text-on-dark">
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
      className="rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl p-5"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id="favorites-title" className="text-sm font-semibold text-on-dark/90">
          {t('locataireDashboard.favoritesPreview.title')}
        </h2>
        <Link
          to="/locataire/favoris"
          className={`rounded text-xs font-medium text-brand hover:underline ${FOCUS_RING}`}
        >
          {t('locataireDashboard.favoritesPreview.seeAll')}
        </Link>
      </header>

      {favorites.length === 0 ? (
        <p className="mt-4 text-sm text-on-dark/70">
          {t('locataireDashboard.favoritesPreview.empty')}
        </p>
      ) : (
        <ul className={`mt-4 grid gap-3 ${favorites.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {favorites.map((f) => (
            <li key={f.id_favorite} className="min-w-0">
              <Link
                to="/locataire/favoris"
                className={`block overflow-hidden rounded-xl border border-glass/20 bg-surface/10 backdrop-blur-xl transition hover:border-glass/40 ${FOCUS_RING}`}
              >
                <figure className="m-0">
                  {f.boat?.image ? (
                    <SafeImage
                      src={f.boat.image}
                      alt={t('carrousel.boatImageAlt', { name: f.boat?.name })}
                      loading="lazy"
                      className="aspect-[4/3] w-full bg-dark-elevated object-cover"
                      fallbackClassName="flex aspect-[4/3] w-full items-center justify-center bg-dark-elevated text-content-muted"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex aspect-[4/3] w-full items-center justify-center bg-dark-elevated text-content-muted"
                    >
                      ⛵
                    </span>
                  )}
                  <figcaption className="p-3">
                    <span className="block truncate text-sm font-medium text-on-dark">
                      {f.boat?.name}
                    </span>
                    <span className="block truncate text-xs text-on-dark/70">
                      {[f.boat?.type, f.boat?.port?.city].filter(Boolean).join(' · ')}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-brand">
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
      <h1 id="dashboard-title" className="text-2xl font-bold text-on-dark">
        {t('locataireDashboard.title')}
      </h1>
      <p className="mt-1 text-sm text-on-dark/70">
        {t('locataireDashboard.greeting', { name: user?.first_name })}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-danger-base/40 bg-danger-base/10 px-4 py-2 text-sm text-danger-soft"
        >
          {error}
        </div>
      )}

      {/* Alerte : documents à compléter (manquants, en attente ou refusés). */}
      {!loading && docsAlertParts.length > 0 && (
        <Link
          to="/locataire/documents"
          role="alert"
          className={`mt-6 flex items-center gap-3 rounded-lg border border-warning-base/40 bg-warning-base/10 px-4 py-3 text-sm text-warning-pale transition hover:bg-warning-base/20 ${FOCUS_RING}`}
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
        className="mt-6 grid auto-rows-fr list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label={t('locataireDashboard.stats.activeBookings')}
          accent="text-on-dark"
          value={stats?.activeBookings}
          to="/locataire/reservations"
          loading={loading}
        />
        <StatCard
          label={t('locataireDashboard.stats.reviewsToLeave')}
          accent="text-success-bright"
          value={stats?.reviewsToLeave}
          to="/locataire/reservations"
          loading={loading}
        />
        <StatCard
          label={t('locataireDashboard.stats.favorites')}
          accent="text-brand"
          value={stats?.favorites}
          to="/locataire/favoris"
          loading={loading}
        />
        <StatCard
          label={t('locataireDashboard.stats.unreadMessages')}
          accent="text-warning-bright"
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
