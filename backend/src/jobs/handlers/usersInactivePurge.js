import prisma from '../../config/db.js';
import { anonymizeUser } from '../../services/userPurgeService.js';
import {
  anonymizationDueWhere,
  noticeDueWhere,
  notifyInactiveUser,
} from '../../services/userInactivityService.js';

const MAX_BATCH = 500;

export default {
  key: 'users.inactive.purge',
  category: 'admin',
  defaultSchedule: '30 4 * * *',
  defaultEnabled: false,
  defaultDryRun: true,
  defaultParams: { inactivityDays: 1095, noticeDays: 30 },
  maxBatch: MAX_BATCH,

  // Les deux phases vivent dans la même tâche à dessein : les séparer
  // permettrait d'activer la suppression sans la relance, c'est-à-dire de
  // supprimer sans prévenir.
  count: async ({ params, now }) => {
    const [notices, anonymizations] = await Promise.all([
      prisma.user.count({ where: noticeDueWhere(params, now) }),
      prisma.user.count({ where: anonymizationDueWhere(params, now) }),
    ]);
    return notices + anonymizations;
  },

  // Identifiants seuls : ni nom, ni email.
  targets: async ({ params, now, take }) => {
    const [notices, anonymizations] = await Promise.all([
      prisma.user.findMany({
        where: noticeDueWhere(params, now),
        select: { id_user: true },
        orderBy: { id_user: 'asc' },
        take,
      }),
      prisma.user.findMany({
        where: anonymizationDueWhere(params, now),
        select: { id_user: true },
        orderBy: { id_user: 'asc' },
        take,
      }),
    ]);
    return [...notices, ...anonymizations].map((row) => row.id_user).slice(0, take);
  },

  async run({ params, now }) {
    const detail = { notified: 0, anonymized: 0, documents: 0, files: 0 };

    // Anonymisation d'abord : un compte qui franchit les deux seuils la même
    // nuit doit partir, pas recevoir une relance devenue sans objet.
    const expired = await prisma.user.findMany({
      where: anonymizationDueWhere(params, now),
      select: { id_user: true },
      orderBy: { id_user: 'asc' },
      take: MAX_BATCH,
    });

    for (const { id_user } of expired) {
      // Aucun admin n'a supprimé ces comptes : c'est la tâche qui acte la
      // suppression, elle doit donc poser deleted_at elle-même.
      const outcome = await anonymizeUser(id_user, now, { markDeleted: true });
      if (!outcome) continue;
      detail.anonymized += 1;
      detail.documents += outcome.documents;
      detail.files += outcome.files;
    }

    const toNotify = await prisma.user.findMany({
      where: noticeDueWhere(params, now),
      select: { id_user: true, email: true, first_name: true },
      orderBy: { id_user: 'asc' },
      take: MAX_BATCH,
    });

    for (const user of toNotify) {
      if (await notifyInactiveUser(user, params, now)) detail.notified += 1;
    }

    return { affected: detail.notified + detail.anonymized, detail };
  },
};
