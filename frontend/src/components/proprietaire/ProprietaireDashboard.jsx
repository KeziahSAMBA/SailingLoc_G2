import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { getDashboard } from '../../services/proprietaireService.js';
import { formatDate } from '../../utils/formatDate.js';

const NUMBER = new Intl.NumberFormat('fr-FR');
const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const DATE_SHORT_OPTS = {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
};

const BOOKING_STATUS_CLS = {
  pending: 'bg-amber-500/15 text-amber-300',
  confirmed: 'bg-emerald-500/15 text-emerald-300',
  refused: 'bg-red-500/15 text-red-300',
  cancelled: 'bg-slate-500/15 text-white/80',
};

// Styles de focus clavier communs aux cartes cliquables (accessibilité).
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

function fmtDateShort(value) {
  return formatDate(value, DATE_SHORT_OPTS);
}

function StatCard({ label, value, accent, to, loading, format = NUMBER }) {
  const { t } = useTranslation();
  const display = loading ? '…' : format.format(value ?? 0);
  return (
    <li className="h-full">
      <Link
        to={to}
        aria-label={
          loading
            ? t('proprietaireDashboard.statLoading', { label })
            : t('proprietaireDashboard.statValue', { label, value: display })
        }
        className={`block h-full rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5 transition-colors hover:border-[#5AB4EC]/60 ${FOCUS_RING}`}
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

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const cls = BOOKING_STATUS_CLS[status] || 'bg-slate-500/15 text-white/80';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {t(`bookingStatus.${status}`, { defaultValue: status })}
    </span>
  );
}

function RecentBookings({ bookings }) {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="recent-bookings-title"
      className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5 md:h-full"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id="recent-bookings-title" className="text-sm font-semibold text-white/90">
          {t('proprietaireDashboard.recentBookings')}
        </h2>
        <Link
          to="/proprietaire/reservations"
          className={`rounded text-xs font-medium text-[#5AB4EC] hover:underline ${FOCUS_RING}`}
        >
          {t('proprietaireDashboard.seeAll')}
        </Link>
      </header>

      {bookings.length === 0 ? (
        <p className="mt-4 text-sm text-white/70">{t('proprietaireDashboard.noBookings')}</p>
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
                  {[b.user?.first_name, b.user?.last_name].filter(Boolean).join(' ')} ·{' '}
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

function BoatsPreview({ boats }) {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="boats-preview-title"
      className="rounded-2xl border border-white/20 bg-white/10 p-5 md:h-full"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id="boats-preview-title" className="text-sm font-semibold text-white/90">
          {t('proprietaireDashboard.myBoats')}
        </h2>
        <Link
          to="/proprietaire/bateaux"
          className={`rounded text-xs font-medium text-[#5AB4EC] hover:underline ${FOCUS_RING}`}
        >
          {t('proprietaireDashboard.seeAll')}
        </Link>
      </header>

      {boats.length === 0 ? (
        <p className="mt-4 text-sm text-white/70">{t('proprietaireDashboard.noBoats')}</p>
      ) : (
        <ul className={`mt-4 grid gap-3 ${boats.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {boats.map((boat) => (
            <li key={boat.id_boat} className="min-w-0">
              <Link
                to="/proprietaire/bateaux"
                className={`block overflow-hidden rounded-xl border border-white/20 bg-white/10 transition-colors hover:border-white/40 ${FOCUS_RING}`}
              >
                <figure className="m-0">
                  {boat.image ? (
                    <img
                      src={boat.image}
                      alt={t('proprietaireDashboard.boatAlt', { name: boat.name })}
                      loading="lazy"
                      className="aspect-[4/3] w-full bg-white/10 object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex aspect-[4/3] w-full items-center justify-center bg-white/10 text-white/40"
                    >
                      ⛵
                    </span>
                  )}
                  <figcaption className="p-3">
                    <span className="block truncate text-sm font-medium text-white">
                      {boat.name}
                    </span>
                    <span className="block truncate text-xs text-white/70">
                      {[boat.type, boat.port?.city].filter(Boolean).join(' · ')}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-[#5AB4EC]">
                      {t('proprietaireDashboard.perDay', {
                        price: EURO.format(boat.daily_price ?? 0),
                      })}
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

function ProprietaireDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = t('proprietaireDashboard.pageTitle');
  }, [t]);

  useEffect(() => {
    getDashboard()
      .then((res) => setStats(res.data.stats))
      .catch((err) => setError(err.response?.data?.message || t('proprietaireDashboard.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <section aria-labelledby="dashboard-title" aria-busy={loading}>
      <h1 id="dashboard-title" className="text-2xl font-bold text-white">
        {t('proprietaireDashboard.title')}
      </h1>
      <p className="mt-1 text-sm text-white/70">
        {t('proprietaireDashboard.greeting', { name: user?.first_name ?? '' })}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      <h2 className="sr-only" id="kpis-title">
        {t('proprietaireDashboard.kpisTitle')}
      </h2>
      <ul
        aria-labelledby="kpis-title"
        className="mt-6 grid auto-rows-fr list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
      >
        <StatCard
          label={t('proprietaireDashboard.publishedBoats')}
          accent="text-white"
          value={stats?.publishedBoats}
          to="/proprietaire/bateaux"
          loading={loading}
        />
        <StatCard
          label={t('proprietaireDashboard.pendingBookings')}
          accent="text-amber-400"
          value={stats?.pendingBookings}
          to="/proprietaire/reservations"
          loading={loading}
        />
        <StatCard
          label={t('proprietaireDashboard.monthRevenue')}
          accent="text-[#5AB4EC]"
          value={stats?.monthRevenue}
          format={EURO}
          to="/proprietaire/revenus"
          loading={loading}
        />
      </ul>

      {!loading && (
        // Hauteurs naturelles sur téléphone, puis lignes et panneaux de même
        // hauteur dès la tablette, sans valeur fixe.
        <div className="mt-6 grid items-start gap-4 md:auto-rows-fr md:items-stretch lg:grid-cols-2">
          <RecentBookings bookings={stats?.recentBookings ?? []} />
          <BoatsPreview boats={stats?.boatsPreview ?? []} />
        </div>
      )}
    </section>
  );
}

export default ProprietaireDashboard;
