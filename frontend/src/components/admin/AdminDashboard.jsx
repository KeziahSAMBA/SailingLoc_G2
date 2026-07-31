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
  confirmed: '#34d399',
  pending: '#fbbf24',
  refused: '#f87171',
  cancelled: '#94a3b8',
};

const MONTH_OPTS = { month: 'short', year: '2-digit' };

const TOOLTIP_STYLE = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 8,
  color: '#e2e8f0',
};

function fmtMonth(m) {
  const [y, mo] = String(m).split('-');
  return formatDate(new Date(Number(y), Number(mo) - 1, 1), MONTH_OPTS);
}

function StatCard({ label, value, accent }) {
  return (
    <div className="h-full rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="h-full rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5">
      <h2 className="mb-4 text-sm font-semibold text-white/90">{title}</h2>
      <div style={{ width: '100%', height: 260 }}>{children}</div>
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
    color: STATUS_COLOR[b.status] || '#64748b',
  }));
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
      <h1 className="text-2xl font-bold text-white">{t('adminDashboard.title')}</h1>
      <p className="mt-1 text-sm text-white/70">
        {t('adminDashboard.greeting', { name: user?.first_name ?? '' })}
      </p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('adminDashboard.users')}
          accent="text-white"
          value={loading ? '…' : NUMBER.format(stats?.users ?? 0)}
        />
        <StatCard
          label={t('adminDashboard.bookings')}
          accent="text-white"
          value={loading ? '…' : NUMBER.format(stats?.bookings ?? 0)}
        />
        <StatCard
          label={t('adminDashboard.revenue')}
          accent="text-emerald-400"
          value={loading ? '…' : EURO.format(stats?.revenue ?? 0)}
        />
        <StatCard
          label={t('adminDashboard.commission')}
          accent="text-[#5AB4EC]"
          value={loading ? '…' : EURO.format(stats?.commission ?? 0)}
        />
      </div>

      {!loading && !error && (
        <div className="mt-6 grid auto-rows-fr gap-4 lg:grid-cols-2">
          <ChartCard title={t('adminDashboard.bookingsByStatus')}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="#0f172a" />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('adminDashboard.revenueByMonth')}>
            <ResponsiveContainer>
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [EURO.format(v), t('adminDashboard.revenue')]}
                />
                <Bar dataKey="revenue" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('adminDashboard.bookingsByMonth')}>
            <ResponsiveContainer>
              <BarChart data={bookingsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [v, t('adminDashboard.bookings')]}
                />
                <Bar dataKey="count" fill="#5AB4EC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('adminDashboard.commissionByMonth')}>
            <ResponsiveContainer>
              <BarChart data={commissionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [EURO.format(v), t('adminDashboard.commission')]}
                />
                <Bar dataKey="commission" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </section>
  );
}

export default AdminDashboard;
