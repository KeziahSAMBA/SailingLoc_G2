import prisma from '../../config/db.js';
import {
  pauseNoticeDueWhere,
  pauseClosureDueWhere,
  notifyPausedUser,
  closePausedAccount,
  PAUSE_RETENTION_DAYS,
} from '../../services/accountClosureService.js';

const MAX_BATCH = 500;

export default {
  key: 'users.paused.purge',
  category: 'admin',
  // Avant users.purge (4 h) : les comptes fermés cette nuit attendront la
  // rétention légale comme les autres, pas une nuit de plus.
  defaultSchedule: '45 3 * * *',
  defaultEnabled: false,
  defaultDryRun: true,
  defaultParams: { pauseDays: PAUSE_RETENTION_DAYS, noticeDays: 7 },
  maxBatch: MAX_BATCH,

  count: async ({ params, now }) => {
    const [notices, closures] = await Promise.all([
      prisma.user.count({ where: pauseNoticeDueWhere(params, now) }),
      prisma.user.count({ where: pauseClosureDueWhere(params, now) }),
    ]);
    return notices + closures;
  },

  // Identifiants seuls : ni nom, ni email.
  targets: async ({ params, now, take }) => {
    const [notices, closures] = await Promise.all([
      prisma.user.findMany({
        where: pauseNoticeDueWhere(params, now),
        select: { id_user: true },
        orderBy: { id_user: 'asc' },
        take,
      }),
      prisma.user.findMany({
        where: pauseClosureDueWhere(params, now),
        select: { id_user: true },
        orderBy: { id_user: 'asc' },
        take,
      }),
    ]);
    return [...notices, ...closures].map((row) => row.id_user).slice(0, take);
  },

  async run({ params, now }) {
    const detail = { notified: 0, closed: 0 };

    // Fermeture d'abord : un compte qui franchit les deux seuils la même nuit
    // doit partir, pas recevoir une relance devenue sans objet.
    const expired = await prisma.user.findMany({
      where: pauseClosureDueWhere(params, now),
      select: { id_user: true },
      orderBy: { id_user: 'asc' },
      take: MAX_BATCH,
    });

    for (const { id_user } of expired) {
      await closePausedAccount(id_user, now);
      detail.closed += 1;
    }

    const toNotify = await prisma.user.findMany({
      where: pauseNoticeDueWhere(params, now),
      select: { id_user: true, email: true, first_name: true },
      orderBy: { id_user: 'asc' },
      take: MAX_BATCH,
    });

    for (const user of toNotify) {
      if (await notifyPausedUser(user, params, now)) detail.notified += 1;
    }

    return { affected: detail.notified + detail.closed, detail };
  },
};
