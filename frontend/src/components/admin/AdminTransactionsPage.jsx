import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../hooks/useToast.jsx';
import { listPayments, getPaymentStats } from '../../services/adminService.js';
import Pagination from '../common/Pagination.jsx';
import usePagination from '../../hooks/usePagination.js';

const PAGE_SIZE = 10;

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const STATUS = {
  pending: { label: 'En attente', cls: 'bg-amber-500/15 text-amber-300' },
  success: { label: 'Réussi', cls: 'bg-emerald-500/15 text-emerald-300' },
  failed: { label: 'Échoué', cls: 'bg-red-500/15 text-red-300' },
  refunded: { label: 'Remboursé', cls: 'bg-sky-500/15 text-sky-300' },
};
const STATUS_FILTERS = [
  ['', 'Tous'],
  ['success', 'Réussis'],
  ['pending', 'En attente'],
  ['failed', 'Échoués'],
  ['refunded', 'Remboursés'],
];

const METHOD = {
  card: 'Carte',
  bank_transfer: 'Virement',
  paypal: 'PayPal',
  cash: 'Espèces',
};
const METHOD_FILTERS = [
  ['', 'Toutes'],
  ['card', 'Carte'],
  ['bank_transfer', 'Virement'],
];

const selectClass =
  'rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#5AB4EC]';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

function StatCard({ label, value, sublabel, accent = 'text-white' }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-white/60">{sublabel}</p>}
    </div>
  );
}

function AdminTransactionsPage() {
  const { showToast } = useToast();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getPaymentStats();
      setStats(res.data.stats);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de chargement des statistiques.', 'error');
    } finally {
      setStatsLoading(false);
    }
  }, [showToast]);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (method) params.method = method;
      if (search.trim()) params.search = search.trim();
      const res = await listPayments(params);
      setPayments(res.data.payments);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de chargement.', 'error');
    } finally {
      setLoading(false);
    }
  }, [status, method, search, showToast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    // Debounce léger pour ne pas requêter à chaque frappe.
    const t = setTimeout(loadPayments, 250);
    return () => clearTimeout(t);
  }, [loadPayments]);

  const {
    page,
    setPage,
    pageItems: pagePayments,
  } = usePagination(payments, PAGE_SIZE, `${status}|${method}|${search}`);

  const pill = (active) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      active ? 'bg-sky-500 text-white' : 'border border-white/30 text-white/80 hover:bg-white/10'
    }`;
  const badge = (meta) =>
    `inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
      meta?.cls || 'bg-slate-500/15 text-white/70'
    }`;

  return (
    <section>
      <h1 className="text-2xl font-bold text-white">Transactions &amp; commissions</h1>
      <p className="mt-1 text-sm text-white/70">
        Suivi des paiements encaissés via la plateforme et des commissions perçues.
      </p>

      {/* Stats cards */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Volume encaissé"
          value={statsLoading ? '…' : stats ? EURO.format(stats.total_volume) : EURO.format(0)}
          sublabel="Paiements réussis"
          accent="text-white"
        />
        <StatCard
          label="Commissions perçues"
          value={statsLoading ? '…' : stats ? EURO.format(stats.total_commission) : EURO.format(0)}
          sublabel="Cumul SailingLoc"
          accent="text-emerald-300"
        />
        <StatCard
          label="Transactions réussies"
          value={statsLoading ? '…' : (stats?.success_count ?? 0).toLocaleString('fr-FR')}
          sublabel={
            stats
              ? `${stats.counts.pending} en attente · ${stats.counts.failed} échouées`
              : undefined
          }
        />
        <StatCard
          label="Remboursements"
          value={statsLoading ? '…' : (stats?.counts.refunded ?? 0).toLocaleString('fr-FR')}
          sublabel="Paiements remboursés"
          accent="text-sky-300"
        />
      </div>

      {/* Filtres */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (référence, bateau, email)…"
          className={`${selectClass} min-w-[240px] flex-1`}
        />
        {STATUS_FILTERS.map(([v, l]) => (
          <button
            key={`s-${l}`}
            type="button"
            onClick={() => setStatus(v)}
            className={pill(status === v)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/60">Méthode</span>
        {METHOD_FILTERS.map(([v, l]) => (
          <button
            key={`m-${l}`}
            type="button"
            onClick={() => setMethod(v)}
            className={pill(method === v)}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/20 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-white/80">Référence</th>
              <th className="px-3 py-3 text-left font-semibold text-white/80">Date</th>
              <th className="px-3 py-3 text-left font-semibold text-white/80">Locataire</th>
              <th className="px-3 py-3 text-left font-semibold text-white/80">Bateau</th>
              <th className="px-3 py-3 text-left font-semibold text-white/80">Méthode</th>
              <th className="px-3 py-3 text-right font-semibold text-white/80">Montant</th>
              <th className="px-3 py-3 text-right font-semibold text-white/80">Commission</th>
              <th className="px-3 py-3 text-left font-semibold text-white/80">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-white/70">
                  Chargement…
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-white/70">
                  Aucune transaction.
                </td>
              </tr>
            ) : (
              pagePayments.map((p) => (
                <tr key={p.id_payment} className="text-white/90">
                  <td className="break-all px-3 py-3 font-mono text-xs text-white/80">
                    {p.transaction_ref || '—'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-white/70">
                    {fmtDate(p.payment_date)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium">
                      {p.booking?.guest_first_name || p.booking?.guest_last_name
                        ? `${p.booking.guest_first_name || ''} ${p.booking.guest_last_name || ''}`.trim()
                        : '—'}
                    </div>
                    <div className="text-xs text-white/60">{p.booking?.guest_email}</div>
                  </td>
                  <td className="px-3 py-3 text-white/70">{p.booking?.boat_name || '—'}</td>
                  <td className="px-3 py-3 text-white/70">
                    {METHOD[p.payment_method] || p.payment_method}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-white">
                    {EURO.format(p.amount)}
                    {p.status === 'refunded' && p.refunded_amount != null && (
                      <div className="text-xs font-normal text-sky-300">
                        −{EURO.format(p.refunded_amount)} remboursés
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-emerald-300">
                    {EURO.format(p.commission)}
                  </td>
                  <td className="px-3 py-3">
                    <span className={badge(STATUS[p.status])}>
                      {STATUS[p.status]?.label || p.status}
                    </span>
                    {p.id_dispute && (
                      <div className="mt-1 text-xs text-white/60">Litige #{p.id_dispute}</div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={payments.length}
        onChange={setPage}
        label="Transactions"
        className="mt-4"
      />
    </section>
  );
}

export default AdminTransactionsPage;
