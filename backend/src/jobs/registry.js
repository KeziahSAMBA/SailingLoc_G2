import bookingsExpire from './handlers/bookingsExpire.js';
import tokensPurge from './handlers/tokensPurge.js';
import logsPurge from './handlers/logsPurge.js';
import contactPurge from './handlers/contactPurge.js';
import cronRunsPurge from './handlers/cronRunsPurge.js';
import usersPurge from './handlers/usersPurge.js';
import usersUnverifiedPurge from './handlers/usersUnverifiedPurge.js';
import usersInactivePurge from './handlers/usersInactivePurge.js';
import messagesPurge from './handlers/messagesPurge.js';
import imagesPurge from './handlers/imagesPurge.js';

// Catalogue des tâches planifiées. Il vit en code : la base ne stocke que ce
// que l'admin peut régler (planning, activation, simulation, paramètres) et
// l'état d'exécution. Ajouter une tâche = ajouter son module ici.
const JOBS = [
  bookingsExpire,
  tokensPurge,
  logsPurge,
  contactPurge,
  cronRunsPurge,
  usersPurge,
  usersUnverifiedPurge,
  usersInactivePurge,
  messagesPurge,
  imagesPurge,
];

export const REGISTRY = new Map(JOBS.map((job) => [job.key, job]));

export const getJobDefinition = (key) => REGISTRY.get(key) ?? null;

export const listJobDefinitions = () => [...REGISTRY.values()];

// Paramétrage effectif : les surcharges enregistrées en base complètent les
// valeurs par défaut du registre, jamais l'inverse.
export function resolveParams(definition, stored) {
  const overrides = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  return { ...(definition.defaultParams ?? {}), ...overrides };
}
