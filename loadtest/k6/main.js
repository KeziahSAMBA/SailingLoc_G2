import http from 'k6/http';
import { fail } from 'k6';
import {
  BASE_URL,
  GUEST_POOL,
  MARKER,
  OWNER_POOL,
  PASSWORD,
  PROFILES,
  THRESHOLDS,
  pickJourney,
} from './config.js';
import { visitorJourney } from './scenarios/visitor.js';
import { locataireJourney } from './scenarios/locataire.js';
import { proprietaireJourney } from './scenarios/proprietaire.js';
import { adminJourney } from './scenarios/admin.js';

const PROFILE = __ENV.PROFILE || 'smoke';

if (!PROFILES[PROFILE]) {
  fail(`Profil inconnu : ${PROFILE}. Attendu : ${Object.keys(PROFILES).join(', ')}`);
}

export const options = {
  scenarios: { sailingloc: { ...PROFILES[PROFILE], exec: 'default' } },
  thresholds: THRESHOLDS,
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  noConnectionReuse: false,
  discardResponseBodies: false,
  // Grafana Cloud k6 : nomme le tir dans le tableau de bord et le range dans le
  // bon projet. Sans K6_CLOUD_PROJECT_ID, le run atterrit dans le projet par
  // défaut du compte — le tir fonctionne quand même.
  cloud: {
    name: `SailingLoc — ${PROFILE}`,
    // Le backend est servi depuis Paris (en-tête « x-railway-edge: cdg1 »).
    // Sans cette clé, Grafana tire depuis Columbus (Ohio) : chaque requête
    // paierait ~95 ms de traversée de l'Atlantique, et le corps de 1,8 Mo du
    // catalogue bien davantage, TCP montant en débit un aller-retour à la fois.
    // On mesurerait la distance autant que l'application.
    distribution: {
      paris: { loadZone: __ENV.LOAD_ZONE || 'amazon:fr:paris', percent: 100 },
    },
    ...(__ENV.K6_CLOUD_PROJECT_ID ? { projectID: Number(__ENV.K6_CLOUD_PROJECT_ID) } : {}),
  },
};

function login(email, password, role) {
  const url = role === 'admin' ? `${BASE_URL}/api/admin/login` : `${BASE_URL}/api/users/login`;
  const payload = role === 'admin' ? { email, password } : { email, password, role };
  const res = http.post(url, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { groupe: 'login', endpoint: 'POST login (setup)' },
  });
  if (res.status === 429) {
    fail(
      'HTTP 429 pendant l’authentification : LOAD_TEST_MODE n’est pas actif sur la cible. ' +
        'Le tir mesurerait le rate limiting. Posez LOAD_TEST_MODE=true et redéployez.'
    );
  }
  if (res.status !== 200) {
    fail(`Connexion impossible pour ${email} (HTTP ${res.status}) : ${res.body}`);
  }
  return res.json('accessToken');
}

// setup() ne s'exécute qu'une fois pour tout le tir. On y concentre les
// connexions : à 275 ms de bcrypt chacune, les faire dans la boucle reviendrait
// à mesurer le hachage plutôt que l'application.
export function setup() {
  const sante = http.get(`${BASE_URL}/health`);
  if (sante.status !== 200) {
    fail(`Cible injoignable : ${BASE_URL}/health a répondu ${sante.status}`);
  }

  const guests = [];
  for (let i = 1; i <= GUEST_POOL; i += 1) {
    guests.push(login(`locataire${i}${MARKER}`, PASSWORD, 'locataire'));
  }
  const owners = [];
  for (let i = 1; i <= OWNER_POOL; i += 1) {
    owners.push(login(`proprio${i}${MARKER}`, PASSWORD, 'proprietaire'));
  }
  const admin = login(`admin${MARKER}`, PASSWORD, 'admin');

  const catalogue = http.get(`${BASE_URL}/api/boats`);
  const boatIds = catalogue.status === 200 ? catalogue.json().map((b) => b.id_boat) : [];
  if (boatIds.length === 0) {
    fail('Le catalogue est vide : lancez seedLoad.js avant le tir.');
  }

  console.log(
    `Cible ${BASE_URL} | profil ${PROFILE} | ${boatIds.length} bateaux | ` +
      `${guests.length} locataires + ${owners.length} propriétaires authentifiés`
  );

  return { guests, owners, admin, boatIds };
}

export default function (data) {
  switch (pickJourney()) {
    case 'locataire':
      locataireJourney(data);
      break;
    case 'proprietaire':
      proprietaireJourney(data);
      break;
    case 'admin':
      adminJourney(data);
      break;
    default:
      visitorJourney(data);
  }
}

const ms = (v) => (v == null ? '—' : `${v.toFixed(0)} ms`);
const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(2)} %`);

function collectThresholds(metrics) {
  const rows = [];
  for (const [name, metric] of Object.entries(metrics)) {
    if (!metric.thresholds) continue;
    for (const [expression, result] of Object.entries(metric.thresholds)) {
      const values = metric.values || {};
      let actual = '—';
      const p95 = expression.match(/p\(95\)/);
      const p99 = expression.match(/p\(99\)/);
      if (p95) actual = ms(values['p(95)']);
      else if (p99) actual = ms(values['p(99)']);
      else if (values.rate != null) actual = pct(values.rate);
      else if (values.count != null) actual = String(values.count);
      rows.push({ name, expression, actual, ok: result.ok !== false });
    }
  }
  return rows;
}

function buildHtml(data, meta) {
  const rows = collectThresholds(data.metrics);
  const failed = rows.filter((r) => !r.ok);
  const verdict = failed.length === 0 ? 'CONFORME' : 'NON CONFORME';
  const duration = data.state?.testRunDurationMs
    ? `${(data.state.testRunDurationMs / 1000).toFixed(0)} s`
    : '—';
  const reqs = data.metrics.http_reqs?.values || {};
  const dur = data.metrics.http_req_duration?.values || {};
  const failRate = data.metrics.http_req_failed?.values?.rate;
  const checksRate = data.metrics.checks?.values?.rate;

  const seuils = rows
    .map(
      (r) => `<tr class="${r.ok ? 'ok' : 'ko'}">
        <td><code>${r.name}</code></td>
        <td><code>${r.expression}</code></td>
        <td class="num">${r.actual}</td>
        <td class="verdict">${r.ok ? 'OK' : 'ÉCHEC'}</td></tr>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>SailingLoc — rapport de charge (${meta.profile})</title>
<style>
:root{--ok:#0f7b3f;--ko:#b3261e;--bg:#f7f9fc;--line:#dfe5ee;--ink:#12263f}
*{box-sizing:border-box}
body{margin:0;padding:32px;font:15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--ink)}
.wrap{max-width:1100px;margin:0 auto}
h1{margin:0 0 4px;font-size:24px}
.sub{color:#5a6b82;margin-bottom:24px}
.verdict-box{padding:18px 22px;border-radius:10px;font-size:20px;font-weight:700;color:#fff;margin-bottom:24px;background:${failed.length === 0 ? 'var(--ok)' : 'var(--ko)'}}
.verdict-box small{display:block;font-size:14px;font-weight:400;opacity:.9;margin-top:4px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:28px}
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.card .k{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#5a6b82}
.card .v{font-size:22px;font-weight:600;margin-top:4px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--line);font-size:14px}
th{background:#eef2f8;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#5a6b82}
td.num,td.verdict{text-align:right;white-space:nowrap}
tr.ko td{background:#fdf2f2}
tr.ko .verdict{color:var(--ko);font-weight:700}
tr.ok .verdict{color:var(--ok);font-weight:600}
code{font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
h2{font-size:16px;margin:28px 0 10px}
.note{background:#fff8e6;border-left:4px solid #e0a800;padding:12px 16px;border-radius:6px;margin-top:24px;font-size:14px}
</style></head><body><div class="wrap">
<h1>SailingLoc — test de montée en charge</h1>
<div class="sub">Cible <code>${meta.baseUrl}</code> · profil <strong>${meta.profile}</strong> · ${meta.date}</div>

<div class="verdict-box">${verdict}
<small>${failed.length === 0 ? 'Tous les seuils sont respectés.' : `${failed.length} seuil(s) dépassé(s) sur ${rows.length}.`}</small></div>

<div class="cards">
  <div class="card"><div class="k">Durée</div><div class="v">${duration}</div></div>
  <div class="card"><div class="k">Requêtes</div><div class="v">${reqs.count ?? '—'}</div></div>
  <div class="card"><div class="k">Débit</div><div class="v">${reqs.rate ? reqs.rate.toFixed(1) : '—'}/s</div></div>
  <div class="card"><div class="k">p95 global</div><div class="v">${ms(dur['p(95)'])}</div></div>
  <div class="card"><div class="k">p99 global</div><div class="v">${ms(dur['p(99)'])}</div></div>
  <div class="card"><div class="k">Erreurs HTTP</div><div class="v">${pct(failRate)}</div></div>
  <div class="card"><div class="k">Checks</div><div class="v">${pct(checksRate)}</div></div>
</div>

<h2>Seuils</h2>
<table><thead><tr><th>Métrique</th><th>Seuil</th><th>Mesuré</th><th>Verdict</th></tr></thead>
<tbody>${seuils}</tbody></table>

<div class="note"><strong>Limite du dispositif.</strong> <code>LOAD_TEST_MODE</code> neutralise le rate limiting applicatif,
mais pas les protections en frontal de Railway. Des <code>429</code> ou <code>503</code> qui n'apparaissent pas dans le
compteur <code>rate_limited</code> proviennent de l'infrastructure, pas de l'application.</div>
</div></body></html>`;
}

export function handleSummary(data) {
  const meta = {
    baseUrl: BASE_URL,
    profile: PROFILE,
    date: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  // En exécution cloud, le runner Grafana n'a pas l'arborescence du dépôt :
  // écrire un fichier ferait échouer le tir à la toute dernière seconde. Les
  // résultats vivent de toute façon dans le tableau de bord.
  const enCloud = Boolean(__ENV.K6_CLOUDRUN_TEST_RUN_ID || __ENV.K6_CLOUD_TEST_RUN_ID);
  if (enCloud) {
    return { stdout: '\nRésultats disponibles dans Grafana Cloud k6.\n' };
  }

  const base = `loadtest/rapports/${PROFILE}`;
  return {
    stdout: `\nRapport écrit dans ${base}.html\n`,
    [`${base}.html`]: buildHtml(data, meta),
    [`${base}.json`]: JSON.stringify({ meta, metrics: data.metrics }, null, 2),
  };
}
