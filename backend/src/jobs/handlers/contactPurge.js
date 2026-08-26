import prisma from '../../config/db.js';

const DAY_MS = 86400000;

const clampDays = (value, fallback) => {
  const days = Number(value);
  return Number.isFinite(days) && days >= 1 ? Math.trunc(days) : fallback;
};

// Deux régimes distincts. Les demandes traitées sont ancrées sur la date de
// traitement, pas sur la création : une demande créée il y a 90 jours mais
// jamais prise en charge est encore une demande client en attente.
//
// Limite connue : repasser une demande de « processed » à « new » remet
// processed_at à null (contactRequestService.js), donc elle bascule sur la
// seconde branche, évaluée sur created_at. Rouvrir une demande de plus d'un an
// la rend immédiatement purgeable. La table n'a pas d'updated_at pour
// distinguer les deux cas ; monter unprocessedRetentionDays réduit la fenêtre.
export function purgeableContactWhere(params = {}, now = new Date()) {
  const processedCutoff = new Date(now.getTime() - clampDays(params.retentionDays, 90) * DAY_MS);
  const unprocessedCutoff = new Date(
    now.getTime() - clampDays(params.unprocessedRetentionDays, 365) * DAY_MS
  );

  return {
    OR: [
      { status: 'processed', processed_at: { lt: processedCutoff } },
      { status: 'new', created_at: { lt: unprocessedCutoff } },
    ],
  };
}

export default {
  key: 'contact.purge',
  category: 'contact',
  defaultSchedule: '30 3 * * 1',
  // Première tâche destructive : elle n'agit qu'après une double bascule
  // manuelle, activation puis passage en réel.
  defaultEnabled: false,
  defaultDryRun: true,
  defaultParams: { retentionDays: 90, unprocessedRetentionDays: 365 },
  // Bas volontairement : sur une table de ce volume, un dépassement signale une
  // erreur de paramétrage plutôt qu'un vrai arriéré.
  maxBatch: 1000,

  count: ({ params, now }) =>
    prisma.contactRequest.count({ where: purgeableContactWhere(params, now) }),

  // Identifiants seuls : ni nom, ni email, ni objet, ni message.
  targets: ({ params, now, take }) =>
    prisma.contactRequest
      .findMany({
        where: purgeableContactWhere(params, now),
        select: { id_request: true },
        orderBy: { id_request: 'asc' },
        take,
      })
      .then((rows) => rows.map((row) => row.id_request)),

  async run({ params, now }) {
    const { count } = await prisma.contactRequest.deleteMany({
      where: purgeableContactWhere(params, now),
    });
    return { affected: count, detail: { contactRequests: count } };
  },
};
