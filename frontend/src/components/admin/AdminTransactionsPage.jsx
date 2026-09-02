import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast.jsx';
import { listPayments, getPaymentStats } from '../../services/adminService.js';
import { formatDate } from '../../utils/formatDate.js';
import Pagination from '../common/Pagination.jsx';
import usePagination from '../../hooks/usePagination.js';
import AdminScrollableFilterRow from './AdminScrollableFilterRow.jsx';

const PAGE_SIZE = 10;

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const STATUS_CLS = {
  pending: 'bg-warning-base/15 text-warning-soft',
  success: 'bg-success-base/15 text-success-soft',
  failed: 'bg-danger-base/15 text-danger-soft',
  refunded: 'bg-action/15 text-action-soft',
};
const STATUS_FILTERS = [
  { value: '', labelKey: 'all' },
  { value: 'success', labelKey: 'success' },
  { value: 'pending', labelKey: 'pending' },
  { value: 'failed', labelKey: 'failed' },
  { value: 'refunded', labelKey: 'refunded' },
];
const METHOD_FILTERS = [
  { value: '', labelKey: 'all' },
  { value: 'card', labelKey: 'card' },
  { value: 'bank_transfer', labelKey: 'bank_transfer' },
];

const DATE_OPTS = { day: '2-digit', month: '2-digit', year: 'numeric' };

const selectClass =
  'rounded-lg border border-glass/30 bg-surface/10 px-3 py-2 text-sm text-on-dark/90 outline-none focus:border-brand';

function StatCard({ label, value, sublabel, accent = 'text-on-dark', className = '' }) {
  return (
    <div
      className={`h-full rounded-2xl border border-glass/20 bg-surface/10 p-5 backdrop-blur-xl ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-on-dark/60">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-on-dark/60">{sublabel}</p>}
    </div>
  );
}

function AdminTransactionsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const fmtDate = (d) => (d ? formatDate(d, DATE_OPTS) : '—');

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');
  // Filtre par plage de dates + tri : appliqués côté client sur la liste chargée.
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'amount' | 'commission'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getPaymentStats();
      setStats(res.data.stats);
    } catch (err) {
      showToast(err.response?.data?.message || t('adminTransactions.statsError'), 'error');
    } finally {
      setStatsLoading(false);
    }
  }, [showToast, t]);

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
      showToast(err.response?.data?.message || t('adminTransactions.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [status, method, search, showToast, t]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    // Debounce léger pour ne pas requêter à chaque frappe.
    const timer = setTimeout(loadPayments, 250);
    return () => clearTimeout(timer);
  }, [loadPayments]);

  // Filtre par dates (sur payment_date) puis tri, avant pagination.
  const visiblePayments = useMemo(() => {
    const rows = payments.filter((p) => {
      const day = p.payment_date ? p.payment_date.slice(0, 10) : '';
      if (dateFrom && (!day || day < dateFrom)) return false;
      if (dateTo && (!day || day > dateTo)) return false;
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    const val = (p) => {
      if (sortBy === 'amount') return p.amount ?? 0;
      if (sortBy === 'commission') return p.commission ?? 0;
      return p.payment_date ? new Date(p.payment_date).getTime() : 0;
    };
    return [...rows].sort((a, b) => (val(a) - val(b)) * dir);
  }, [payments, dateFrom, dateTo, sortBy, sortDir]);

  const {
    page,
    setPage,
    pageItems: pagePayments,
  } = usePagination(
    visiblePayments,
    PAGE_SIZE,
    `${status}|${method}|${search}|${dateFrom}|${dateTo}|${sortBy}|${sortDir}`
  );

  function toggleSort(field) {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(field);
      setSortDir('desc');
    }
  }

  const sortArrow = (field) => (sortBy !== field ? '' : sortDir === 'asc' ? ' ▲' : ' ▼');

  const pill = (active) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      active
        ? 'bg-action text-on-dark'
        : 'border border-glass/30 text-on-dark/80 hover:bg-surface/10'
    }`;
  const badge = (cls) =>
    `inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
      cls || 'bg-neutral/15 text-on-dark/70'
    }`;

  return (
    <section>
      <h1 className="text-2xl font-bold text-on-dark">{t('adminTransactions.title')}</h1>
      <p className="mt-1 text-sm text-on-dark/70">{t('adminTransactions.subtitle')}</p>

      {/* Stats cards */}
      <div className="mt-5 grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('adminTransactions.volume')}
          value={statsLoading ? '…' : stats ? EURO.format(stats.total_volume) : EURO.format(0)}
          sublabel={t('adminTransactions.volumeSub')}
          accent="text-on-dark"
          className="col-span-2 sm:col-span-1"
        />
        <StatCard
          label={t('adminTransactions.commission')}
          value={statsLoading ? '…' : stats ? EURO.format(stats.total_commission) : EURO.format(0)}
          sublabel={t('adminTransactions.commissionSub')}
          accent="text-success-soft"
          className="col-span-2 sm:col-span-1"
        />
        <StatCard
          label={t('adminTransactions.successCount')}
          value={statsLoading ? '…' : (stats?.success_count ?? 0).toLocaleString('fr-FR')}
          sublabel={
            stats
              ? t('adminTransactions.successSub', {
                  pending: stats.counts.pending,
                  failed: stats.counts.failed,
                })
              : undefined
          }
        />
        <StatCard
          label={t('adminTransactions.refunds')}
          value={statsLoading ? '…' : (stats?.counts.refunded ?? 0).toLocaleString('fr-FR')}
          sublabel={t('adminTransactions.refundsSub')}
          accent="text-action-soft"
        />
      </div>

      {/* Filtres */}
      <div className="mt-6 space-y-4 md:rounded-2xl md:border md:border-glass/20 md:bg-surface/10 md:p-5 md:backdrop-blur-xl">
        <label className="block">
          <span className="sr-only">{t('adminTransactions.searchPlaceholder')}</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('adminTransactions.searchPlaceholder')}
            className={`${selectClass} w-full`}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
          <fieldset className="min-w-0">
            <legend className="text-xs font-semibold uppercase tracking-wide text-on-dark/60">
              {t('adminTransactions.colStatus')}
            </legend>
            <AdminScrollableFilterRow
              ariaLabel={t('adminTransactions.colStatus')}
              contentKey={`${status}|${t('adminTransactions.colStatus')}`}
              className="mt-2 min-w-0"
            >
              {STATUS_FILTERS.map(({ value, labelKey }) => (
                <button
                  key={`s-${labelKey}`}
                  type="button"
                  aria-pressed={status === value}
                  onClick={() => setStatus(value)}
                  className={`${pill(status === value)} shrink-0 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-bright`}
                >
                  {t(`adminTransactions.statusFilters.${labelKey}`)}
                </button>
              ))}
            </AdminScrollableFilterRow>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="text-xs font-semibold uppercase tracking-wide text-on-dark/60">
              {t('adminTransactions.methodLabel')}
            </legend>
            <AdminScrollableFilterRow
              ariaLabel={t('adminTransactions.methodLabel')}
              contentKey={`${method}|${t('adminTransactions.methodLabel')}`}
              className="mt-2 min-w-0"
            >
              {METHOD_FILTERS.map(({ value, labelKey }) => (
                <button
                  key={`m-${labelKey}`}
                  type="button"
                  aria-pressed={method === value}
                  onClick={() => setMethod(value)}
                  className={`${pill(method === value)} shrink-0 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-bright`}
                >
                  {t(`adminTransactions.methodFilters.${labelKey}`)}
                </button>
              ))}
            </AdminScrollableFilterRow>
          </fieldset>
        </div>

        <div className="grid gap-2 border-t border-glass/15 pt-4 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="flex min-w-0 flex-col items-stretch gap-1.5 text-xs text-on-dark/70">
            {t('adminTransactions.dateFrom')}
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`${selectClass} w-full min-w-0`}
            />
          </label>
          <label className="flex min-w-0 flex-col items-stretch gap-1.5 text-xs text-on-dark/70">
            {t('adminTransactions.dateTo')}
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className={`${selectClass} w-full min-w-0`}
            />
          </label>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="w-full rounded-full border border-glass/30 px-3 py-2 text-sm font-medium text-on-dark/80 transition hover:bg-surface/10 sm:col-span-2 sm:w-auto sm:justify-self-start md:col-span-1 md:justify-self-auto"
            >
              {t('adminTransactions.reset')}
            </button>
          )}
        </div>
      </div>

      {/* Tri en pastilles : remplace les en-têtes cliquables, masqués avec le tableau. */}
      <div className="mt-4 flex flex-wrap items-center gap-2 xl:hidden">
        <span className="text-xs font-semibold uppercase tracking-wide text-on-dark/60">
          {t('adminTransactions.sortLabel')}
        </span>
        <AdminScrollableFilterRow
          ariaLabel={t('adminTransactions.sortLabel')}
          contentKey={`${sortBy}|${sortDir}|${t('adminTransactions.sortLabel')}`}
          className="min-w-0 flex-1"
        >
          {['date', 'amount', 'commission'].map((field) => (
            <button
              key={field}
              type="button"
              aria-pressed={sortBy === field}
              onClick={() => toggleSort(field)}
              className={`${pill(sortBy === field)} shrink-0 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-bright`}
            >
              {t(
                `adminTransactions.col${field === 'date' ? 'Date' : field === 'amount' ? 'Amount' : 'Commission'}`
              )}
              {sortArrow(field)}
            </button>
          ))}
        </AdminScrollableFilterRow>
      </div>

      {/* Tableau (desktop) */}
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl xl:block">
        <table className="w-full text-sm">
          <thead className="border-b border-glass/20 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-on-dark/80">
                {t('adminTransactions.colRef')}
              </th>
              <th
                onClick={() => toggleSort('date')}
                aria-sort={
                  sortBy === 'date' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                }
                className="cursor-pointer select-none px-3 py-3 text-left font-semibold text-on-dark/80 hover:text-on-dark"
              >
                {t('adminTransactions.colDate')}
                {sortArrow('date')}
              </th>
              <th className="px-3 py-3 text-left font-semibold text-on-dark/80">
                {t('adminTransactions.colRenter')}
              </th>
              <th className="px-3 py-3 text-left font-semibold text-on-dark/80">
                {t('adminTransactions.colBoat')}
              </th>
              <th className="px-3 py-3 text-left font-semibold text-on-dark/80">
                {t('adminTransactions.colMethod')}
              </th>
              <th
                onClick={() => toggleSort('amount')}
                aria-sort={
                  sortBy === 'amount' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                }
                className="cursor-pointer select-none px-3 py-3 text-right font-semibold text-on-dark/80 hover:text-on-dark"
              >
                {t('adminTransactions.colAmount')}
                {sortArrow('amount')}
              </th>
              <th
                onClick={() => toggleSort('commission')}
                aria-sort={
                  sortBy === 'commission'
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                className="cursor-pointer select-none px-3 py-3 text-right font-semibold text-on-dark/80 hover:text-on-dark"
              >
                {t('adminTransactions.colCommission')}
                {sortArrow('commission')}
              </th>
              <th className="px-3 py-3 text-left font-semibold text-on-dark/80">
                {t('adminTransactions.colStatus')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-glass/15">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-on-dark/70">
                  {t('adminTransactions.loading')}
                </td>
              </tr>
            ) : visiblePayments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-on-dark/70">
                  {t('adminTransactions.empty')}
                </td>
              </tr>
            ) : (
              pagePayments.map((p) => (
                <tr key={p.id_payment} className="text-on-dark/90">
                  <td className="break-all px-3 py-3 font-mono text-xs text-on-dark/80">
                    {p.transaction_ref || '—'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-on-dark/70">
                    {fmtDate(p.payment_date)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium">
                      {p.booking?.guest_first_name || p.booking?.guest_last_name
                        ? `${p.booking.guest_first_name || ''} ${p.booking.guest_last_name || ''}`.trim()
                        : '—'}
                    </div>
                    <div className="text-xs text-on-dark/60">{p.booking?.guest_email}</div>
                  </td>
                  <td className="px-3 py-3 text-on-dark/70">{p.booking?.boat_name || '—'}</td>
                  <td className="px-3 py-3 text-on-dark/70">
                    {t(`adminTransactions.methods.${p.payment_method}`, {
                      defaultValue: p.payment_method,
                    })}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-on-dark">
                    {EURO.format(p.amount)}
                    {p.status === 'refunded' && p.refunded_amount != null && (
                      <div className="text-xs font-normal text-action-soft">
                        {t('adminTransactions.refundedAmount', {
                          amount: EURO.format(p.refunded_amount),
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-success-soft">
                    {EURO.format(p.commission)}
                  </td>
                  <td className="px-3 py-3">
                    <span className={badge(STATUS_CLS[p.status])}>
                      {t(`adminTransactions.status.${p.status}`, { defaultValue: p.status })}
                    </span>
                    {p.id_dispute && (
                      <div className="mt-1 text-xs text-on-dark/60">
                        {t('adminTransactions.dispute', { id: p.id_dispute })}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cartes jusqu'au desktop large : le tableau ci-dessus est masqué. */}
      <ul className="mt-4 space-y-3 xl:hidden">
        {loading || visiblePayments.length === 0 ? (
          <li className="rounded-2xl border border-glass/20 bg-surface/10 px-4 py-8 text-center text-sm text-on-dark/70 backdrop-blur-xl">
            {loading ? t('adminTransactions.loading') : t('adminTransactions.empty')}
          </li>
        ) : (
          pagePayments.map((p) => (
            <li
              key={p.id_payment}
              className="rounded-2xl border border-glass/20 bg-surface/10 p-4 backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 break-all font-mono text-xs text-on-dark/80">
                  {p.transaction_ref || '—'}
                </span>
                <span className={`shrink-0 ${badge(STATUS_CLS[p.status])}`}>
                  {t(`adminTransactions.status.${p.status}`, { defaultValue: p.status })}
                </span>
              </div>

              <p className="mt-2 text-xs text-on-dark/60">{fmtDate(p.payment_date)}</p>

              <p className="mt-2 text-sm font-medium text-on-dark">
                {p.booking?.guest_first_name || p.booking?.guest_last_name
                  ? `${p.booking.guest_first_name || ''} ${p.booking.guest_last_name || ''}`.trim()
                  : '—'}
              </p>
              {p.booking?.guest_email && (
                <p className="break-all text-xs text-on-dark/60">{p.booking.guest_email}</p>
              )}
              <p className="mt-1 text-xs text-on-dark/70">
                {p.booking?.boat_name || '—'} ·{' '}
                {t(`adminTransactions.methods.${p.payment_method}`, {
                  defaultValue: p.payment_method,
                })}
              </p>

              <dl className="mt-3 space-y-1 border-t border-glass/15 pt-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-on-dark/70">{t('adminTransactions.colAmount')}</dt>
                  <dd className="font-medium text-on-dark">{EURO.format(p.amount)}</dd>
                </div>
                {p.status === 'refunded' && p.refunded_amount != null && (
                  <div className="flex justify-end">
                    <span className="text-xs text-action-soft">
                      {t('adminTransactions.refundedAmount', {
                        amount: EURO.format(p.refunded_amount),
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-on-dark/70">{t('adminTransactions.colCommission')}</dt>
                  <dd className="font-medium text-success-soft">{EURO.format(p.commission)}</dd>
                </div>
              </dl>

              {p.id_dispute && (
                <p className="mt-2 text-xs text-on-dark/60">
                  {t('adminTransactions.dispute', { id: p.id_dispute })}
                </p>
              )}
            </li>
          ))
        )}
      </ul>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={visiblePayments.length}
        onChange={setPage}
        label={t('adminTransactions.paginationLabel')}
        className="mt-4"
      />
    </section>
  );
}

export default AdminTransactionsPage;
