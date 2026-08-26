import prisma from '../../config/db.js';

const DAY_MS = 86400000;

const clampDays = (value) => {
  const days = Number(value);
  return Number.isFinite(days) && days >= 1 ? Math.trunc(days) : 365;
};

// Rétention unique, sans traitement de faveur pour les erreurs : chaque ligne
// porte un actor_email, donc en conserver davantage demanderait une
// justification propre. 365 jours couvrent le besoin d'investigation.
export function expiredLogsWhere(params = {}, now = new Date()) {
  return { created_at: { lt: new Date(now.getTime() - clampDays(params.retentionDays) * DAY_MS) } };
}

export default {
  key: 'logs.purge',
  category: 'admin',
  // Décalée de tokens.purge : deux purges de masse à la même minute se
  // disputeraient le pool Prisma.
  defaultSchedule: '15 3 * * *',
  defaultEnabled: true,
  defaultDryRun: true,
  defaultParams: { retentionDays: 365 },
  maxBatch: 50000,

  count: ({ params, now }) => prisma.activityLog.count({ where: expiredLogsWhere(params, now) }),

  // Identifiants seuls : ni actor_email, ni message, ni meta — la trace de la
  // purge ne doit pas réintroduire ce que la purge vient d'effacer.
  targets: ({ params, now, take }) =>
    prisma.activityLog
      .findMany({
        where: expiredLogsWhere(params, now),
        select: { id_log: true },
        orderBy: { id_log: 'asc' },
        take,
      })
      .then((rows) => rows.map((row) => row.id_log)),

  async run({ params, now }) {
    const { count } = await prisma.activityLog.deleteMany({ where: expiredLogsWhere(params, now) });
    return { affected: count, detail: { activityLogs: count } };
  },
};
