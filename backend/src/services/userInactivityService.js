import prisma from '../config/db.js';
import { sendInactivityNoticeEmail } from './emailService.js';

const DAY_MS = 86400000;

const clampDays = (value, fallback) => {
  const days = Number(value);
  return Number.isFinite(days) && days >= 1 ? Math.trunc(days) : fallback;
};

export const resolveDelays = (params = {}) => {
  const inactivity = clampDays(params.inactivityDays, 1095);
  // La relance ne peut pas dépasser l'inactivité : sinon la personne serait
  // prévenue après la suppression.
  const notice = Math.min(clampDays(params.noticeDays, 30), inactivity - 1);
  return { inactivity, notice };
};

// Jamais connecté : last_login_at est null, on retombe sur la date d'inscription.
const idleSince = (cutoff) => ({
  OR: [{ last_login_at: { lt: cutoff } }, { last_login_at: null, created_at: { lt: cutoff } }],
});

// Comptes confirmés et vivants uniquement : les non confirmés relèvent de
// users.unverified.purge, les supprimés de users.purge.
const ELIGIBLE = { email_verified: true, deleted_at: null, anonymized_at: null };

// Première phase : prévenir. La CNIL impose l'information préalable, sans quoi
// la suppression pour inactivité est une faute.
export function noticeDueWhere(params = {}, now = new Date()) {
  const { inactivity, notice } = resolveDelays(params);
  return {
    ...ELIGIBLE,
    inactivity_notified_at: null,
    ...idleSince(new Date(now.getTime() - (inactivity - notice) * DAY_MS)),
  };
}

// Seconde phase : le délai est écoulé et la relance est partie depuis assez
// longtemps. Une reconnexion remet inactivity_notified_at à null (userService),
// ce qui sort le compte d'ici.
export function anonymizationDueWhere(params = {}, now = new Date()) {
  const { inactivity, notice } = resolveDelays(params);
  return {
    ...ELIGIBLE,
    inactivity_notified_at: { lt: new Date(now.getTime() - notice * DAY_MS) },
    ...idleSince(new Date(now.getTime() - inactivity * DAY_MS)),
  };
}

export async function notifyInactiveUser(user, params = {}, now = new Date()) {
  const { notice } = resolveDelays(params);
  try {
    await sendInactivityNoticeEmail(user.email, { firstName: user.first_name, days: notice });
  } catch (err) {
    // L'horodatage n'est pas posé : la relance sera retentée la nuit suivante.
    console.error('[cron] relance inactivité :', err.message);
    return false;
  }

  await prisma.user.update({
    where: { id_user: user.id_user },
    data: { inactivity_notified_at: now },
  });
  return true;
}
