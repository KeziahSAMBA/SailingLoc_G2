import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MdCreditCard, MdHourglassEmpty, MdReplay, MdClose } from 'react-icons/md';
import { getPayments } from '../../services/locataireService.js';
import CardSkeleton from '../common/CardSkeleton.jsx';
import { formatDate } from '../../utils/formatDate.js';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

const STATUS_FILTERS = ['all', 'success', 'pending', 'refunded', 'failed'];
const PERIOD_FILTERS = ['all', 'last30', 'last180', 'year'];

function ScrollableFilterRow({ ariaLabel, children, className, contentKey }) {
  const scrollRef = useRef(null);
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false });

  const updateScrollEdges = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;

    const tolerance = 2;
    const next = {
      left: node.scrollLeft > tolerance,
      right: node.scrollLeft + node.clientWidth < node.scrollWidth - tolerance,
    };

    setScrollEdges((current) =>
      current.left === next.left && current.right === next.right ? current : next
    );
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    const frame = window.requestAnimationFrame(updateScrollEdges);
    const resizeObserver = window.ResizeObserver
      ? new window.ResizeObserver(updateScrollEdges)
      : null;

    resizeObserver?.observe(node);
    window.addEventListener('resize', updateScrollEdges);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateScrollEdges);
    };
  }, [contentKey, updateScrollEdges]);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={scrollRef}
        onScroll={updateScrollEdges}
        className="flex max-w-full snap-x snap-proximity flex-nowrap gap-2 overflow-x-auto scroll-smooth pb-1 touch-pan-x [scrollbar-width:none] sm:snap-none sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label={ariaLabel}
      >
        {children}
      </div>

      {scrollEdges.left && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 items-center bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-transparent pl-1 text-white/90 sm:hidden"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 motion-safe:animate-pulse">
            <path
              d="m12.5 5-5 5 5 5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}

      {scrollEdges.right && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-end bg-gradient-to-l from-slate-950/95 via-slate-950/70 to-transparent pr-1 text-white/90 sm:hidden"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 motion-safe:animate-pulse">
            <path
              d="m7.5 5 5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </div>
  );
}

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
const DATE_OPTS = { day: 'numeric', month: 'long', year: 'numeric' };

const STATUS_CLS = {
  pending: 'bg-sky-500/15 text-sky-300',
  success: 'bg-emerald-500/15 text-emerald-300',
  refunded: 'bg-amber-500/15 text-amber-300',
  failed: 'bg-slate-500/15 text-white/70',
};

const STATUS_ICON = {
  pending: MdHourglassEmpty,
  success: MdCreditCard,
  refunded: MdReplay,
  failed: MdClose,
};

function fmtDate(value) {
  return formatDate(value, DATE_OPTS);
}

function StatTile({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{label}</p>
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
        <p className="mt-1 text-sm text-white/70">{t('locataireDepenses.subtitle')}</p>
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
        <CardSkeleton count={4} height="h-32" withIcon />
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
          <ScrollableFilterRow
            className="mb-3"
            ariaLabel={t('locataireDepenses.filterAria')}
            contentKey={STATUS_FILTERS.map((key) => t(`locataireDepenses.filters.${key}`)).join(
              '|'
            )}
          >
            {STATUS_FILTERS.map((key) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={active}
                  className={`shrink-0 snap-start rounded-full px-3 py-1.5 text-sm font-medium transition ${FOCUS_RING} ${
                    active
                      ? 'bg-sky-500 text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {t(`locataireDepenses.filters.${key}`)}
                </button>
              );
            })}
          </ScrollableFilterRow>

          {/* Filtres par période, cumulables avec le statut */}
          <ScrollableFilterRow
            className="mb-5"
            ariaLabel={t('locataireDepenses.periodFilterAria')}
            contentKey={PERIOD_FILTERS.map((key) =>
              t(`locataireDepenses.periodFilters.${key}`)
            ).join('|')}
          >
            {PERIOD_FILTERS.map((key) => {
              const active = periodFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriodFilter(key)}
                  aria-pressed={active}
                  className={`shrink-0 snap-start rounded-full border px-3 py-1 text-xs font-medium transition ${FOCUS_RING} ${
                    active
                      ? 'border-[#5AB4EC] bg-[#5AB4EC]/15 text-[#ABD4FF]'
                      : 'border-white/30 bg-transparent text-white/70 hover:border-white/50 hover:text-white'
                  }`}
                >
                  {t(`locataireDepenses.periodFilters.${key}`)}
                </button>
              );
            })}
          </ScrollableFilterRow>

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-8 text-center text-sm text-white/70">
              {payments.length === 0
                ? t('locataireDepenses.empty')
                : t('locataireDepenses.emptyFiltered')}
            </p>
          ) : (
            <ul className="grid gap-3 xl:grid-cols-2">
              {filtered.map((p) => {
                const Icon = STATUS_ICON[p.status] || MdClose;
                const cls = STATUS_CLS[p.status] || STATUS_CLS.failed;
                return (
                  <li key={p.id_payment} className="min-w-0">
                    <article className="flex h-32 items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl transition hover:border-[#5AB4EC]/60 hover:bg-white/15">
                      <span
                        aria-hidden
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${cls}`}
                      >
                        <Icon />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="truncate text-sm font-bold text-white">
                            {p.booking?.boat_name || '—'}
                          </h3>
                          <span className="shrink-0 text-lg font-bold text-white">
                            {EURO.format(p.amount)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-white/70">
                          {p.booking &&
                            `${t('locataireDepenses.stay', {
                              start: fmtDate(p.booking.start_date),
                              end: fmtDate(p.booking.end_date),
                            })} · `}
                          {t('locataireDepenses.paidOn', { date: fmtDate(p.payment_date) })}
                        </p>
                        {p.transaction_ref && (
                          <p className="mt-0.5 truncate text-[0.6875rem] text-white/40">
                            {t('locataireDepenses.reference', { ref: p.transaction_ref })}
                          </p>
                        )}
                        <div className="mt-2 flex min-w-0 items-center gap-2">
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${cls}`}
                          >
                            {t(`locataireDepenses.status.${p.status}`, { defaultValue: p.status })}
                          </span>
                          {p.refunded_amount != null && (
                            <span
                              className="truncate text-[0.6875rem] font-medium text-amber-300"
                              title={p.refund_reason || undefined}
                            >
                              {t('locataireDepenses.refundedDetail', {
                                amount: EURO.format(p.refunded_amount),
                                date: fmtDate(p.refunded_at),
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export default LocataireDepenses;
