import prisma from '../../config/db.js';

const DAY_MS = 86400000;

const clampDays = (value) => {
  const days = Number(value);
  return Number.isFinite(days) && days >= 1 ? Math.trunc(days) : 30;
};

// Un jeton encore valide a son expires_at dans le futur : il ne peut pas être
// ciblé. Un jeton révoqué mais pas encore expiré non plus, ce qui préserve la
// détection de rejeu de refreshSession (elle teste revoked_at avant expires_at,
// donc elle a besoin que la ligne survive toute la fenêtre d'usage du jeton).
export function expiredTokensWhere(params = {}, now = new Date()) {
  return { expires_at: { lt: new Date(now.getTime() - clampDays(params.retentionDays) * DAY_MS) } };
}

export default {
  key: 'tokens.purge',
  category: 'auth',
  defaultSchedule: '0 3 * * *',
  defaultEnabled: true,
  defaultDryRun: true,
  defaultParams: { retentionDays: 30 },
  // Haut volontairement : la table gagne une ligne à chaque rafraîchissement de
  // session, un premier passage sur l'historique accumulé est normal.
  maxBatch: 50000,

  count: ({ params, now }) => prisma.refreshToken.count({ where: expiredTokensWhere(params, now) }),

  async run({ params, now }) {
    const { count } = await prisma.refreshToken.deleteMany({
      where: expiredTokensWhere(params, now),
    });
    return { affected: count, detail: { refreshTokens: count } };
  },
};
