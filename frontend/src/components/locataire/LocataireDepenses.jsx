import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getPayments } from '../../services/locataireService.js';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

const STATUS_FILTERS = ['all', 'success', 'pending', 'refunded', 'failed'];
const PERIOD_FILTERS = ['all', 'last30', 'last180', 'year'];

function matchesPeriod(payment, period) {
  if (period === 'all') return true;
  const date = new Date(payment.payment_date);
  const now = new Date();
  if (period === 'last30') return now - date <= 30 * 86400000;
  if (period === 'last180') return now - date <= 180 * 86400000;
  return date.getFullYear() === now.getFullYear();
}

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});
const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const STATUS_CLS = {
  pending: 'bg-sky-500/15 text-sky-300',
  success: 'bg-emerald-500/15 text-emerald-300',
  refunded: 'bg-amber-500/15 text-amber-300',
  failed: 'bg-slate-500/15 text-slate-400',
};

function fmtDate(value) {
  return value ? DATE.format(new Date(value)) : '';
}

function StatTile({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function LocataireDepenses() {
  const { t } = useTranslation();
  const [totals, setTotals] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');

  const filtered = useMemo(
    () =>
      payments
        .filter((p) => filter === 'all' || p.status === filter)
        .filter((p) => matchesPeriod(p, periodFilter)),
    [payments, filter, periodFilter]
  );

  useEffect(() => {
    document.title = t('locataireDepenses.pageTitle');
  }, [t]);

  useEffect(() => {
    getPayments()
      .then((res) => {
        setTotals(res.data.totals);
        setPayments(res.data.payments || []);
      })
      .catch((err) => setError(err.response?.data?.message || t('locataireDepenses.loadError')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section aria-labelledby="depenses-title">
      <header className="mb-6">
        <h1 id="depenses-title" className="text-2xl font-bold text-white">
          {t('locataireDepenses.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-400">{t('locataireDepenses.subtitle')}</p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-300">{t('locataireDepenses.loading')}</p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatTile
              label={t('locataireDepenses.totals.paid')}
              value={EURO.format(totals?.paid ?? 0)}
              accent="text-white"
            />
            <StatTile
              label={t('locataireDepenses.totals.refunded')}
              value={EURO.format(totals?.refunded ?? 0)}
              accent="text-amber-300"
            />
            <StatTile
              label={t('locataireDepenses.totals.net')}
              value={EURO.format(totals?.net ?? 0)}
              accent="text-[#5AB4EC]"
            />
          </div>

          {/* Filtres par statut */}
          <div
            className="mb-3 flex flex-wrap gap-2"
            role="group"
            aria-label={t('locataireDepenses.filterAria')}
          >
            {STATUS_FILTERS.map((key) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${FOCUS_RING} ${
                    active
                      ? 'bg-[#0A3172] text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {t(`locataireDepenses.filters.${key}`)}
                </button>
              );
            })}
          </div>

          {/* Filtres par période, cumulables avec le statut */}
          <div
            className="mb-5 flex flex-wrap gap-2"
            role="group"
            aria-label={t('locataireDepenses.periodFilterAria')}
          >
            {PERIOD_FILTERS.map((key) => {
              const active = periodFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriodFilter(key)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${FOCUS_RING} ${
                    active
                      ? 'border-[#5AB4EC] bg-[#5AB4EC]/15 text-[#ABD4FF]'
                      : 'border-slate-700 bg-transparent text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {t(`locataireDepenses.periodFilters.${key}`)}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-8 text-center text-sm text-slate-400">
              {payments.length === 0
                ? t('locataireDepenses.empty')
                : t('locataireDepenses.emptyFiltered')}
            </p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((p) => (
                <li
                  key={p.id_payment}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{p.booking?.boat_name || '—'}</p>
                    {p.booking && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {t('locataireDepenses.stay', {
                          start: fmtDate(p.booking.start_date),
                          end: fmtDate(p.booking.end_date),
                        })}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t('locataireDepenses.paidOn', { date: fmtDate(p.payment_date) })}
                      {p.transaction_ref &&
                        ` · ${t('locataireDepenses.reference', { ref: p.transaction_ref })}`}
                    </p>
                    {p.refunded_amount != null && (
                      <p className="mt-1 text-xs font-medium text-amber-300">
                        {t('locataireDepenses.refundedDetail', {
                          amount: EURO.format(p.refunded_amount),
                          date: fmtDate(p.refunded_at),
                        })}
                        {p.refund_reason && ` — ${p.refund_reason}`}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-lg font-bold text-white">{EURO.format(p.amount)}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[p.status] || STATUS_CLS.failed}`}
                    >
                      {t(`locataireDepenses.status.${p.status}`, { defaultValue: p.status })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export default LocataireDepenses;
