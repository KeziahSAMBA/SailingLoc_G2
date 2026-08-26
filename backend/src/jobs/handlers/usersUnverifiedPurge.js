import prisma from '../../config/db.js';

const DAY_MS = 86400000;

const clampDays = (value) => {
  const days = Number(value);
  return Number.isFinite(days) && days >= 1 ? Math.trunc(days) : 30;
};

// Un compte non confirmé ne peut pas se connecter (userService.js), donc rien
// ne devrait lui être rattaché. Les filtres « none » le vérifient quand même :
// une seule ligne pendante suffirait à faire échouer la suppression.
const NO_ATTACHED_ROWS = {
  boats: { none: {} },
  bookings: { none: {} },
  documents: { none: {} },
  reviews: { none: {} },
  images: { none: {} },
  favoriteBoats: { none: {} },
  sentMessages: { none: {} },
  receivedMessages: { none: {} },
  reports: { none: {} },
  disputes: { none: {} },
};

// Suppression franche, pas anonymisation : une inscription jamais confirmée n'a
// aucune finalité établie, et peut même porter l'adresse d'un tiers.
// deleted_at: null écarte les comptes déjà anonymisés par users.purge.
export function purgeableUnverifiedWhere(params = {}, now = new Date()) {
  return {
    email_verified: false,
    deleted_at: null,
    created_at: { lt: new Date(now.getTime() - clampDays(params.retentionDays) * DAY_MS) },
    ...NO_ATTACHED_ROWS,
  };
}

export default {
  key: 'users.unverified.purge',
  category: 'admin',
  defaultSchedule: '15 4 * * *',
  defaultEnabled: false,
  defaultDryRun: true,
  defaultParams: { retentionDays: 30 },
  maxBatch: 500,

  count: ({ params, now }) => prisma.user.count({ where: purgeableUnverifiedWhere(params, now) }),

  // Identifiants seuls : ni nom, ni email, ni téléphone.
  targets: ({ params, now, take }) =>
    prisma.user
      .findMany({
        where: purgeableUnverifiedWhere(params, now),
        select: { id_user: true },
        orderBy: { id_user: 'asc' },
        take,
      })
      .then((rows) => rows.map((row) => row.id_user)),

  async run({ params, now }) {
    const { count } = await prisma.user.deleteMany({
      where: purgeableUnverifiedWhere(params, now),
    });
    return { affected: count, detail: { users: count } };
  },
};
