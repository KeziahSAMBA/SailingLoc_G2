import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { getAdminStats } from '../../services/adminService.js';
import { formatDate } from '../../utils/formatDate.js';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const NUMBER = new Intl.NumberFormat('fr-FR');

const STATUS_COLOR = {
  confirmed: 'rgb(var(--sl-chart-4))',
  pending: 'rgb(var(--sl-chart-2))',
  refused: 'rgb(var(--sl-chart-3))',
  cancelled: 'rgb(var(--sl-chart-5))',
};

const MONTH_OPTS = { month: 'short', year: '2-digit' };

const TOOLTIP_STYLE = {
  background: 'rgb(var(--sl-dark-surface))',
  border: '0.0625rem solid rgb(var(--sl-dark-elevated))',
  borderRadius: '0.5rem',
  color: 'rgb(var(--sl-content-soft))',
};
const AXIS_TICK_STYLE = { fill: 'rgb(var(--sl-content-subtle))', fontSize: '0.75rem' };

function fmtMonth(m) {
  const [y, mo] = String(m).split('-');
  return formatDate(new Date(Number(y), Number(mo) - 1, 1), MONTH_OPTS);
}

function StatCard({ label, value, accent }) {
  return (
    <div className="h-full rounded-2xl border border-glass/20 bg-surface/10 p-5 text-center backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-on-dark/70">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="h-full rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl p-5">
      <h2 className="mb-4 text-sm font-semibold text-on-dark/90">{title}</h2>
      <div className="h-56 w-full sm:h-[16.25rem]">{children}</div>
    </div>
  );
}

function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminStats()
      .then((res) => setStats(res.data.stats))
      .catch((err) => setError(err.response?.data?.message || t('adminDashboard.loadError')))
      .finally(() => setLoading(false));
  }, []);

  const pieData = (stats?.bookingsByStatus ?? []).map((b) => ({
    name: t(`adminDashboard.status.${b.status}`, { defaultValue: b.status }),
    value: b.count,
    color: STATUS_COLOR[b.status] || 'rgb(var(--sl-neutral))',
  }));
  const pieDescription = pieData.length
    ? pieData.map((entry) => `${entry.name}: ${NUMBER.format(entry.value)}`).join(', ')
    : t('adminDashboard.noData');
  const revenueData = (stats?.revenueByMonth ?? []).map((r) => ({
    month: fmtMonth(r.month),
    revenue: r.revenue,
  }));
  const bookingsData = (stats?.bookingsByMonth ?? []).map((b) => ({
    month: fmtMonth(b.month),
    count: b.count,
  }));
  const commissionData = (stats?.commissionByMonth ?? []).map((c) => ({
    month: fmtMonth(c.month),
    commission: c.commission,
  }));

  return (
    <section>
      <h1 className="text-2xl font-bold text-on-dark">{t('adminDashboard.title')}</h1>
      <p className="mt-1 text-sm text-on-dark/70">
        {t('adminDashboard.greeting', { name: user?.first_name ?? '' })}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-danger-base/40 bg-danger-base/10 px-4 py-2 text-sm text-danger-soft"
        >
          {error}
        </div>
      )}

      <div className="mt-6 grid auto-rows-fr grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t('adminDashboard.users')}
          accent="text-on-dark"
          value={loading ? '…' : NUMBER.format(stats?.users ?? 0)}
        />
        <StatCard
          label={t('adminDashboard.bookings')}
          accent="text-on-dark"
          value={loading ? '…' : NUMBER.format(stats?.bookings ?? 0)}
        />
        <StatCard
          label={t('adminDashboard.revenue')}
          accent="text-success-bright"
          value={loading ? '…' : EURO.format(stats?.revenue ?? 0)}
        />
        <StatCard
          label={t('adminDashboard.commission')}
          accent="text-brand"
          value={loading ? '…' : EURO.format(stats?.commission ?? 0)}
        />
      </div>

      {!loading && !error && (
        <div className="mt-6 grid auto-rows-fr gap-4 lg:grid-cols-2">
          <ChartCard title={t('adminDashboard.bookingsByStatus')}>
            <div
              className="h-full w-full"
              role="img"
              aria-label={t('adminDashboard.bookingsByStatus')}
              aria-describedby="admin-bookings-status-chart-description"
            >
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="42%"
                    outerRadius="68%"
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                        stroke="rgb(var(--sl-dark-surface))"
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend
                    align="center"
                    verticalAlign="bottom"
                    iconSize={10}
                    wrapperStyle={{
                      fontSize: '0.75rem',
                      lineHeight: '1.25rem',
                      color: 'rgb(var(--sl-content-soft))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p id="admin-bookings-status-chart-description" className="sr-only">
              {pieDescription}
            </p>
          </ChartCard>

          <ChartCard title={t('adminDashboard.revenueByMonth')}>
            <ResponsiveContainer>
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--sl-dark-elevated))" />
                <XAxis dataKey="month" tick={AXIS_TICK_STYLE} tickMargin={8} minTickGap={12} />
                <YAxis tick={AXIS_TICK_STYLE} tickMargin={4} width={52} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [EURO.format(v), t('adminDashboard.revenue')]}
                />
                <Bar dataKey="revenue" fill="rgb(var(--sl-chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('adminDashboard.bookingsByMonth')}>
            <ResponsiveContainer>
              <BarChart data={bookingsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--sl-dark-elevated))" />
                <XAxis dataKey="month" tick={AXIS_TICK_STYLE} tickMargin={8} minTickGap={12} />
                <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} tickMargin={4} width={52} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [v, t('adminDashboard.bookings')]}
                />
                <Bar dataKey="count" fill="rgb(var(--sl-chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('adminDashboard.commissionByMonth')}>
            <ResponsiveContainer>
              <BarChart data={commissionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--sl-dark-elevated))" />
                <XAxis dataKey="month" tick={AXIS_TICK_STYLE} tickMargin={8} minTickGap={12} />
                <YAxis tick={AXIS_TICK_STYLE} tickMargin={4} width={52} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [EURO.format(v), t('adminDashboard.commission')]}
                />
                <Bar dataKey="commission" fill="rgb(var(--sl-chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </section>
  );
}

export default AdminDashboard;
