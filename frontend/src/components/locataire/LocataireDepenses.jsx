import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MdCreditCard, MdHourglassEmpty, MdReplay, MdClose } from 'react-icons/md';
import { getPayments } from '../../services/locataireService.js';
import CardSkeleton from '../common/CardSkeleton.jsx';
import { formatDate } from '../../utils/formatDate.js';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0';

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
          className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 items-center bg-gradient-to-r from-dark-strong/95 via-dark-strong/70 to-transparent pl-1 text-on-dark/90 sm:hidden"
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
          className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-end bg-gradient-to-l from-dark-strong/95 via-dark-strong/70 to-transparent pr-1 text-on-dark/90 sm:hidden"
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
  pending: 'status-indicator status-indicator--warning bg-action/15 text-action-soft',
  success: 'status-indicator status-indicator--success bg-success-base/15 text-success-soft',
  refunded: 'status-indicator status-indicator--info bg-warning-base/15 text-warning-soft',
  failed: 'status-indicator status-indicator--danger bg-neutral/15 text-on-dark/70',
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
    <div className="rounded-2xl border border-glass/20 bg-surface/10 px-5 py-4 text-center backdrop-blur-xl sm:text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-on-dark/60">{label}</p>
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
        <h1 id="depenses-title" className="text-2xl font-bold text-on-dark">
          {t('locataireDepenses.title')}
        </h1>
        <p className="mt-1 text-sm text-on-dark/70">{t('locataireDepenses.subtitle')}</p>
      </header>

      {error && (
        <div
          role="alert"
          className="status-indicator status-indicator--danger mb-5 rounded-lg border border-danger-base/40 bg-danger-base/10 px-4 py-2 text-sm text-danger-soft"
        >
          {error}
        </div>
      )}

      {loading ? (
        <CardSkeleton count={4} height="h-32" withIcon />
      ) : (
        <>
          <div className="mx-auto mb-6 grid w-3/4 gap-4 sm:w-full sm:grid-cols-3">
            <StatTile
              label={t('locataireDepenses.totals.paid')}
              value={EURO.format(totals?.paid ?? 0)}
              accent="text-on-dark"
            />
            <StatTile
              label={t('locataireDepenses.totals.refunded')}
              value={EURO.format(totals?.refunded ?? 0)}
              accent="text-warning-soft"
            />
            <StatTile
              label={t('locataireDepenses.totals.net')}
              value={EURO.format(totals?.net ?? 0)}
              accent="text-brand"
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
                      ? 'bg-action text-action-text'
                      : 'bg-surface/10 text-on-dark/80 hover:bg-surface/20 hover:text-on-dark'
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
                      ? 'border-brand bg-brand/15 text-brand-soft'
                      : 'border-glass/30 bg-transparent text-on-dark/70 hover:border-glass/50 hover:text-on-dark'
                  }`}
                >
                  {t(`locataireDepenses.periodFilters.${key}`)}
                </button>
              );
            })}
          </ScrollableFilterRow>

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-glass/20 bg-surface/10 px-4 py-8 text-center text-sm text-on-dark/70 backdrop-blur-xl">
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
                    <article className="flex h-32 items-center gap-4 rounded-2xl border border-glass/20 bg-surface/10 p-4 backdrop-blur-xl transition hover:border-brand/60 hover:bg-surface/15">
                      <span
                        aria-hidden
                        className={`status-indicator--has-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${cls}`}
                      >
                        <Icon />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="truncate text-sm font-bold text-on-dark">
                            {p.booking?.boat_name || '—'}
                          </h3>
                          <span className="shrink-0 text-lg font-bold text-on-dark">
                            {EURO.format(p.amount)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-on-dark/70">
                          {p.booking &&
                            `${t('locataireDepenses.stay', {
                              start: fmtDate(p.booking.start_date),
                              end: fmtDate(p.booking.end_date),
                            })} · `}
                          {t('locataireDepenses.paidOn', { date: fmtDate(p.payment_date) })}
                        </p>
                        {p.transaction_ref && (
                          <p className="mt-0.5 truncate text-[0.6875rem] text-content-light">
                            {t('locataireDepenses.reference', { ref: p.transaction_ref })}
                          </p>
                        )}
                        <div className="mt-2 flex min-w-0 items-center gap-2">
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${cls}`}
                          >
                            {t(`locataireDepenses.status.${p.status}`, {
                              defaultValue: p.status,
                            })}
                          </span>
                          {p.refunded_amount != null && (
                            <span
                              className="truncate text-[0.6875rem] font-medium text-warning-soft"
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
