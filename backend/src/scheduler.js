import { Cron } from 'croner';
import prisma from './config/db.js';
import { getJobDefinition } from './jobs/registry.js';
import {
  CRON_TZ,
  computeNextRun,
  isValidSchedule,
  reclaimStaleRuns,
  runJob,
  syncRegistry,
} from './services/cronService.js';

const scheduled = new Map();

export function stopScheduler() {
  for (const task of scheduled.values()) task.stop();
  scheduled.clear();
}

// Recalcule la prochaine échéance de toutes les tâches : c'est ce que la page
// de programmation affiche, il doit refléter la base dès la moindre modif.
async function refreshNextRuns() {
  const jobs = await prisma.cronJob.findMany();
  await Promise.all(
    jobs.map((job) =>
      prisma.cronJob.update({
        where: { id_job: job.id_job },
        data: { next_run_at: computeNextRun(job.schedule, job.enabled) },
      })
    )
  );
}

// Rechargé intégralement à chaque modification côté admin : plus simple et plus
// sûr que de patcher une tâche vivante.
export async function reloadScheduler() {
  stopScheduler();

  const jobs = await prisma.cronJob.findMany({ where: { enabled: true } });
  for (const job of jobs) {
    if (!getJobDefinition(job.key)) {
      console.warn(`[cron] ${job.key} : activée en base mais absente du registre, ignorée.`);
      continue;
    }
    if (!isValidSchedule(job.schedule)) {
      console.warn(`[cron] ${job.key} : planning invalide (${job.schedule}), ignorée.`);
      continue;
    }
    scheduled.set(
      job.key,
      new Cron(job.schedule, { timezone: CRON_TZ, protect: true, catch: true }, () =>
        runJob(job.key, { trigger: 'schedule' })
      )
    );
  }

  await refreshNextRuns();
  console.log(`[cron] ${scheduled.size} tâche(s) planifiée(s) — fuseau ${CRON_TZ}.`);
}

export async function startScheduler() {
  await syncRegistry();
  const reclaimed = await reclaimStaleRuns();
  if (reclaimed)
    console.log(`[cron] ${reclaimed} exécution(s) interrompue(s) marquée(s) en échec.`);
  await reloadScheduler();
}
