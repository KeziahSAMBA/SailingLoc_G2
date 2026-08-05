import prisma from '../../config/db.js';
import { anonymizableUsersWhere, anonymizeUser } from '../../services/userPurgeService.js';

const MAX_BATCH = 500;

const SUM_KEYS = [
  'documents',
  'images',
  'reviews',
  'ownerReplies',
  'boats',
  'activityLogs',
  'cronRuns',
  'files',
];

// Identifiants seuls : ni nom, ni email, ni téléphone.
const targetIds = ({ params, now, take }) =>
  prisma.user
    .findMany({
      where: anonymizableUsersWhere(params, now),
      select: { id_user: true },
      orderBy: { id_user: 'asc' },
      take,
    })
    .then((rows) => rows.map((row) => row.id_user));

export default {
  key: 'users.purge',
  category: 'admin',
  // Après la série nocturne : elle réécrit des journaux que logs.purge vient
  // d'élaguer, autant travailler sur le volume déjà réduit.
  defaultSchedule: '0 4 * * *',
  // La plus destructive des cinq : double bascule manuelle avant tout effet.
  defaultEnabled: false,
  defaultDryRun: true,
  defaultParams: { retentionDays: 30 },
  maxBatch: MAX_BATCH,

  count: ({ params, now }) => prisma.user.count({ where: anonymizableUsersWhere(params, now) }),

  targets: targetIds,

  async run({ params, now }) {
    const ids = await targetIds({ params, now, take: MAX_BATCH });
    const detail = { users: 0, ...Object.fromEntries(SUM_KEYS.map((key) => [key, 0])) };

    // Séquentiel : chaque compte ouvre une transaction, les paralléliser
    // épuiserait le pool Prisma sur un arriéré de plusieurs centaines.
    for (const id of ids) {
      const outcome = await anonymizeUser(id, now);
      if (!outcome) continue;
      detail.users += 1;
      for (const key of SUM_KEYS) detail[key] += outcome[key] ?? 0;
    }

    return { affected: detail.users, detail };
  },
};
