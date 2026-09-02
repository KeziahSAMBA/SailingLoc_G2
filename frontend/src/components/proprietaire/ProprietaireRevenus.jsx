import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getPayments,
  getStripeAccount,
  startStripeOnboarding,
  getStripeLoginLink,
} from '../../services/proprietaireService.js';
import { useToast } from '../../hooks/useToast.jsx';
import Spinner from '../common/Spinner.jsx';
import { formatDate } from '../../utils/formatDate.js';

const EURO = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const EURO_ROUND = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const DATE_OPTS = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};
const MONTH_SHORT_OPTS = { month: 'short' };
const MONTH_FULL_OPTS = { month: 'long', year: 'numeric' };

// Bleu des graphiques : la teinte est centralisée dans les tokens du thème.
// (luminosité + contraste ≥ 3:1) sur la surface sombre du dashboard.
const CHART_BLUE = 'rgb(var(--sl-chart-primary))';
const CHART_BLUE_HOVER = 'rgb(var(--sl-chart-hover))';

const PAYMENT_STATUS_CLS = {
  pending: 'bg-warning-base/15 text-warning-soft',
  success: 'bg-success-base/15 text-success-soft',
  failed: 'bg-danger-base/15 text-danger-soft',
  refunded: 'bg-neutral/15 text-on-dark/80',
};

const STATUS_KEYS = ['all', 'success', 'pending', 'refunded', 'failed'];
const PERIOD_KEYS = ['all', '12m', 'year', '30d'];

const PAGE_SIZE = 7;

function ScrollableFilterRow({ ariaLabel, children, className = '', contentKey }) {
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

// Borne basse (incluse) de la période ; null = pas de borne.
function periodStart(key) {
  const now = new Date();
  if (key === 'year') return new Date(now.getFullYear(), 0, 1);
  if (key === '12m') return new Date(now.getFullYear(), now.getMonth() - 11, 1);
  if (key === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  return null;
}

function fmtDate(value) {
  return formatDate(value, DATE_OPTS);
}

// Arrondit le plafond de l'axe Y à une valeur « propre » (1/2/2,5/5 × 10^n).
function niceMax(value) {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => value <= s * pow) ?? 10;
  return step * pow;
}

// Colonne à sommet arrondi (4 unités SVG) et base carrée, ancrée sur la ligne de base.
function roundedTopRect(x, y, w, h) {
  const r = Math.min(4, h, w / 2);
  return `M ${x} ${y + h} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h} Z`;
}

// Diagramme en colonnes des revenus nets par mois (série unique : pas de
// légende, le titre de la carte nomme la donnée). Tooltip au survol et au
// focus clavier ; les valeurs restent lisibles sans survol via le tableau.
function MonthlyChart({ months }) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(null); // index de la colonne survolée

  const W = 560;
  const H = 220;
  const PAD = { top: 16, right: 8, bottom: 26, left: 56 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const max = niceMax(Math.max(...months.map((m) => m.net)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const band = plotW / months.length;
  const barW = Math.min(24, band * 0.6);
  const labelEvery = Math.ceil(months.length / 8);

  const y = (v) => PAD.top + plotH - (v / max) * plotH;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={t('proprietaireRevenus.chartAria', {
          series: months.map((m) => `${m.fullLabel} ${EURO_ROUND.format(m.net)}`).join(', '),
        })}
      >
        {/* Grille : traits fins et discrets, valeurs arrondies */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="rgb(var(--sl-glass) / 0.15)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y(t) + 3}
              textAnchor="end"
              className="fill-on-dark/50 text-[0.625rem]"
            >
              {EURO_ROUND.format(t)}
            </text>
          </g>
        ))}

        {months.map((m, i) => {
          const cx = PAD.left + band * i + band / 2;
          const h = Math.max((m.net / max) * plotH, m.net > 0 ? 2 : 0);
          const top = PAD.top + plotH - h;
          const active = hover === i;
          return (
            <g key={m.key}>
              {h > 0 && (
                <path
                  d={roundedTopRect(cx - barW / 2, top, barW, h)}
                  fill={active ? CHART_BLUE_HOVER : CHART_BLUE}
                />
              )}
              {/* Valeur au sommet, seulement quand il y a peu de colonnes */}
              {months.length <= 8 && m.net > 0 && (
                <text
                  x={cx}
                  y={top - 6}
                  textAnchor="middle"
                  className="fill-on-dark/90 text-[0.6875rem] font-medium"
                >
                  {EURO_ROUND.format(m.net)}
                </text>
              )}
              {i % labelEvery === 0 && (
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  className="fill-on-dark/60 text-[0.625rem]"
                >
                  {m.label}
                </text>
              )}
              {/* Zone de survol/focus plus large que la colonne */}
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={t('proprietaireRevenus.barAria', {
                  month: m.fullLabel,
                  value: EURO_ROUND.format(m.net),
                })}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip : la valeur d'abord, le libellé ensuite */}
      {hover != null && (
        <div
          className="pointer-events-none absolute -top-1 rounded-lg border border-glass/20 bg-dark-strong/90 px-3 py-1.5 shadow-lg backdrop-blur-xl"
          style={{
            left: `${((PAD.left + band * hover + band / 2) / W) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="whitespace-nowrap text-sm font-semibold text-on-dark">
            {EURO_ROUND.format(months[hover].net)}
          </p>
          <p className="whitespace-nowrap text-xs text-on-dark/70">{months[hover].fullLabel}</p>
        </div>
      )}
    </div>
  );
}

// Barres horizontales des revenus nets par bateau, triées. Chaque barre porte
// son nom et sa valeur en label direct : rien n'est caché derrière un survol.
function BoatChart({ boats }) {
  const max = Math.max(...boats.map((b) => b.net));
  return (
    <ul className="space-y-3">
      {boats.map((b) => (
        <li key={b.name}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-on-dark/80">{b.name}</span>
            <span className="shrink-0 text-sm font-medium text-on-dark">
              {EURO_ROUND.format(b.net)}
            </span>
          </div>
          <div className="h-3 rounded-r bg-surface/10">
            <div
              className="h-3 rounded-r"
              style={{
                width: `${Math.max((b.net / max) * 100, 1)}%`,
                backgroundColor: CHART_BLUE,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TotalCard({ label, value, accent = 'text-on-dark', hint }) {
  return (
    <li className="rounded-2xl border border-glass/20 bg-surface/10 p-5 text-center backdrop-blur-xl sm:text-left">
      <span className="block text-xs font-semibold uppercase tracking-wide text-on-dark/70">
        {label}
      </span>
      <span className={`mt-2 block text-3xl font-bold ${accent}`}>{EURO.format(value ?? 0)}</span>
      {hint && <span className="mt-1 block text-xs text-on-dark/60">{hint}</span>}
    </li>
  );
}

function TransactionCard({ payment }) {
  const { t } = useTranslation();
  const statusCls = PAYMENT_STATUS_CLS[payment.status] || 'bg-neutral/15 text-on-dark/80';

  return (
    <article className="px-4 py-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <time dateTime={payment.payment_date} className="block text-xs text-on-dark/60">
            {fmtDate(payment.payment_date)}
          </time>
          <h3 className="mt-1 break-words text-sm font-semibold text-on-dark">
            {payment.booking?.boat_name}
          </h3>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls}`}>
          {t(`proprietaireRevenus.status.${payment.status}`, {
            defaultValue: payment.status,
          })}
        </span>
      </header>

      {payment.booking && (
        <p className="mt-1 break-words text-xs leading-relaxed text-on-dark/70">
          {payment.booking.locataire}
          {payment.booking.locataire && ' · '}
          <time dateTime={payment.booking.start_date}>
            {fmtDate(payment.booking.start_date)}
          </time> →{' '}
          <time dateTime={payment.booking.end_date}>{fmtDate(payment.booking.end_date)}</time>
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-on-dark/60">{t('proprietaireRevenus.table.method')}</dt>
          <dd className="mt-0.5 break-words text-on-dark/80">
            {t(`proprietaireRevenus.method.${payment.payment_method}`, {
              defaultValue: payment.payment_method,
            })}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-on-dark/60">{t('proprietaireRevenus.table.gross')}</dt>
          <dd className="mt-0.5 font-medium text-on-dark">{EURO.format(payment.amount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-on-dark/60">{t('proprietaireRevenus.table.commission')}</dt>
          <dd className="mt-0.5 font-medium text-warning-soft">
            − {EURO.format(payment.commission)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-on-dark/60">{t('proprietaireRevenus.table.net')}</dt>
          <dd className="mt-0.5 font-semibold text-success-soft">{EURO.format(payment.net)}</dd>
        </div>
      </dl>

      {payment.status === 'refunded' && payment.refunded_amount != null && (
        <p className="mt-3 break-words rounded-lg bg-surface/5 px-3 py-2 text-xs text-on-dark/70">
          {t('proprietaireRevenus.refundedAmount', {
            amount: EURO.format(payment.refunded_amount),
          })}
          {payment.refund_reason && ` — ${payment.refund_reason}`}
        </p>
      )}
    </article>
  );
}

function ProprietaireRevenus() {
  const { t, i18n } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');
  const [period, setPeriod] = useState('all');
  const [page, setPage] = useState(1);
  // Compte Stripe Connect : null tant que le statut n'est pas chargé.
  const [stripeAccount, setStripeAccount] = useState(null);
  const [onboarding, setOnboarding] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    getStripeAccount()
      .then((res) => setStripeAccount(res.data))
      .catch(() => setStripeAccount({ enabled: false }));
  }, []);

  async function handleOnboarding() {
    setOnboarding(true);
    try {
      const res = await startStripeOnboarding();
      window.location.assign(res.data.url);
    } catch (err) {
      showToast(err.response?.data?.message || t('proprietaireRevenus.genericError'), 'error');
      setOnboarding(false);
    }
  }

  // Le lien de connexion Express expire vite : généré à la demande, à chaque clic.
  async function handleManageAccount() {
    setOnboarding(true);
    try {
      const res = await getStripeLoginLink();
      window.open(res.data.url, '_blank', 'noopener');
    } catch (err) {
      showToast(err.response?.data?.message || t('proprietaireRevenus.genericError'), 'error');
    } finally {
      setOnboarding(false);
    }
  }

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = t('proprietaireRevenus.pageTitle');
  }, [t]);

  useEffect(() => {
    getPayments()
      .then((res) => setPayments(res.data.payments || []))
      .catch((err) => setError(err.response?.data?.message || t('proprietaireRevenus.loadError')))
      .finally(() => setLoading(false));
  }, []);

  const inPeriod = useMemo(() => {
    const from = periodStart(period);
    if (!from) return payments;
    return payments.filter((p) => new Date(p.payment_date) >= from);
  }, [payments, period]);

  const statusCounts = useMemo(() => {
    const counts = { all: inPeriod.length };
    for (const p of inPeriod) counts[p.status] = (counts[p.status] || 0) + 1;
    return counts;
  }, [inPeriod]);

  const filtered = useMemo(
    () => (status === 'all' ? inPeriod : inPeriod.filter((p) => p.status === status)),
    [inPeriod, status]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Un changement de filtre peut rendre la page courante inexistante.
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  useEffect(() => {
    setPage(1);
  }, [status, period]);

  // Totaux recalculés sur la sélection : ils somment exactement les lignes affichées.
  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, p) => ({
          gross: acc.gross + (p.amount || 0),
          commission: acc.commission + (p.commission || 0),
          net: acc.net + (p.net || 0),
          count: acc.count + 1,
        }),
        { gross: 0, commission: 0, net: 0, count: 0 }
      ),
    [filtered]
  );

  // Revenus nets par mois (paiements encaissés), mois sans revenu compris —
  // un axe temporel honnête ne saute pas les mois vides.
  const months = useMemo(() => {
    const success = filtered.filter((p) => p.status === 'success');
    if (success.length === 0) return [];
    const byKey = new Map();
    let first = Infinity;
    let last = -Infinity;
    for (const p of success) {
      const d = new Date(p.payment_date);
      const key = d.getFullYear() * 12 + d.getMonth();
      byKey.set(key, (byKey.get(key) || 0) + p.net);
      if (key < first) first = key;
      if (key > last) last = key;
    }
    const spansYears = Math.floor(first / 12) !== Math.floor(last / 12);
    const out = [];
    for (let key = first; key <= last; key += 1) {
      const d = new Date(Math.floor(key / 12), key % 12, 1);
      out.push({
        key,
        net: byKey.get(key) || 0,
        label: spansYears
          ? `${formatDate(d, MONTH_SHORT_OPTS)} ${String(d.getFullYear()).slice(2)}`
          : formatDate(d, MONTH_SHORT_OPTS),
        fullLabel: formatDate(d, MONTH_FULL_OPTS),
      });
    }
    return out;
  }, [filtered, i18n.language]);

  // Revenus nets par bateau (paiements encaissés), du plus rentable au moins
  // rentable ; au-delà de 7 bateaux, la queue est repliée dans « Autres ».
  const boats = useMemo(() => {
    const byName = new Map();
    for (const p of filtered) {
      if (p.status !== 'success') continue;
      const name = p.booking?.boat_name || t('proprietaireRevenus.otherBoat');
      byName.set(name, (byName.get(name) || 0) + p.net);
    }
    const sorted = [...byName.entries()]
      .map(([name, net]) => ({ name, net }))
      .sort((a, b) => b.net - a.net);
    if (sorted.length === 0) return [];
    if (sorted.length <= 7) return sorted;
    const head = sorted.slice(0, 6);
    const tail = sorted.slice(6).reduce((sum, b) => sum + b.net, 0);
    return [...head, { name: t('proprietaireRevenus.otherBoats'), net: tail }];
  }, [filtered]);

  return (
    <section aria-labelledby="revenus-title">
      <header className="mb-6">
        <h1 id="revenus-title" className="text-2xl font-bold text-on-dark">
          {t('proprietaireRevenus.title')}
        </h1>
        <p className="mt-1 text-sm text-on-dark/70">{t('proprietaireRevenus.subtitle')}</p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-danger-base/40 bg-danger-base/10 px-4 py-2 text-sm text-danger-soft"
        >
          {error}
        </div>
      )}

      {/* Virements Stripe Connect : l'IBAN est collecté par Stripe, jamais ici. */}
      {stripeAccount?.enabled && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-on-dark">
              {t('proprietaireRevenus.stripe.title')}
            </h2>
            <p className="mt-0.5 text-xs text-on-dark/70">
              {stripeAccount.onboarded
                ? t('proprietaireRevenus.stripe.onboarded')
                : stripeAccount.has_account
                  ? t('proprietaireRevenus.stripe.incomplete')
                  : t('proprietaireRevenus.stripe.notStarted')}
            </p>
          </div>
          {stripeAccount.onboarded ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-success-base/15 px-3 py-1 text-xs font-semibold text-success-soft">
                {t('proprietaireRevenus.stripe.enabled')}
              </span>
              <button
                type="button"
                onClick={handleManageAccount}
                disabled={onboarding}
                className="rounded-full border border-glass/40 px-4 py-2 text-sm font-semibold text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {onboarding
                  ? t('proprietaireRevenus.stripe.opening')
                  : t('proprietaireRevenus.stripe.manage')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleOnboarding}
              disabled={onboarding}
              className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-on-dark transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {onboarding
                ? t('proprietaireRevenus.stripe.redirecting')
                : stripeAccount.has_account
                  ? t('proprietaireRevenus.stripe.resume')
                  : t('proprietaireRevenus.stripe.setup')}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <Spinner label={t('common.loading', { defaultValue: 'Chargement…' })} />
      ) : (
        <>
          {payments.length > 0 && (
            <div className="mb-5 space-y-3">
              <ScrollableFilterRow
                ariaLabel={t('proprietaireRevenus.filterAria')}
                contentKey={STATUS_KEYS.map(
                  (key) =>
                    `${key}:${t(`proprietaireRevenus.filters.${key}`)}:${statusCounts[key] || 0}`
                ).join('|')}
              >
                {STATUS_KEYS.map((key) => {
                  const active = status === key;
                  const count = statusCounts[key] || 0;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatus(key)}
                      aria-pressed={active}
                      className={`shrink-0 snap-start rounded-full px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        active
                          ? 'bg-action text-on-dark'
                          : 'bg-surface/10 text-on-dark/80 hover:bg-surface/20 hover:text-on-dark'
                      }`}
                    >
                      {t(`proprietaireRevenus.filters.${key}`)}
                      {key !== 'all' && count > 0 && ` (${count})`}
                    </button>
                  );
                })}
              </ScrollableFilterRow>

              <ScrollableFilterRow
                ariaLabel={t('proprietaireRevenus.periodLabel')}
                contentKey={PERIOD_KEYS.map(
                  (key) => `${key}:${t(`proprietaireRevenus.periods.${key}`)}`
                ).join('|')}
              >
                {PERIOD_KEYS.map((key) => {
                  const active = period === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPeriod(key)}
                      aria-pressed={active}
                      className={`shrink-0 snap-start rounded-full border px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        active
                          ? 'border-brand bg-brand/15 text-brand-soft'
                          : 'border-glass/30 bg-transparent text-on-dark/70 hover:border-glass/50 hover:text-on-dark'
                      }`}
                    >
                      {t(`proprietaireRevenus.periods.${key}`)}
                    </button>
                  );
                })}
              </ScrollableFilterRow>
            </div>
          )}

          {/* Totaux : somme des transactions correspondant aux filtres actifs */}
          <ul
            className="mx-auto grid w-3/4 gap-4 sm:w-full sm:grid-cols-3"
            aria-label={t('proprietaireRevenus.totalsAria')}
          >
            <TotalCard
              label={t('proprietaireRevenus.netEarnings')}
              value={totals.net}
              accent="text-success-soft"
              hint={
                t('proprietaireRevenus.transactionCount', { count: totals.count }) +
                (status === 'all'
                  ? ''
                  : ` · ${t(`proprietaireRevenus.filters.${status}`).toLowerCase()}`)
              }
            />
            <TotalCard label={t('proprietaireRevenus.grossAmount')} value={totals.gross} />
            <TotalCard
              label={t('proprietaireRevenus.commissions')}
              value={totals.commission}
              accent="text-warning-soft"
              hint={t('proprietaireRevenus.commissionHint')}
            />
          </ul>

          {/* Graphiques : évolution mensuelle et répartition par bateau */}
          {months.length > 0 && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section
                aria-labelledby="chart-months-title"
                className="rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl p-5"
              >
                <h2 id="chart-months-title" className="text-sm font-semibold text-on-dark/90">
                  {t('proprietaireRevenus.chartMonths')}
                </h2>
                <p className="mb-4 mt-0.5 text-xs text-on-dark/60">
                  {t('proprietaireRevenus.chartMonthsHint')}
                </p>
                <MonthlyChart months={months} />
              </section>

              <section
                aria-labelledby="chart-boats-title"
                className="rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl p-5"
              >
                <h2 id="chart-boats-title" className="text-sm font-semibold text-on-dark/90">
                  {t('proprietaireRevenus.chartBoats')}
                </h2>
                <p className="mb-4 mt-0.5 text-xs text-on-dark/60">
                  {t('proprietaireRevenus.chartBoatsHint')}
                </p>
                <BoatChart boats={boats} />
              </section>
            </div>
          )}

          {/* Historique des transactions */}
          <div className="mt-6 rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl">
            <h2 className="border-b border-glass/20 px-5 py-4 text-sm font-semibold text-on-dark/90">
              {t('proprietaireRevenus.history')}
              {filtered.length !== payments.length && (
                <span className="ml-2 font-normal text-on-dark/60">
                  {t('proprietaireRevenus.historyCount', {
                    shown: filtered.length,
                    total: payments.length,
                  })}
                </span>
              )}
            </h2>

            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-on-dark/70">
                {payments.length === 0
                  ? t('proprietaireRevenus.emptyAll')
                  : t('proprietaireRevenus.emptyFilter')}
              </p>
            ) : (
              <>
                <ul
                  className="divide-y divide-glass/15 xl:hidden"
                  aria-label={t('proprietaireRevenus.history')}
                >
                  {pageRows.map((payment) => (
                    <li key={payment.id_payment}>
                      <TransactionCard payment={payment} />
                    </li>
                  ))}
                </ul>

                <div className="hidden overflow-x-auto xl:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-glass/20 text-xs uppercase tracking-wide text-on-dark/60">
                        <th scope="col" className="px-5 py-3 font-semibold">
                          {t('proprietaireRevenus.table.date')}
                        </th>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          {t('proprietaireRevenus.table.rental')}
                        </th>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          {t('proprietaireRevenus.table.method')}
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-semibold">
                          {t('proprietaireRevenus.table.gross')}
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-semibold">
                          {t('proprietaireRevenus.table.commission')}
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-semibold">
                          {t('proprietaireRevenus.table.net')}
                        </th>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          {t('proprietaireRevenus.table.status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-glass/15">
                      {pageRows.map((p) => {
                        const statusCls =
                          PAYMENT_STATUS_CLS[p.status] || 'bg-neutral/15 text-on-dark/80';
                        return (
                          <tr key={p.id_payment}>
                            <td className="whitespace-nowrap px-5 py-3 text-on-dark/80">
                              <time dateTime={p.payment_date}>{fmtDate(p.payment_date)}</time>
                            </td>
                            <td className="px-5 py-3">
                              <p className="font-medium text-on-dark">{p.booking?.boat_name}</p>
                              <p className="text-xs text-on-dark/70">
                                {p.booking?.locataire}
                                {p.booking && (
                                  <>
                                    {' · '}
                                    <time dateTime={p.booking.start_date}>
                                      {fmtDate(p.booking.start_date)}
                                    </time>{' '}
                                    →{' '}
                                    <time dateTime={p.booking.end_date}>
                                      {fmtDate(p.booking.end_date)}
                                    </time>
                                  </>
                                )}
                              </p>
                              {p.status === 'refunded' && p.refunded_amount != null && (
                                <p className="mt-1 text-xs text-on-dark/70">
                                  {t('proprietaireRevenus.refundedAmount', {
                                    amount: EURO.format(p.refunded_amount),
                                  })}
                                  {p.refund_reason && ` — ${p.refund_reason}`}
                                </p>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-on-dark/80">
                              {t(`proprietaireRevenus.method.${p.payment_method}`, {
                                defaultValue: p.payment_method,
                              })}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-right text-on-dark">
                              {EURO.format(p.amount)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-right text-warning-soft">
                              − {EURO.format(p.commission)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-success-soft">
                              {EURO.format(p.net)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls}`}
                              >
                                {t(`proprietaireRevenus.status.${p.status}`, {
                                  defaultValue: p.status,
                                })}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {pageCount > 1 && (
              <nav
                aria-label="Pagination de l'historique"
                className="flex flex-wrap items-center justify-between gap-3 border-t border-glass/20 px-5 py-3"
              >
                <p className="text-xs text-on-dark/60" aria-live="polite">
                  {t('proprietaireRevenus.paginationRange', {
                    first: (safePage - 1) * PAGE_SIZE + 1,
                    last: Math.min(safePage * PAGE_SIZE, filtered.length),
                    total: filtered.length,
                  })}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage === 1}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {t('pagination.previous')}
                  </button>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      aria-current={n === safePage ? 'page' : undefined}
                      aria-label={t('pagination.page', { n })}
                      className={`min-w-[2rem] rounded-full px-2.5 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        n === safePage
                          ? 'bg-action text-on-dark'
                          : 'text-on-dark/80 hover:bg-surface/10 hover:text-on-dark'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage === pageCount}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {t('pagination.next')}
                  </button>
                </div>
              </nav>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default ProprietaireRevenus;
