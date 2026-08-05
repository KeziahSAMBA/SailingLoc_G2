import prisma from '../config/db.js';
import { getJobDefinition, resolveParams } from '../jobs/registry.js';
import { computeNextRun, isValidSchedule, runJob, CRON_TZ } from './cronService.js';
import { reloadScheduler } from '../scheduler.js';

const MAX_PAGE_SIZE = 100;
const RUN_STATUSES = ['running', 'success', 'failed', 'skipped'];
// Une rétention se compte en jours : au-delà de 10 ans, c'est une faute de frappe.
const RETENTION_MAX = 3650;

const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const unknown = (key) => bad(`Tâche inconnue : ${key}`, 404);

function present(job, runningIds) {
  const definition = getJobDefinition(job.key);
  return {
    id_job: job.id_job,
    key: job.key,
    category: definition?.category ?? null,
    schedule: job.schedule,
    enabled: job.enabled,
    dry_run: job.dry_run,
    params: resolveParams(definition ?? {}, job.params),
    defaultSchedule: definition?.defaultSchedule ?? null,
    defaultParams: definition?.defaultParams ?? {},
    maxBatch: definition?.maxBatch ?? null,
    last_run_at: job.last_run_at,
    last_status: job.last_status,
    next_run_at: job.next_run_at,
    running: runningIds.has(job.id_job),
    // Présente en base mais retirée du code : ni exécutable ni planifiable.
    orphan: !definition,
  };
}

export async function listJobs() {
  const [jobs, running] = await Promise.all([
    prisma.cronJob.findMany({ orderBy: { key: 'asc' } }),
    prisma.cronRun.findMany({ where: { status: 'running' }, select: { id_job: true } }),
  ]);
  const runningIds = new Set(running.map((run) => run.id_job));
  return { jobs: jobs.map((job) => present(job, runningIds)), timezone: CRON_TZ };
}

// Seules les clés déclarées dans le registre sont acceptées : l'admin règle un
// paramétrage existant, il n'en invente pas.
function sanitizeParams(definition, input) {
  if (input === null) return null;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw bad('Paramètres invalides.');
  }

  const clean = {};
  for (const [key, fallback] of Object.entries(definition.defaultParams ?? {})) {
    if (!(key in input)) continue;
    if (typeof fallback === 'number') {
      const value = Number(input[key]);
      if (!Number.isFinite(value) || value < 1 || value > RETENTION_MAX) {
        throw bad(`Paramètre « ${key} » invalide : attendu un nombre entre 1 et ${RETENTION_MAX}.`);
      }
      clean[key] = Math.trunc(value);
    } else if (typeof fallback === 'boolean') {
      clean[key] = Boolean(input[key]);
    } else {
      clean[key] = String(input[key]).slice(0, 200);
    }
  }
  return Object.keys(clean).length ? clean : null;
}

export async function updateJob(key, payload = {}) {
  const definition = getJobDefinition(key);
  if (!definition) throw unknown(key);

  const job = await prisma.cronJob.findUnique({ where: { key } });
  if (!job) throw unknown(key);

  const data = { updated_at: new Date() };

  if (payload.schedule !== undefined) {
    const schedule = String(payload.schedule).trim();
    if (!isValidSchedule(schedule)) {
      throw bad(
        'Expression cron invalide (format attendu : « minute heure jour mois jour-semaine »).'
      );
    }
    data.schedule = schedule;
  }
  if (payload.enabled !== undefined) data.enabled = Boolean(payload.enabled);
  if (payload.dry_run !== undefined) data.dry_run = Boolean(payload.dry_run);
  if (payload.params !== undefined) data.params = sanitizeParams(definition, payload.params);

  data.next_run_at = computeNextRun(data.schedule ?? job.schedule, data.enabled ?? job.enabled);

  const updated = await prisma.cronJob.update({ where: { key }, data });
  // Le scheduler est rechargé intégralement : une tâche désactivée doit cesser
  // de se déclencher immédiatement, pas au prochain redémarrage.
  await reloadScheduler();

  const running = await prisma.cronRun.findMany({
    where: { status: 'running' },
    select: { id_job: true },
  });
  return present(updated, new Set(running.map((run) => run.id_job)));
}

// Lancement manuel : volontairement sans await. Une purge peut durer plus
// longtemps que le timeout HTTP du navigateur ; le front suit l'avancement via
// la liste des exécutions.
export async function triggerJob(key, { actorId = null, actorEmail = null } = {}) {
  const definition = getJobDefinition(key);
  if (!definition) throw unknown(key);

  const job = await prisma.cronJob.findUnique({ where: { key } });
  if (!job) throw unknown(key);

  const busy = await prisma.cronRun.findFirst({
    where: { id_job: job.id_job, status: 'running' },
  });
  if (busy) throw bad('Cette tâche est déjà en cours d’exécution.', 409);

  runJob(key, { trigger: 'manual', actorId, actorEmail }).catch((err) =>
    console.error(`[cron] déclenchement manuel ${key} :`, err.message)
  );

  return { key, started: true, dry_run: job.dry_run };
}

export async function listRuns({ key, status, page, pageSize } = {}) {
  const where = {};
  if (key && String(key).trim()) where.job = { key: String(key).trim() };
  if (RUN_STATUSES.includes(status)) where.status = status;

  const currentPage = Math.max(1, Number(page) || 1);
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || 25));

  const [total, runs] = await Promise.all([
    prisma.cronRun.count({ where }),
    prisma.cronRun.findMany({
      where,
      orderBy: { started_at: 'desc' },
      skip: (currentPage - 1) * size,
      take: size,
      include: { job: { select: { key: true } } },
    }),
  ]);

  return {
    runs: runs.map(({ job, ...run }) => ({ ...run, key: job.key })),
    total,
    page: currentPage,
    pageSize: size,
  };
}
