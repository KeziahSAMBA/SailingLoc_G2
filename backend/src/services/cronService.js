import { Cron } from 'croner';
import prisma from '../config/db.js';
import { getJobDefinition, listJobDefinitions, resolveParams } from '../jobs/registry.js';
import { logActivity } from './logService.js';

// Railway tourne en UTC : sans fuseau explicite, « tous les jours à 3 h »
// tomberait à 4 h ou 5 h heure française selon la saison.
export const CRON_TZ = process.env.CRON_TIMEZONE || 'Europe/Paris';

// Au-delà, une exécution encore « running » est tenue pour morte : elle
// n'empêche plus le déclenchement suivant.
const RUN_TIMEOUT_MS = 30 * 60 * 1000;
const ERROR_MAX = 1000;

const notFound = (key) =>
  Object.assign(new Error(`Tâche inconnue : ${key}`), { status: 404, code: 'CRON_UNKNOWN_JOB' });

export function isValidSchedule(expression) {
  if (typeof expression !== 'string' || !expression.trim()) return false;
  try {
    return new Cron(expression, { timezone: CRON_TZ }).nextRun() !== null;
  } catch {
    return false;
  }
}

export function computeNextRun(expression, enabled) {
  if (!enabled || !isValidSchedule(expression)) return null;
  return new Cron(expression, { timezone: CRON_TZ }).nextRun();
}

// Crée en base les tâches présentes dans le registre mais pas encore connues.
// Les réglages d'une tâche existante ne sont jamais réécrits : ils appartiennent
// à l'admin, pas au code.
export async function syncRegistry() {
  const known = await prisma.cronJob.findMany({ select: { key: true } });
  const existing = new Set(known.map((job) => job.key));

  for (const definition of listJobDefinitions()) {
    if (existing.has(definition.key)) continue;
    const enabled = definition.defaultEnabled ?? false;
    await prisma.cronJob.create({
      data: {
        key: definition.key,
        schedule: definition.defaultSchedule,
        enabled,
        dry_run: definition.defaultDryRun ?? true,
        next_run_at: computeNextRun(definition.defaultSchedule, enabled),
      },
    });
  }
}

// Un process tué en pleine exécution laisse un run bloqué en « running », qui
// s'afficherait indéfiniment comme tâche en cours. On repart d'une ardoise
// propre au démarrage — ce qui suppose une seule instance backend, ce qui est
// le cas sur Railway.
export async function reclaimStaleRuns() {
  const { count } = await prisma.cronRun.updateMany({
    where: { status: 'running' },
    data: {
      status: 'failed',
      finished_at: new Date(),
      error: 'Exécution interrompue par un arrêt du serveur.',
    },
  });
  return count;
}

async function finalizeRun(run, job, { status, affected = 0, detail = null, error = null }) {
  const finishedAt = new Date();
  const updated = await prisma.cronRun.update({
    where: { id_run: run.id_run },
    data: {
      status,
      finished_at: finishedAt,
      duration_ms: finishedAt.getTime() - run.started_at.getTime(),
      affected,
      result: detail,
      error: error ? String(error).slice(0, ERROR_MAX) : null,
    },
  });

  await prisma.cronJob.update({
    where: { id_job: job.id_job },
    data: {
      last_run_at: finishedAt,
      last_status: status,
      next_run_at: computeNextRun(job.schedule, job.enabled),
      updated_at: finishedAt,
    },
  });

  return updated;
}

export async function runJob(
  key,
  { trigger = 'schedule', actorId = null, actorEmail = null } = {}
) {
  const definition = getJobDefinition(key);
  if (!definition) throw notFound(key);

  const job = await prisma.cronJob.findUnique({ where: { key } });
  if (!job) throw notFound(key);

  const busy = await prisma.cronRun.findFirst({
    where: {
      id_job: job.id_job,
      status: 'running',
      started_at: { gte: new Date(Date.now() - RUN_TIMEOUT_MS) },
    },
  });
  if (busy) {
    return prisma.cronRun.create({
      data: {
        id_job: job.id_job,
        trigger,
        status: 'skipped',
        dry_run: job.dry_run,
        finished_at: new Date(),
        duration_ms: 0,
        actor_id: actorId,
        actor_email: actorEmail,
        error: 'Exécution ignorée : la précédente est encore en cours.',
      },
    });
  }

  const run = await prisma.cronRun.create({
    data: {
      id_job: job.id_job,
      trigger,
      status: 'running',
      dry_run: job.dry_run,
      actor_id: actorId,
      actor_email: actorEmail,
    },
  });

  const now = new Date();
  const params = resolveParams(definition, job.params);

  try {
    const targeted =
      typeof definition.count === 'function' ? await definition.count({ params, now }) : null;

    // Filet contre le paramétrage catastrophique (une rétention passée à 0 par
    // erreur) : on refuse d'agir plutôt que de vider la base.
    if (definition.maxBatch != null && targeted != null && targeted > definition.maxBatch) {
      throw new Error(
        `Plafond de sécurité atteint : ${targeted} enregistrements ciblés pour un maximum de ${definition.maxBatch}. Vérifiez le paramétrage avant de relancer.`
      );
    }

    const outcome = job.dry_run
      ? { affected: targeted ?? 0, detail: { simulated: true, targeted: targeted ?? 0 } }
      : await definition.run({ params, now, targeted });

    const finished = await finalizeRun(run, job, {
      status: 'success',
      affected: outcome.affected ?? 0,
      detail: outcome.detail ?? null,
    });

    logActivity({
      category: 'cron',
      action: 'cron.run',
      message: `${key} : ${finished.affected} enregistrement(s)${job.dry_run ? ' (simulation)' : ''}`,
      actorId,
      actorEmail,
      targetType: 'cron_job',
      targetId: key,
      meta: { trigger, dryRun: job.dry_run, affected: finished.affected },
    });

    return finished;
  } catch (err) {
    const finished = await finalizeRun(run, job, { status: 'failed', error: err.message });

    logActivity({
      level: 'error',
      category: 'cron',
      action: 'cron.run',
      message: `${key} : échec — ${err.message}`,
      actorId,
      actorEmail,
      targetType: 'cron_job',
      targetId: key,
      meta: { trigger, dryRun: job.dry_run },
    });

    console.error(`[cron] ${key} :`, err.message);
    return finished;
  }
}
