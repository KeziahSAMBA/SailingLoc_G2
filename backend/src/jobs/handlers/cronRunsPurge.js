import prisma from '../../config/db.js';

const DAY_MS = 86400000;

const clampDays = (value) => {
  const days = Number(value);
  return Number.isFinite(days) && days >= 1 ? Math.trunc(days) : 90;
};

// Le garde sur « running » épargne l'exécution en cours — c'est celle de cette
// tâche même, qui purge l'historique auquel elle est en train de s'ajouter.
export function expiredRunsWhere(params = {}, now = new Date()) {
  return {
    status: { not: 'running' },
    started_at: { lt: new Date(now.getTime() - clampDays(params.retentionDays) * DAY_MS) },
  };
}

export default {
  key: 'cron.runs.purge',
  category: 'admin',
  // Dernière de la série nocturne : tokens 3 h, logs 3 h 15, contact 3 h 30.
  defaultSchedule: '45 3 * * *',
  defaultEnabled: true,
  defaultDryRun: true,
  defaultParams: { retentionDays: 90 },
  maxBatch: 50000,

  count: ({ params, now }) => prisma.cronRun.count({ where: expiredRunsWhere(params, now) }),

  // Identifiants seuls : ni actor_email, ni error, ni result.
  targets: ({ params, now, take }) =>
    prisma.cronRun
      .findMany({
        where: expiredRunsWhere(params, now),
        select: { id_run: true },
        orderBy: { id_run: 'asc' },
        take,
      })
      .then((rows) => rows.map((row) => row.id_run)),

  async run({ params, now }) {
    const { count } = await prisma.cronRun.deleteMany({ where: expiredRunsWhere(params, now) });
    return { affected: count, detail: { cronRuns: count } };
  },
};
