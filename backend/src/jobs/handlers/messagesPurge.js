import prisma from '../../config/db.js';

const DAY_MS = 86400000;

const clampDays = (value) => {
  const days = Number(value);
  return Number.isFinite(days) && days >= 1 ? Math.trunc(days) : 90;
};

// Deux cas, et dans les deux plus aucun lecteur n'est possible : la suppression
// « pour tout le monde », et le masquage par les deux côtés — irréversible,
// rien ne remet ces colonnes à null dans messageService.js.
// Un masquage unilatéral n'entre jamais : « lt » exclut les colonnes nulles.
export function purgeableMessagesWhere(params = {}, now = new Date()) {
  const cutoff = new Date(now.getTime() - clampDays(params.retentionDays) * DAY_MS);

  return {
    OR: [
      { deleted_at: { lt: cutoff } },
      { AND: [{ sender_deleted_at: { lt: cutoff } }, { receiver_deleted_at: { lt: cutoff } }] },
    ],
  };
}

export default {
  key: 'messages.purge',
  category: 'messages',
  defaultSchedule: '45 4 * * *',
  // Contenu écrit par les utilisateurs : double bascule manuelle, comme
  // contact.purge.
  defaultEnabled: false,
  defaultDryRun: true,
  defaultParams: { retentionDays: 90 },
  maxBatch: 10000,

  count: ({ params, now }) => prisma.message.count({ where: purgeableMessagesWhere(params, now) }),

  // Identifiants seuls : ni contenu, ni expéditeur, ni destinataire.
  targets: ({ params, now, take }) =>
    prisma.message
      .findMany({
        where: purgeableMessagesWhere(params, now),
        select: { id_message: true },
        orderBy: { id_message: 'asc' },
        take,
      })
      .then((rows) => rows.map((row) => row.id_message)),

  async run({ params, now }) {
    const { count } = await prisma.message.deleteMany({
      where: purgeableMessagesWhere(params, now),
    });
    return { affected: count, detail: { messages: count } };
  },
};
