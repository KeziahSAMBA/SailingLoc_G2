import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import {
  sendAccountDeactivatedEmail,
  sendAccountDeletionEmail,
  sendPauseNoticeEmail,
} from './emailService.js';

export const DELETION_RETENTION_DAYS = 30;
// Durée de la pause avant suppression automatique : sans rapport avec la
// rétention légale ci-dessus, qui court après la fermeture du compte.
export const PAUSE_RETENTION_DAYS = 30;

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'];
const DELETION_CONFIRMATIONS = ['SUPPRIMER', 'DELETE'];

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const invalidCredentials = () =>
  Object.assign(new Error('Mot de passe incorrect.'), { status: 400 });

function activeBookingsWhere(user) {
  const scope =
    user.role === 'proprietaire' ? { boat: { id_user: user.id_user } } : { id_user: user.id_user };
  return {
    ...scope,
    status: { in: ACTIVE_BOOKING_STATUSES },
    end_date: { gte: startOfToday() },
    deleted_at: null,
  };
}

function openDisputesWhere(user) {
  const scope =
    user.role === 'proprietaire'
      ? { booking: { boat: { id_user: user.id_user } } }
      : { booking: { id_user: user.id_user } };
  return { status: 'open', OR: [{ id_user: user.id_user }, scope] };
}

async function loadClosableUser(id_user) {
  const user = await prisma.user.findUnique({
    where: { id_user },
    select: {
      id_user: true,
      role: true,
      email: true,
      first_name: true,
      password: true,
      is_active: true,
      deleted_at: true,
    },
  });
  if (!user || user.deleted_at) {
    throw Object.assign(new Error('Utilisateur introuvable.'), { status: 404 });
  }
  if (user.role === 'admin') {
    throw Object.assign(
      new Error('Un compte administrateur ne peut pas être fermé depuis cet espace.'),
      { status: 403 }
    );
  }
  return user;
}

export async function getClosureStatus(id_user) {
  const user = await loadClosableUser(id_user);
  const [activeBookings, openDisputes, publishedBoats] = await Promise.all([
    prisma.booking.count({ where: activeBookingsWhere(user) }),
    prisma.dispute.count({ where: openDisputesWhere(user) }),
    user.role === 'proprietaire'
      ? prisma.boat.count({ where: { id_user, deleted_at: null, is_published: true } })
      : Promise.resolve(0),
  ]);

  return {
    role: user.role,
    blockers: { activeBookings, openDisputes },
    canClose: activeBookings === 0 && openDisputes === 0,
    publishedBoats,
    retentionDays: DELETION_RETENTION_DAYS,
    pauseDays: PAUSE_RETENTION_DAYS,
  };
}

async function assertClosable(user, password) {
  if (!password) throw invalidCredentials();
  const passwordOk = await bcrypt.compare(String(password), user.password);
  if (!passwordOk) throw invalidCredentials();

  const [activeBookings, openDisputes] = await Promise.all([
    prisma.booking.count({ where: activeBookingsWhere(user) }),
    prisma.dispute.count({ where: openDisputesWhere(user) }),
  ]);

  if (activeBookings > 0) {
    throw Object.assign(
      new Error(
        'Des réservations sont en cours ou à venir sur votre compte. Attendez leur fin ou annulez-les avant de fermer votre compte.'
      ),
      { status: 409 }
    );
  }
  if (openDisputes > 0) {
    throw Object.assign(
      new Error(
        'Un litige est encore ouvert sur votre compte. Il doit être résolu avant sa fermeture.'
      ),
      { status: 409 }
    );
  }
}

const sendQuiet = (promise, label) => promise.catch((err) => console.error(label, err.message));

export async function deactivateOwnAccount(id_user, { password } = {}) {
  const user = await loadClosableUser(id_user);
  await assertClosable(user, password);

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.boat.updateMany({
      where: { id_user, deleted_at: null, is_published: true },
      data: { is_published: false, updated_at: now },
    });
    await tx.refreshToken.updateMany({
      where: { id_user, revoked_at: null },
      data: { revoked_at: now },
    });
    await tx.user.update({
      where: { id_user },
      data: { is_active: false, deactivated_at: now, updated_at: now },
    });
  });

  await sendQuiet(
    sendAccountDeactivatedEmail(user.email, {
      firstName: user.first_name,
      days: PAUSE_RETENTION_DAYS,
    }),
    '[email] Échec envoi désactivation de compte :'
  );
}

export async function deleteOwnAccount(id_user, { password, confirmation } = {}) {
  const user = await loadClosableUser(id_user);

  const typed = String(confirmation || '')
    .trim()
    .toUpperCase();
  if (!DELETION_CONFIRMATIONS.includes(typed)) {
    throw Object.assign(new Error('Confirmation invalide.'), { status: 400 });
  }

  await assertClosable(user, password);

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.boat.updateMany({
      where: { id_user, deleted_at: null },
      data: { is_published: false, deleted_at: now, updated_at: now },
    });
    await tx.refreshToken.updateMany({
      where: { id_user, revoked_at: null },
      data: { revoked_at: now },
    });
    await tx.user.update({
      where: { id_user },
      data: { is_active: false, deactivated_at: null, deleted_at: now, updated_at: now },
    });
  });

  await sendQuiet(
    sendAccountDeletionEmail(user.email, {
      firstName: user.first_name,
      days: DELETION_RETENTION_DAYS,
    }),
    '[email] Échec envoi suppression de compte :'
  );
}

export async function reactivateOwnAccount(id_user, now = new Date()) {
  await prisma.$transaction(async (tx) => {
    await tx.boat.updateMany({
      where: { id_user, deleted_at: null, status: 'published' },
      data: { is_published: true, updated_at: now },
    });
    await tx.user.update({
      where: { id_user },
      data: { is_active: true, deactivated_at: null, pause_notified_at: null, updated_at: now },
    });
  });
}

const DAY_MS = 86400000;

const clampDays = (value, fallback) => {
  const days = Number(value);
  return Number.isFinite(days) && days >= 1 ? Math.trunc(days) : fallback;
};

export const resolvePauseDelays = (params = {}) => {
  const pause = clampDays(params.pauseDays, PAUSE_RETENTION_DAYS);
  // La relance ne peut pas dépasser la pause : sinon la personne serait
  // prévenue après la fermeture.
  const notice = Math.min(clampDays(params.noticeDays, 7), pause - 1);
  return { pause, notice };
};

// Un litige peut être ouvert par l'autre partie pendant la pause : la tâche
// applique le même garde-fou que la fermeture manuelle, sinon elle fermerait un
// compte que l'interface aurait refusé de fermer. Les réservations, elles, n'ont
// pas à être revérifiées : la pause en exige l'absence et un compte en pause ne
// peut plus en créer ni en recevoir.
const NO_OPEN_DISPUTE = {
  disputes: { none: { status: 'open' } },
  bookings: { none: { disputes: { some: { status: 'open' } } } },
  boats: { none: { bookings: { some: { disputes: { some: { status: 'open' } } } } } },
};

// Comptes vivants uniquement. Le filtre sur deactivated_at est porté par chaque
// phase : un `lt` exclut déjà les null, donc les blocages administrateur — qui
// laissent la colonne à null — ne peuvent pas devenir des suppressions.
const PAUSED = { deleted_at: null, anonymized_at: null };

export function pauseNoticeDueWhere(params = {}, now = new Date()) {
  const { pause, notice } = resolvePauseDelays(params);
  return {
    ...PAUSED,
    ...NO_OPEN_DISPUTE,
    pause_notified_at: null,
    deactivated_at: { lt: new Date(now.getTime() - (pause - notice) * DAY_MS) },
  };
}

export function pauseClosureDueWhere(params = {}, now = new Date()) {
  const { pause, notice } = resolvePauseDelays(params);
  return {
    ...PAUSED,
    ...NO_OPEN_DISPUTE,
    pause_notified_at: { lt: new Date(now.getTime() - notice * DAY_MS) },
    deactivated_at: { lt: new Date(now.getTime() - pause * DAY_MS) },
  };
}

export async function notifyPausedUser(user, params = {}, now = new Date()) {
  const { notice } = resolvePauseDelays(params);
  try {
    await sendPauseNoticeEmail(user.email, { firstName: user.first_name, days: notice });
  } catch (err) {
    // L'horodatage n'est pas posé : la relance sera retentée la nuit suivante.
    console.error('[cron] relance pause :', err.message);
    return false;
  }

  await prisma.user.update({ where: { id_user: user.id_user }, data: { pause_notified_at: now } });
  return true;
}

// Ferme le compte comme le ferait son titulaire : l'anonymisation reste à
// users.purge, qui la déclenche après la rétention légale.
export async function closePausedAccount(id_user, now = new Date()) {
  await prisma.$transaction(async (tx) => {
    await tx.boat.updateMany({
      where: { id_user, deleted_at: null },
      data: { is_published: false, deleted_at: now, updated_at: now },
    });
    await tx.refreshToken.updateMany({
      where: { id_user, revoked_at: null },
      data: { revoked_at: now },
    });
    await tx.user.update({
      where: { id_user },
      data: { is_active: false, deactivated_at: null, deleted_at: now, updated_at: now },
    });
  });
}
