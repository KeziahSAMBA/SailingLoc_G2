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
import { useAuth } from '../../hooks/useAuth.jsx';
import { getAdminStats } from '../../services/adminService.js';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const NUMBER = new Intl.NumberFormat('fr-FR');

const STATUS_META = {
  confirmed: { label: 'Confirmées', color: '#34d399' },
  pending: { label: 'En attente', color: '#fbbf24' },
  refused: { label: 'Refusées', color: '#f87171' },
  cancelled: { label: 'Annulées', color: '#94a3b8' },
};

const TOOLTIP_STYLE = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 8,
  color: '#e2e8f0',
};

function fmtMonth(m) {
  const [y, mo] = String(m).split('-');
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('fr-FR', {
    month: 'short',
    year: '2-digit',
  });
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-200">{title}</h2>
      <div style={{ width: '100%', height: 260 }}>{children}</div>
    </div>
  );
}

function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminStats()
      .then((res) => setStats(res.data.stats))
      .catch((err) =>
        setError(err.response?.data?.message || 'Erreur de chargement des statistiques.')
      )
      .finally(() => setLoading(false));
  }, []);

  const pieData = (stats?.bookingsByStatus ?? []).map((b) => ({
    name: STATUS_META[b.status]?.label || b.status,
    value: b.count,
    color: STATUS_META[b.status]?.color || '#64748b',
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
      <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
      <p className="mt-1 text-sm text-slate-400">
        Bonjour {user?.first_name}, voici la vue d&apos;ensemble de la plateforme.
      </p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Utilisateurs"
          accent="text-white"
          value={loading ? '…' : NUMBER.format(stats?.users ?? 0)}
        />
        <StatCard
          label="Réservations"
          accent="text-white"
          value={loading ? '…' : NUMBER.format(stats?.bookings ?? 0)}
        />
        <StatCard
          label="Revenus"
          accent="text-emerald-400"
          value={loading ? '…' : EURO.format(stats?.revenue ?? 0)}
        />
        <StatCard
          label="Commissions"
          accent="text-[#5AB4EC]"
          value={loading ? '…' : EURO.format(stats?.commission ?? 0)}
        />
      </div>

      {!loading && !error && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ChartCard title="Réservations par statut">
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

          <ChartCard title="Revenus par mois">
            <ResponsiveContainer>
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [EURO.format(v), 'Revenus']}
                />
                <Bar dataKey="revenue" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Réservations par mois">
            <ResponsiveContainer>
              <BarChart data={bookingsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, 'Réservations']} />
                <Bar dataKey="count" fill="#5AB4EC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Commissions par mois">
            <ResponsiveContainer>
              <BarChart data={commissionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [EURO.format(v), 'Commissions']}
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
