import { useState, useEffect, useMemo } from 'react';
import {
  getPayments,
  getStripeAccount,
  startStripeOnboarding,
  getStripeLoginLink,
} from '../../services/proprietaireService.js';
import { useToast } from '../../hooks/useToast.jsx';
import Spinner from '../common/Spinner.jsx';

const EURO = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const EURO_ROUND = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const DATE = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const MONTH_SHORT = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const MONTH_FULL = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

// Bleu des graphiques : pas plus foncé que l'accent #5AB4EC du site, validé
// (luminosité + contraste ≥ 3:1) sur la surface sombre du dashboard.
const CHART_BLUE = '#3E97D6';
const CHART_BLUE_HOVER = '#5AB4EC';

const PAYMENT_STATUS = {
  pending: { label: 'En attente', cls: 'bg-amber-500/15 text-amber-300' },
  success: { label: 'Encaissé', cls: 'bg-emerald-500/15 text-emerald-300' },
  failed: { label: 'Échoué', cls: 'bg-red-500/15 text-red-300' },
  refunded: { label: 'Remboursé', cls: 'bg-slate-500/15 text-white/80' },
};

const PAYMENT_METHOD = {
  card: 'Carte bancaire',
  bank_transfer: 'Virement',
};

const STATUS_FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'success', label: 'Encaissés' },
  { key: 'pending', label: 'En attente' },
  { key: 'refunded', label: 'Remboursés' },
  { key: 'failed', label: 'Échoués' },
];

const PERIOD_FILTERS = [
  { key: 'all', label: 'Depuis le début' },
  { key: '12m', label: '12 derniers mois' },
  { key: 'year', label: 'Année en cours' },
  { key: '30d', label: '30 derniers jours' },
];

const PAGE_SIZE = 7;

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
  return value ? DATE.format(new Date(value)) : '';
}

// Arrondit le plafond de l'axe Y à une valeur « propre » (1/2/2,5/5 × 10^n).
function niceMax(value) {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => value <= s * pow) ?? 10;
  return step * pow;
}

// Colonne à sommet arrondi (4px) et base carrée, ancrée sur la ligne de base.
function roundedTopRect(x, y, w, h) {
  const r = Math.min(4, h, w / 2);
  return `M ${x} ${y + h} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h} Z`;
}

// Diagramme en colonnes des revenus nets par mois (série unique : pas de
// légende, le titre de la carte nomme la donnée). Tooltip au survol et au
// focus clavier ; les valeurs restent lisibles sans survol via le tableau.
function MonthlyChart({ months }) {
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
        aria-label={`Revenus nets par mois : ${months
          .map((m) => `${m.fullLabel} ${EURO_ROUND.format(m.net)}`)
          .join(', ')}`}
      >
        {/* Grille : traits fins et discrets, valeurs arrondies */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y(t) + 3}
              textAnchor="end"
              className="fill-white/50 text-[10px]"
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
                  className="fill-white/90 text-[11px] font-medium"
                >
                  {EURO_ROUND.format(m.net)}
                </text>
              )}
              {i % labelEvery === 0 && (
                <text x={cx} y={H - 8} textAnchor="middle" className="fill-white/60 text-[10px]">
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
                aria-label={`${m.fullLabel} : ${EURO_ROUND.format(m.net)} nets`}
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
          className="pointer-events-none absolute -top-1 rounded-lg border border-white/20 bg-slate-950/90 px-3 py-1.5 shadow-lg backdrop-blur-xl"
          style={{
            left: `${((PAD.left + band * hover + band / 2) / W) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="whitespace-nowrap text-sm font-semibold text-white">
            {EURO_ROUND.format(months[hover].net)}
          </p>
          <p className="whitespace-nowrap text-xs text-white/70">{months[hover].fullLabel}</p>
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
            <span className="truncate text-sm text-white/80">{b.name}</span>
            <span className="shrink-0 text-sm font-medium text-white">
              {EURO_ROUND.format(b.net)}
            </span>
          </div>
          <div className="h-3 rounded-r bg-white/10">
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

function TotalCard({ label, value, accent = 'text-white', hint }) {
  return (
    <li className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5">
      <span className="block text-xs font-semibold uppercase tracking-wide text-white/70">
        {label}
      </span>
      <span className={`mt-2 block text-3xl font-bold ${accent}`}>{EURO.format(value ?? 0)}</span>
      {hint && <span className="mt-1 block text-xs text-white/60">{hint}</span>}
    </li>
  );
}

function ProprietaireRevenus() {
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
      showToast(err.response?.data?.message || 'Une erreur est survenue.', 'error');
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
      showToast(err.response?.data?.message || 'Une erreur est survenue.', 'error');
    } finally {
      setOnboarding(false);
    }
  }

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Mes revenus — SailingLoc';
  }, []);

  useEffect(() => {
    getPayments()
      .then((res) => setPayments(res.data.payments || []))
      .catch((err) => setError(err.response?.data?.message || 'Erreur de chargement des revenus.'))
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
          ? `${MONTH_SHORT.format(d)} ${String(d.getFullYear()).slice(2)}`
          : MONTH_SHORT.format(d),
        fullLabel: MONTH_FULL.format(d),
      });
    }
    return out;
  }, [filtered]);

  // Revenus nets par bateau (paiements encaissés), du plus rentable au moins
  // rentable ; au-delà de 7 bateaux, la queue est repliée dans « Autres ».
  const boats = useMemo(() => {
    const byName = new Map();
    for (const p of filtered) {
      if (p.status !== 'success') continue;
      const name = p.booking?.boat_name || 'Autre';
      byName.set(name, (byName.get(name) || 0) + p.net);
    }
    const sorted = [...byName.entries()]
      .map(([name, net]) => ({ name, net }))
      .sort((a, b) => b.net - a.net);
    if (sorted.length === 0) return [];
    if (sorted.length <= 7) return sorted;
    const head = sorted.slice(0, 6);
    const tail = sorted.slice(6).reduce((sum, b) => sum + b.net, 0);
    return [...head, { name: 'Autres', net: tail }];
  }, [filtered]);

  return (
    <section aria-labelledby="revenus-title">
      <header className="mb-6">
        <h1 id="revenus-title" className="text-2xl font-bold text-white">
          Mes revenus
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Historique des transactions sur vos bateaux, commissions SailingLoc déduites.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {/* Virements Stripe Connect : l'IBAN est collecté par Stripe, jamais ici. */}
      {stripeAccount?.enabled && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Virements de vos revenus</h2>
            <p className="mt-0.5 text-xs text-white/70">
              {stripeAccount.onboarded
                ? 'Compte Stripe configuré : vos revenus vous sont reversés automatiquement (90 % du montant, commission SailingLoc déduite).'
                : stripeAccount.has_account
                  ? 'Configuration Stripe incomplète : reprenez-la pour activer vos virements.'
                  : 'Configurez vos virements chez Stripe (coordonnées bancaires collectées par Stripe, jamais par SailingLoc).'}
            </p>
          </div>
          {stripeAccount.onboarded ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                ✓ Virements activés
              </span>
              <button
                type="button"
                onClick={handleManageAccount}
                disabled={onboarding}
                className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC]"
              >
                {onboarding ? 'Ouverture…' : 'Gérer mon compte Stripe'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleOnboarding}
              disabled={onboarding}
              className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC]"
            >
              {onboarding
                ? 'Redirection…'
                : stripeAccount.has_account
                  ? 'Reprendre la configuration'
                  : 'Configurer mes virements'}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <Spinner label="Chargement…" />
      ) : (
        <>
          {payments.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
                {STATUS_FILTERS.map((f) => {
                  const active = status === f.key;
                  const count = statusCounts[f.key] || 0;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setStatus(f.key)}
                      aria-pressed={active}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] ${
                        active
                          ? 'bg-sky-500 text-white'
                          : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      {f.label}
                      {f.key !== 'all' && count > 0 && ` (${count})`}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="revenus-period" className="text-sm text-white/70">
                  Période
                </label>
                <select
                  id="revenus-period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="rounded-lg border border-white/30 bg-slate-900/80 px-3 py-1.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC]"
                >
                  {PERIOD_FILTERS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Totaux : somme des transactions correspondant aux filtres actifs */}
          <ul className="grid gap-4 sm:grid-cols-3" aria-label="Totaux des revenus">
            <TotalCard
              label="Revenus nets"
              value={totals.net}
              accent="text-emerald-300"
              hint={`${totals.count} transaction${totals.count > 1 ? 's' : ''}${
                status === 'all'
                  ? ''
                  : ` · ${STATUS_FILTERS.find((f) => f.key === status).label.toLowerCase()}`
              }`}
            />
            <TotalCard label="Montant brut" value={totals.gross} />
            <TotalCard
              label="Commissions déduites"
              value={totals.commission}
              accent="text-amber-300"
              hint="Commission SailingLoc prélevée sur chaque location"
            />
          </ul>

          {/* Graphiques : évolution mensuelle et répartition par bateau */}
          {months.length > 0 && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section
                aria-labelledby="chart-months-title"
                className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5"
              >
                <h2 id="chart-months-title" className="text-sm font-semibold text-white/90">
                  Revenus nets par mois
                </h2>
                <p className="mb-4 mt-0.5 text-xs text-white/60">
                  Paiements encaissés, commissions déduites
                </p>
                <MonthlyChart months={months} />
              </section>

              <section
                aria-labelledby="chart-boats-title"
                className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5"
              >
                <h2 id="chart-boats-title" className="text-sm font-semibold text-white/90">
                  Revenus nets par bateau
                </h2>
                <p className="mb-4 mt-0.5 text-xs text-white/60">
                  Du plus rentable au moins rentable
                </p>
                <BoatChart boats={boats} />
              </section>
            </div>
          )}

          {/* Historique des transactions */}
          <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl">
            <h2 className="border-b border-white/20 px-5 py-4 text-sm font-semibold text-white/90">
              Historique des transactions
              {filtered.length !== payments.length && (
                <span className="ml-2 font-normal text-white/60">
                  {filtered.length} sur {payments.length}
                </span>
              )}
            </h2>

            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-white/70">
                {payments.length === 0
                  ? 'Aucune transaction sur vos bateaux pour le moment.'
                  : 'Aucune transaction ne correspond à ces filtres.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/20 text-xs uppercase tracking-wide text-white/60">
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Date
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Location
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Moyen
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">
                        Brut
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">
                        Commission
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">
                        Net
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/15">
                    {pageRows.map((p) => {
                      const meta = PAYMENT_STATUS[p.status] || {
                        label: p.status,
                        cls: 'bg-slate-500/15 text-white/80',
                      };
                      return (
                        <tr key={p.id_payment}>
                          <td className="whitespace-nowrap px-5 py-3 text-white/80">
                            <time dateTime={p.payment_date}>{fmtDate(p.payment_date)}</time>
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-medium text-white">{p.booking?.boat_name}</p>
                            <p className="text-xs text-white/70">
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
                              <p className="mt-1 text-xs text-white/70">
                                Remboursé : {EURO.format(p.refunded_amount)}
                                {p.refund_reason && ` — ${p.refund_reason}`}
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-white/80">
                            {PAYMENT_METHOD[p.payment_method] || p.payment_method}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right text-white">
                            {EURO.format(p.amount)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right text-amber-300">
                            − {EURO.format(p.commission)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-emerald-300">
                            {EURO.format(p.net)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}
                            >
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {pageCount > 1 && (
              <nav
                aria-label="Pagination de l'historique"
                className="flex flex-wrap items-center justify-between gap-3 border-t border-white/20 px-5 py-3"
              >
                <p className="text-xs text-white/60" aria-live="polite">
                  Transactions {(safePage - 1) * PAGE_SIZE + 1} à{' '}
                  {Math.min(safePage * PAGE_SIZE, filtered.length)} sur {filtered.length}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage === 1}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC]"
                  >
                    Précédent
                  </button>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      aria-current={n === safePage ? 'page' : undefined}
                      aria-label={`Page ${n}`}
                      className={`min-w-[2rem] rounded-full px-2.5 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] ${
                        n === safePage
                          ? 'bg-sky-500 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage === pageCount}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC]"
                  >
                    Suivant
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
