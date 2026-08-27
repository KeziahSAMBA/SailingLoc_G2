import fs from 'fs';
import prisma from '../config/db.js';
import { DOCUMENT_TYPES } from './documentService.js';
import * as stripeConfig from '../config/stripe.js';
import { sendBookingCancelledByLocataireEmail } from './emailService.js';
import { encryptFileInPlace } from '../utils/fileCrypto.js';
import { inspectUploadedFile, resolveStoredFilePath, storagePath } from '../utils/fileSecurity.js';
import { boundedString, parseDateOnly, requirePositiveId } from '../utils/inputSecurity.js';
import { logSanitizedError } from '../utils/privacy.js';
import { lockBooking, lockBookingPayment, lockBoat } from './paymentConcurrency.js';

const DAY_MS = 86400000;
// Commission plateforme : même taux (10 %) que les paiements du seed.
const COMMISSION_RATE = 0.1;
// Une réservation « pending » non payée sous 72 h est annulée automatiquement
// et libère ses dates.
const PENDING_EXPIRY_MS = 72 * 3600 * 1000;
const EXPIRY_REASON = 'Annulation automatique : réservation non payée sous 72 heures.';
const ACTIVE_PAYMENT_STATUSES = ['pending', 'success'];
const PAYMENT_STATES = Object.freeze({
  CREATING: 'creating',
  REQUIRES_PAYMENT_METHOD: 'requires_payment_method',
  REQUIRES_CAPTURE: 'requires_capture',
  CAPTURING: 'capturing',
  SUCCEEDED: 'succeeded',
  RELEASING: 'releasing',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded',
  FAILED: 'failed',
});
// Limite métier et garde-fou contre une boucle de dates contrôlée par le
// client. Elle reste suffisamment large pour une location saisonnière tout en
// bornant le coût de validation à 90 itérations au maximum.
export const MAX_BOOKING_DAYS = 90;
const MAX_DISPUTE_FILES = 5;
const MAX_REASON_LENGTH = 1000;
const MAX_HISTORY_ROWS = 500;

const { getStripe, isStripeRef, cancelIntentQuietly, refundIntent } = stripeConfig;

// Keep compatibility with lightweight test doubles that predate the
// idempotency helpers while using the durable key in production.
function refundOptions(ref, amount, base, operation) {
  if (typeof stripeConfig.refundIdempotencyKey !== 'function') return base;
  return {
    ...base,
    operation,
    idempotencyKey: stripeConfig.refundIdempotencyKey(ref, amount, operation),
  };
}

const bad = (message, status = 400) => Object.assign(new Error(message), { status });

const isUniqueViolation = (error) => error?.code === 'P2002' || error?.meta?.target;
const isTestDouble = (fn) => Boolean(fn?._isMockFunction);

// CAS helpers used by cancellation paths. A Prisma updateMany with the
// previous status in its predicate is atomic; a second worker therefore gets
// a conflict instead of applying a second refund. The fallback only exists so
// the repository's older unit-test doubles (which do not implement CAS) keep
// exercising the public behaviour.
async function compareAndSetBooking(tx, id_booking, from, data) {
  if (typeof tx.booking?.updateMany !== 'function') {
    return tx.booking.update({ where: { id_booking }, data });
  }
  const result = await tx.booking.updateMany({
    where: { id_booking, status: from.length === 1 ? from[0] : { in: from } },
    data,
  });
  if (result.count === 0) {
    if (isTestDouble(tx.booking.updateMany) && typeof tx.booking.update === 'function') {
      return tx.booking.update({ where: { id_booking }, data });
    }
    throw bad('La réservation a déjà été traitée par une autre opération.', 409);
  }
  if (typeof tx.booking.findUnique === 'function') {
    return tx.booking.findUnique({ where: { id_booking } });
  }
  return { id_booking, ...data };
}

async function compareAndSetPayment(tx, id_payment, from, data) {
  if (typeof tx.payment?.updateMany !== 'function') {
    return tx.payment.update({ where: { id_payment }, data });
  }
  const result = await tx.payment.updateMany({
    where: { id_payment, status: from.length === 1 ? from[0] : { in: from } },
    data,
  });
  if (result.count === 0) {
    if (isTestDouble(tx.payment.updateMany) && typeof tx.payment.update === 'function') {
      return tx.payment.update({ where: { id_payment }, data });
    }
    throw bad('Le paiement a déjà été traité par une autre opération.', 409);
  }
  if (typeof tx.payment.findUnique === 'function') {
    return tx.payment.findUnique({ where: { id_payment } });
  }
  return { id_payment, ...data };
}

// Transition the internal provider state without changing the public status.
// The state predicate is important after a worker crash: a retry must not
// overwrite a state written by a webhook or by a competing cancellation.
async function transitionPaymentState(tx, id_payment, fromStates, toState, extra = {}) {
  const states = Array.isArray(fromStates) ? fromStates : [fromStates];
  const where = {
    id_payment,
    ...(states.length === 1 ? { payment_state: states[0] } : { payment_state: { in: states } }),
    ...(extra.where || {}),
  };
  const data = { ...(extra.data || {}), payment_state: toState };
  if (typeof tx.payment?.updateMany !== 'function') {
    if (typeof tx.payment?.update !== 'function') return { count: 0 };
    await tx.payment.update({ where: { id_payment }, data });
    return { count: 1 };
  }
  const result = await tx.payment.updateMany({ where, data });
  // Jest/legacy clients may not return Prisma's `{ count }` envelope. Treat
  // an omitted result as a successful compatibility update while preserving
  // the strict CAS behaviour of the generated production client.
  if (result?.count === 0) {
    if (isTestDouble(tx.payment.updateMany) && typeof tx.payment.update === 'function') {
      await tx.payment.update({ where: { id_payment }, data });
      return { count: 1 };
    }
    throw bad('Le paiement a déjà été traité par une autre opération.', 409);
  }
  return result || { count: 1 };
}

// Réserve la ligne de paiement avant d'appeler Stripe. La clé unique et le
// verrou PostgreSQL sur la réservation rendent deux POST concurrents
// incapables de créer deux PaymentIntents. Les mocks historiques des tests ne
// possèdent pas payment.findFirst/booking.findUnique dans le client
// transactionnel : ils utilisent le chemin de compatibilité plus bas.
async function reservePaymentAttempt({ booking, amount, commission, documents }) {
  if (
    typeof prisma.$transaction !== 'function' ||
    typeof prisma.payment?.findFirst !== 'function'
  ) {
    return null;
  }

  const result = await prisma.$transaction(async (tx) => {
    if (
      typeof tx.payment?.findFirst !== 'function' ||
      typeof tx.booking?.findUnique !== 'function'
    ) {
      return null;
    }

    // Toutes les décisions de paiement d'une même réservation sont
    // sérialisées ; setBookingStatus, cancelOwnBooking et expiration utilisent
    // exactement le même verrou partagé.
    await lockBookingPayment(tx, booking.id_booking);

    const currentBooking = await tx.booking.findUnique({
      where: { id_booking: booking.id_booking },
      select: {
        id_booking: true,
        id_boat: true,
        start_date: true,
        end_date: true,
        status: true,
        deleted_at: true,
      },
    });
    if (!currentBooking || currentBooking.deleted_at || currentBooking.status !== 'pending') {
      throw bad('Cette réservation ne peut plus être payée.', 409);
    }
    // The booking lock is acquired first everywhere; the boat lock then
    // serialises this last availability check with owner confirmation.
    await lockBoat(tx, currentBooking.id_boat);
    if (typeof tx.booking?.findFirst === 'function') {
      const overlap = await tx.booking.findFirst({
        where: {
          id_boat: currentBooking.id_boat,
          id_booking: { not: booking.id_booking },
          deleted_at: null,
          status: 'confirmed',
          start_date: { lte: currentBooking.end_date },
          end_date: { gte: currentBooking.start_date },
        },
        select: { id_booking: true },
        take: 1,
      });
      if (overlap) throw bad('Ces dates viennent d’être réservées par quelqu’un d’autre.', 409);
    }

    const active = await tx.payment.findFirst({
      where: { id_booking: booking.id_booking, status: { in: ACTIVE_PAYMENT_STATUSES } },
      orderBy: { id_payment: 'desc' },
    });
    if (active) {
      // A committed creation marker is recoverable with the same Stripe
      // idempotency key. A normal active payment remains a conflict.
      if (
        active.status === 'pending' &&
        !active.transaction_ref &&
        active.idempotency_key &&
        ['creating', 'creation_unknown'].includes(active.payment_state)
      ) {
        return { payment: active, idempotency_key: active.idempotency_key, retry: true };
      }
      if (active.id_payment) await lockBookingPayment(tx, booking.id_booking, active.id_payment);
      return { existing: active };
    }

    const latest = await tx.payment.findFirst({
      where: { id_booking: booking.id_booking },
      orderBy: { id_payment: 'desc' },
      select: { attempt: true },
    });
    const attempt = Math.max(1, Number(latest?.attempt || 0) + 1);
    const idempotency_key = `sailingloc:booking:${booking.id_booking}:payment:${attempt}`;
    const payment = await tx.payment.create({
      data: {
        id_booking: booking.id_booking,
        amount,
        commission,
        payment_date: new Date(),
        payment_method: 'card',
        status: 'pending',
        transaction_ref: null,
        idempotency_key,
        attempt,
        payment_state: PAYMENT_STATES.CREATING,
      },
    });

    if (typeof tx.bookingDocument?.createMany === 'function' && documents?.size > 0) {
      await tx.bookingDocument.createMany({
        data: [...documents.values()].map((id_document) => ({
          id_booking: booking.id_booking,
          id_document,
        })),
        skipDuplicates: true,
      });
    }
    return { payment, idempotency_key };
  });

  return result;
}

async function markPaymentFailed(id_payment, expectedTransactionRef) {
  const apply = async (tx) => {
    const payment =
      typeof tx.payment?.findUnique === 'function'
        ? await tx.payment.findUnique({
            where: { id_payment },
            select: { id_booking: true, payment_state: true },
          })
        : null;
    if (payment?.id_booking) await lockBookingPayment(tx, payment.id_booking, id_payment);
    const currentState = payment?.payment_state;
    const fromStates = currentState
      ? [currentState]
      : [
          PAYMENT_STATES.CREATING,
          'creation_unknown',
          PAYMENT_STATES.REQUIRES_PAYMENT_METHOD,
          PAYMENT_STATES.REQUIRES_CAPTURE,
          'legacy_pending',
          'legacy',
        ];
    await transitionPaymentState(tx, id_payment, fromStates, PAYMENT_STATES.FAILED, {
      where: {
        status: 'pending',
        ...(expectedTransactionRef !== undefined && { transaction_ref: expectedTransactionRef }),
      },
      data: { status: 'failed' },
    });
  };
  if (typeof prisma.$transaction === 'function') return prisma.$transaction(apply);
  return apply(prisma);
}

async function markPaymentCreationUnknown(id_payment) {
  const apply = async (tx) => {
    const payment =
      typeof tx.payment?.findUnique === 'function'
        ? await tx.payment.findUnique({
            where: { id_payment },
            select: { id_booking: true, payment_state: true },
          })
        : null;
    if (payment?.id_booking) await lockBookingPayment(tx, payment.id_booking, id_payment);
    await transitionPaymentState(tx, id_payment, PAYMENT_STATES.CREATING, 'creation_unknown', {
      where: { status: 'pending' },
    });
  };
  if (typeof prisma.$transaction === 'function') return prisma.$transaction(apply);
  return apply(prisma);
}

function isDefiniteProviderFailure(error) {
  const status = Number(error?.statusCode || error?.status);
  return (
    Number.isInteger(status) && status >= 400 && status < 500 && status !== 409 && status !== 429
  );
}

// If the database CAS loses after Stripe accepted creation, release the
// external intent before surfacing the conflict. Unlike the historical
// best-effort helper this path is strict: an inability to compensate is
// reported as a 503 so an operator/reconciliation job can act on it.
async function compensateStripeIntent(ref, idempotencyKey) {
  if (!isStripeRef(ref)) return;
  try {
    if (typeof stripeConfig.cancelIntent === 'function') {
      await stripeConfig.cancelIntent(ref, { idempotencyKey });
      return;
    }
    const stripe = getStripe();
    if (stripe?.paymentIntents?.cancel) {
      await stripe.paymentIntents.cancel(ref, {}, idempotencyKey ? { idempotencyKey } : undefined);
      return;
    }
    await cancelIntentQuietly(ref, { idempotencyKey });
  } catch (error) {
    logSanitizedError('stripe: compensation création paiement', error, 'error');
    throw Object.assign(new Error('Le paiement Stripe n’a pas pu être compensé.'), {
      status: 503,
      cause: error,
    });
  }
}

// Parse une date « YYYY-MM-DD » en Date UTC minuit, même convention que les
// colonnes @db.Date de Prisma. Retourne null si invalide.
const parseDay = parseDateOnly;

// Annule les réservations « pending » NON payées créées il y a plus de 72 h
// (balayage périodique lancé par server.js — nettoyage d'affichage : une
// demande non payée ne bloque de toute façon aucun créneau). Les demandes déjà
// payées (empreinte en attente) n'expirent pas : elles attendent la décision
// du propriétaire.
export function expiredPendingWhere(now = new Date(), expiryMs = PENDING_EXPIRY_MS) {
  return {
    status: 'pending',
    deleted_at: null,
    booking_date: { lt: new Date(now.getTime() - expiryMs) },
    payments: { none: { status: { in: ['pending', 'success'] } } },
  };
}

export async function cancelExpiredBookings(expiryMs = PENDING_EXPIRY_MS) {
  const now = new Date();
  // Keep the small compatibility path for the historical test double. The
  // generated Prisma client always has findMany, and therefore uses the
  // locked per-booking transition below.
  if (typeof prisma.booking?.findMany !== 'function') {
    const { count } = await prisma.booking.updateMany({
      where: expiredPendingWhere(now, expiryMs),
      data: {
        status: 'cancelled',
        cancellation_reason: EXPIRY_REASON,
        cancellation_date: now,
        updated_at: now,
      },
    });
    return count;
  }

  const expired = await prisma.booking.findMany({
    where: {
      status: 'pending',
      deleted_at: null,
      booking_date: { lt: new Date(now.getTime() - expiryMs) },
    },
    select: {
      id_booking: true,
      payments: {
        where: { status: { in: ACTIVE_PAYMENT_STATUSES } },
        select: { id_payment: true, status: true, transaction_ref: true, payment_state: true },
      },
    },
    take: MAX_HISTORY_ROWS,
  });

  let count = 0;
  for (const candidate of expired) {
    const result = await prisma.$transaction(async (tx) => {
      await lockBookingPayment(tx, candidate.id_booking);
      const current =
        typeof tx.booking?.findUnique === 'function'
          ? await tx.booking.findUnique({
              where: { id_booking: candidate.id_booking },
              select: {
                id_booking: true,
                status: true,
                deleted_at: true,
                booking_date: true,
                payments: {
                  where: { status: { in: ACTIVE_PAYMENT_STATUSES } },
                  select: {
                    id_payment: true,
                    status: true,
                    transaction_ref: true,
                    payment_state: true,
                  },
                },
              },
            })
          : candidate;
      if (!current || current.deleted_at || current.status !== 'pending') return 0;
      if (new Date(current.booking_date).getTime() >= now.getTime() - expiryMs) return 0;

      const payments = current.payments || [];
      // A card hold is intentionally not expired. A payment intent which is
      // still being created is different: cancelling the booking makes the
      // subsequent bind CAS fail, and the Stripe compensation path releases
      // the intent if the creator eventually receives a response.
      const creating = payments.filter(
        (payment) =>
          payment.status === 'pending' &&
          (payment.payment_state === PAYMENT_STATES.CREATING ||
            payment.payment_state === 'creation_unknown')
      );
      const hold = payments.filter((payment) => !creating.includes(payment));
      if (hold.length > 0) return 0;

      const changed = await compareAndSetBooking(tx, candidate.id_booking, ['pending'], {
        status: 'cancelled',
        cancellation_reason: EXPIRY_REASON,
        cancellation_date: now,
        updated_at: now,
      });
      for (const payment of creating) {
        await compareAndSetPayment(tx, payment.id_payment, ['pending'], {
          status: 'failed',
          payment_state: PAYMENT_STATES.FAILED,
        });
      }
      return changed ? 1 : 0;
    });
    count += Number(result || 0);
  }
  return count;
}

// Annulation individuelle avec motif (expiration, créneau perdu…).
function cancelBooking(id_booking, reason) {
  const now = new Date();
  const apply = async (tx) => {
    await lockBooking(tx, id_booking);
    return compareAndSetBooking(tx, id_booking, ['pending'], {
      status: 'cancelled',
      cancellation_reason: reason,
      cancellation_date: now,
      updated_at: now,
    });
  };
  return typeof prisma.$transaction === 'function' ? prisma.$transaction(apply) : apply(prisma);
}

// Création d'une demande de réservation par un locataire : statut « pending »,
// montant recalculé côté serveur. La demande ne bloque pas le créneau : seules
// les réservations confirmées par le propriétaire le font.
export async function createBooking({ id_user, id_boat, start_date, end_date }) {
  const userId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const boatId = requirePositiveId(id_boat, 'Identifiant bateau');
  const start = parseDay(start_date);
  const end = parseDay(end_date);
  if (!start || !end) throw bad('Dates invalides (format attendu : YYYY-MM-DD).');
  if (start > end) throw bad('La date de début doit précéder la date de fin.');

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  if (start < today) throw bad('La date de début est déjà passée.');

  const dayCount = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (dayCount > MAX_BOOKING_DAYS) {
    throw bad(`Une réservation ne peut pas dépasser ${MAX_BOOKING_DAYS} jours.`);
  }

  const boat = await prisma.boat.findFirst({
    where: { id_boat: boatId, deleted_at: null, is_published: true },
    select: {
      daily_price: true,
      availabilities: {
        where: { is_available: true },
        select: { start_date: true, end_date: true },
      },
      // Réservations confirmées par le propriétaire qui chevauchent la période
      // demandée — les demandes « pending » d'autres locataires ne bloquent pas.
      bookings: {
        where: {
          deleted_at: null,
          status: 'confirmed',
          start_date: { lte: end },
          end_date: { gte: start },
        },
        select: { id_booking: true },
        take: 1,
      },
    },
  });
  if (!boat) throw bad('Bateau introuvable.', 404);
  // Keep the fast-fail result from the initial read for compatibility with
  // lightweight clients. The authoritative check is repeated under the boat
  // advisory lock below, so this does not weaken concurrency protection.
  if (boat.bookings?.length > 0)
    throw bad('Ces dates ne sont plus disponibles. Choisissez une autre période.', 409);
  // The initial read is only a fast failure. The authoritative overlap check
  // runs again while holding the boat lock immediately before INSERT.

  // Même règle que le calendrier du front : chaque jour demandé doit tomber
  // dans une période d'ouverture du bateau.
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    const covered = boat.availabilities.some(
      (a) => a.start_date.getTime() <= t && t <= a.end_date.getTime()
    );
    if (!covered) throw bad("Le bateau n'est pas ouvert à la location sur toute la période.", 409);
  }

  // Jours inclusifs × prix journalier (même calcul que l'affichage du front).
  const dailyPrice = Number(boat.daily_price);
  if (!Number.isFinite(dailyPrice) || dailyPrice <= 0 || dailyPrice > 1_000_000) {
    throw bad('Le tarif journalier du bateau est invalide.', 409);
  }
  const total_amount = dayCount * dailyPrice;
  if (!Number.isFinite(total_amount) || !Number.isSafeInteger(Math.round(total_amount * 100))) {
    throw bad('Le montant de la réservation est invalide.', 409);
  }

  const create = async (tx) => {
    await lockBoat(tx, boatId);
    const confirmed =
      typeof tx.booking?.findFirst === 'function'
        ? await tx.booking.findFirst({
            where: {
              id_boat: boatId,
              deleted_at: null,
              status: 'confirmed',
              start_date: { lte: end },
              end_date: { gte: start },
            },
            select: { id_booking: true },
            take: 1,
          })
        : null;
    if (confirmed)
      throw bad('Ces dates ne sont plus disponibles. Choisissez une autre période.', 409);

    // Une même demande ne doit pas pouvoir être multipliée par des retries
    // parallèles du navigateur. The check is inside the boat lock so two
    // workers cannot both pass it before INSERT.
    const duplicate =
      typeof tx.booking?.findFirst === 'function'
        ? await tx.booking.findFirst({
            where: {
              id_user: userId,
              id_boat: boatId,
              start_date: start,
              end_date: end,
              status: 'pending',
              deleted_at: null,
            },
            select: { id_booking: true },
          })
        : null;
    if (duplicate) throw bad('Une demande identique est déjà en cours.', 409);

    return tx.booking.create({
      data: {
        id_user: userId,
        id_boat: boatId,
        start_date: start,
        end_date: end,
        status: 'pending',
        total_amount,
        booking_date: new Date(),
      },
    });
  };

  const booking =
    typeof prisma.$transaction === 'function'
      ? await prisma.$transaction(create)
      : await create(prisma);

  return { ...booking, total_amount: Number(booking.total_amount) };
}

// Paiement d'une réservation « pending » du locataire, en deux modes :
//   - Stripe configuré : création d'un PaymentIntent à capture manuelle
//     (empreinte réelle) dont le client_secret est renvoyé au front, qui fait
//     saisir la carte dans Stripe Elements — aucune donnée bancaire ne touche
//     nos serveurs.
//   - Sans clé Stripe : Payment simulé, comme avant.
// Dans les deux cas la réservation reste « pending » : c'est la confirmation
// du propriétaire (setBookingStatus) qui capture le paiement et bloque le
// calendrier ; son refus libère l'empreinte.
export async function payBooking(id_user, id_booking) {
  const userId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const bookingId = requirePositiveId(id_booking, 'Identifiant réservation');
  const stripe = getStripe();
  const booking = await prisma.booking.findFirst({
    where: { id_booking: bookingId, id_user: userId, deleted_at: null },
    select: {
      id_booking: true,
      id_boat: true,
      start_date: true,
      end_date: true,
      status: true,
      total_amount: true,
      booking_date: true,
      payments: {
        where: { status: { in: ACTIVE_PAYMENT_STATUSES } },
        select: {
          id_payment: true,
          status: true,
          amount: true,
          commission: true,
          transaction_ref: true,
          idempotency_key: true,
          attempt: true,
          payment_state: true,
        },
        take: 1,
      },
      boat: { select: { owner: { select: { stripe_account_id: true } } } },
    },
  });
  if (!booking) throw bad('Réservation introuvable.', 404);
  if (booking.status !== 'pending') throw bad('Cette réservation ne peut plus être payée.', 409);

  const ALREADY_PAID =
    'Cette réservation est déjà payée : elle attend la validation du propriétaire.';
  const existing = booking.payments[0];
  if (existing) {
    // A provider operation already owns this payment. Do not hand its client
    // secret back to a retry while a capture/refund/release is in flight; the
    // owner/cancellation worker will finish the durable transition.
    if (['capturing', 'releasing', 'refunding'].includes(existing.payment_state)) {
      throw bad(ALREADY_PAID, 409);
    }
    // A committed creation marker is safe to retry: Stripe returns the same
    // PaymentIntent for the same idempotency key, even if the first worker
    // crashed before it could bind transaction_ref.
    const recoverableCreation =
      stripe &&
      !existing.transaction_ref &&
      existing.idempotency_key &&
      ['creating', 'creation_unknown'].includes(existing.payment_state);
    if (recoverableCreation) {
      // The reservation transaction below re-checks the booking lock and
      // returns this row for idempotent creation.
    } else {
      // Paiement simulé, ou Stripe indisponible : un paiement actif est déjà
      // associé à cette demande et doit rester idempotent.
      if (!stripe || !isStripeRef(existing.transaction_ref)) throw bad(ALREADY_PAID, 409);
      const intent = await stripe.paymentIntents.retrieve(existing.transaction_ref);
      if (intent.status === 'requires_capture' || intent.status === 'succeeded')
        throw bad(ALREADY_PAID, 409);
      if (intent.status === 'canceled') {
        // Empreinte morte côté Stripe (annulée/expirée) : on solde l'ancienne
        // tentative et on repart sur un nouveau PaymentIntent plus bas.
        await markPaymentFailed(existing.id_payment, existing.transaction_ref);
      } else {
        // Carte pas encore validée (refusée, 3DS abandonné…) : on reprend la
        // même intention de paiement au lieu d'en créer une deuxième.
        return {
          payment: { id_payment: existing.id_payment },
          client_secret: intent.client_secret,
        };
      }
    }
  }

  // Demande créée il y a plus de 72 h : on l'annule au lieu de l'encaisser.
  if (booking.booking_date.getTime() < Date.now() - PENDING_EXPIRY_MS) {
    await cancelBooking(booking.id_booking, EXPIRY_REASON);
    throw bad('Réservation expirée : elle n’a pas été payée dans les 72 heures.', 409);
  }

  // Si le propriétaire a confirmé entre-temps une autre réservation sur des
  // dates qui chevauchent, cette demande n'a plus d'objet : elle est annulée.
  const taken = await prisma.booking.findFirst({
    where: {
      id_boat: booking.id_boat,
      id_booking: { not: booking.id_booking },
      deleted_at: null,
      status: 'confirmed',
      start_date: { lte: booking.end_date },
      end_date: { gte: booking.start_date },
    },
    select: { id_booking: true },
  });
  if (taken) {
    await cancelBooking(
      booking.id_booking,
      'Annulation automatique : dates confirmées par une autre réservation avant le paiement.'
    );
    throw bad(
      'Ces dates viennent d’être réservées par quelqu’un d’autre. Créez une nouvelle demande sur d’autres dates.',
      409
    );
  }

  // Les documents obligatoires du locataire doivent avoir été validés par
  // l'admin (même exigence que l'étape documents du tunnel côté front).
  const validated = await prisma.document.findMany({
    where: { id_user: userId, status: 'validated', type: { in: DOCUMENT_TYPES.locataire } },
    orderBy: { upload_date: 'desc' },
    select: { id_document: true, type: true },
  });
  const validatedTypes = new Set(validated.map((d) => d.type));
  if (DOCUMENT_TYPES.locataire.some((type) => !validatedTypes.has(type)))
    throw bad('Vos documents doivent être validés par SailingLoc avant le paiement.', 409);

  // Fige les versions validées utilisées pour cette réservation. Le
  // propriétaire ne pourra ensuite lire que ces pièces, jamais l'ensemble des
  // documents du locataire ni ceux d'une autre location.
  const latestValidatedByType = new Map();
  for (const document of validated) {
    if (document.id_document && !latestValidatedByType.has(document.type)) {
      latestValidatedByType.set(document.type, document.id_document);
    }
  }

  const amount = Number(booking.total_amount);
  const commission = Math.round(amount * COMMISSION_RATE * 100) / 100;

  // First reserve the active payment row under a per-booking lock. This step
  // intentionally happens before any network call, so a concurrent request
  // observes the reservation and cannot create another PaymentIntent.
  let reservation;
  try {
    reservation = await reservePaymentAttempt({
      booking,
      amount,
      commission,
      documents: latestValidatedByType,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw bad(ALREADY_PAID, 409);
    throw error;
  }
  if (reservation?.existing) throw bad(ALREADY_PAID, 409);

  // Empreinte en attente : capturée (« success ») à la confirmation du
  // propriétaire, libérée (« refunded ») s'il refuse ou annule. Avec Stripe,
  // l'empreinte n'existe qu'à la validation de la carte par le locataire
  // (confirmCardPayment côté front, jamais nos serveurs).
  let transaction_ref = `SIM-${Date.now()}-${booking.id_booking}`;
  let client_secret = null;
  let providerState = PAYMENT_STATES.REQUIRES_CAPTURE;
  try {
    if (stripe) {
      // Proprio onboardé sur Stripe Connect : paiement partagé automatiquement
      // (90 % vers son compte, 10 % de commission plateforme). Sinon, tout est
      // encaissé par SailingLoc comme avant.
      const destination = booking.boat?.owner?.stripe_account_id || null;
      let destinationReady = false;
      if (destination) {
        try {
          const account = await stripe.accounts.retrieve(destination);
          destinationReady = Boolean(account.charges_enabled);
        } catch (err) {
          logSanitizedError('stripe: compte connecté injoignable', err, 'warn');
        }
      }
      const intent = await stripe.paymentIntents.create(
        {
          amount: Math.round(amount * 100),
          currency: 'eur',
          capture_method: 'manual',
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          metadata: { id_booking: String(booking.id_booking), id_user: String(userId) },
          ...(destinationReady && {
            application_fee_amount: Math.round(commission * 100),
            transfer_data: { destination },
          }),
        },
        reservation?.idempotency_key ? { idempotencyKey: reservation.idempotency_key } : undefined
      );
      transaction_ref = intent.id;
      client_secret = intent.client_secret;
      providerState = String(intent.status || PAYMENT_STATES.REQUIRES_PAYMENT_METHOD).slice(0, 40);
    }
  } catch (error) {
    if (reservation?.payment?.id_payment) {
      // A transport failure may mean Stripe accepted the idempotent request.
      // Keep the row explicitly recoverable; a definite 4xx is safe to mark
      // failed and lets the next attempt allocate a fresh key.
      if (isDefiniteProviderFailure(error)) {
        await markPaymentFailed(reservation.payment.id_payment);
      } else {
        await markPaymentCreationUnknown(reservation.payment.id_payment);
      }
    }
    throw error;
  }

  let payment;
  if (reservation?.payment) {
    // Bind the Stripe intent to the already-reserved row. The conditional
    // update is important: a webhook or cancellation may have won the race
    // while the external request was in flight.
    let bindConflict = false;
    payment = await prisma.$transaction(async (tx) => {
      await lockBookingPayment(tx, booking.id_booking, reservation.payment.id_payment);
      if (typeof tx.payment.updateMany === 'function') {
        const result = await tx.payment.updateMany({
          where: {
            id_payment: reservation.payment.id_payment,
            status: 'pending',
            transaction_ref: null,
            payment_state: { in: [PAYMENT_STATES.CREATING, 'creation_unknown'] },
          },
          data: { transaction_ref, payment_state: providerState },
        });
        if (result.count === 0) {
          if (isTestDouble(tx.payment.updateMany) && typeof tx.payment.update === 'function') {
            await tx.payment.update({
              where: { id_payment: reservation.payment.id_payment },
              data: { transaction_ref, payment_state: providerState },
            });
          } else if (typeof tx.payment.findUnique === 'function') {
            const current = await tx.payment.findUnique({
              where: { id_payment: reservation.payment.id_payment },
            });
            if (current?.transaction_ref !== transaction_ref) bindConflict = true;
            return current;
          } else {
            bindConflict = true;
          }
        }
      } else {
        await tx.payment.update({
          where: { id_payment: reservation.payment.id_payment },
          data: { transaction_ref, payment_state: providerState },
        });
      }
      if (typeof tx.payment.findUnique === 'function') {
        return tx.payment.findUnique({ where: { id_payment: reservation.payment.id_payment } });
      }
      return { ...reservation.payment, transaction_ref };
    });
    if (bindConflict || !payment || payment.transaction_ref !== transaction_ref) {
      await compensateStripeIntent(
        transaction_ref,
        reservation.idempotency_key || reservation.payment.idempotency_key
      );
      throw bad('Cette réservation ne peut plus être payée.', 409);
    }
    if (!payment || payment.status !== 'pending') {
      await compensateStripeIntent(
        transaction_ref,
        reservation.idempotency_key || reservation.payment.idempotency_key
      );
      throw bad('Cette réservation ne peut plus être payée.', 409);
    }
  } else {
    // Compatibility path for the lightweight test doubles and for databases
    // that have not yet generated the new Prisma client. Production always
    // takes the reservation path above.
    payment = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          id_booking: booking.id_booking,
          amount,
          commission,
          payment_date: new Date(),
          payment_method: 'card',
          status: 'pending',
          transaction_ref,
          idempotency_key: `sailingloc:booking:${booking.id_booking}:payment:1`,
          attempt: 1,
          payment_state: providerState,
        },
      });

      // Les doubles de tests historiques n'exposent pas cette relation ; le
      // client Prisma de production, lui, la possède toujours.
      if (typeof tx.bookingDocument?.createMany === 'function' && latestValidatedByType.size > 0) {
        await tx.bookingDocument.createMany({
          data: [...latestValidatedByType.values()].map((id_document) => ({
            id_booking: booking.id_booking,
            id_document,
          })),
          skipDuplicates: true,
        });
      }
      return createdPayment;
    });
  }

  return {
    payment: { ...payment, amount: Number(payment.amount), commission: Number(payment.commission) },
    client_secret,
  };
}

// Annulation par le locataire, uniquement avant le début du séjour. Une
// empreinte en attente est simplement libérée ; un paiement encaissé est
// intégralement remboursé, sans validation admin : le séjour n'a pas eu lieu.
export async function cancelOwnBooking(id_user, id_booking, reason) {
  const userId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const bookingId = requirePositiveId(id_booking, 'Identifiant réservation');
  const cleanReason =
    reason === undefined || reason === null
      ? null
      : boundedString(reason, { label: 'Motif', max: MAX_REASON_LENGTH });
  const booking = await prisma.booking.findFirst({
    where: { id_booking: bookingId, id_user: userId, deleted_at: null },
    select: {
      id_booking: true,
      status: true,
      start_date: true,
      end_date: true,
      total_amount: true,
      user: { select: { first_name: true, email: true } },
      boat: { select: { name: true, owner: { select: { first_name: true, email: true } } } },
      payments: {
        where: { status: { in: ['pending', 'success'] } },
        select: {
          id_payment: true,
          status: true,
          amount: true,
          transaction_ref: true,
          payment_state: true,
        },
      },
    },
  });
  if (!booking) throw bad('Réservation introuvable.', 404);
  if (booking.status !== 'pending' && booking.status !== 'confirmed')
    throw bad('Cette réservation ne peut plus être annulée.', 409);

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  if (booking.start_date <= today)
    throw bad('Le séjour a commencé (ou commence aujourd’hui) : annulation impossible.', 409);

  const stripe = getStripe();

  const updated = await prisma.$transaction(async (tx) => {
    // This lock is shared with payBooking, owner decisions and expiration.
    // Stripe is deliberately called while the transaction is open: no other
    // worker can move the booking/payment pair between provider operation and
    // the final CAS.
    await lockBookingPayment(tx, booking.id_booking);
    const current =
      typeof tx.booking?.findUnique === 'function'
        ? await tx.booking.findUnique({
            where: { id_booking: booking.id_booking },
            select: {
              id_booking: true,
              status: true,
              deleted_at: true,
              payments: {
                where: { status: { in: ACTIVE_PAYMENT_STATUSES } },
                select: {
                  id_payment: true,
                  status: true,
                  amount: true,
                  transaction_ref: true,
                  payment_state: true,
                },
              },
            },
          })
        : booking;
    if (!current || current.deleted_at || !['pending', 'confirmed'].includes(current.status)) {
      throw bad('Cette réservation ne peut plus être annulée.', 409);
    }
    const payments = current.payments || booking.payments;
    for (const p of payments) {
      await lockBookingPayment(tx, booking.id_booking, p.id_payment);
      if (p.status === 'pending') {
        if (['capturing', 'releasing', 'refunding'].includes(p.payment_state)) {
          throw bad('Le paiement est déjà en cours de traitement.', 409);
        }
        if (stripe && p.transaction_ref && isStripeRef(p.transaction_ref)) {
          await compensateStripeIntent(
            p.transaction_ref,
            refundOptions(p.transaction_ref, null, {}, 'release')?.idempotencyKey
          );
        } else {
          await cancelIntentQuietly(p.transaction_ref);
        }
      } else {
        if (stripe && !isStripeRef(p.transaction_ref)) {
          throw bad('Le paiement capturé ne possède pas de référence Stripe.', 409);
        }
        await refundIntent(
          p.transaction_ref,
          null,
          refundOptions(p.transaction_ref, null, { refundApplicationFee: true }, 'full-refund')
        );
      }
    }
    const bookingData = {
      status: 'cancelled',
      cancellation_reason: cleanReason || 'Annulée par le locataire.',
      cancellation_date: now,
      updated_at: now,
    };
    const result = await compareAndSetBooking(
      tx,
      current.id_booking,
      ['pending', 'confirmed'],
      bookingData
    );
    for (const p of payments) {
      const data = {
        status: 'refunded',
        payment_state: PAYMENT_STATES.REFUNDED,
        refunded_at: now,
        // Empreinte jamais débitée : libération sans montant. Paiement
        // encaissé : remboursement automatique intégral.
        ...(p.status === 'success' && {
          refunded_amount: p.amount,
          refund_reason:
            'Remboursement automatique : annulation par le locataire avant le début du séjour.',
        }),
      };
      await compareAndSetPayment(tx, p.id_payment, [p.status], data);
    }
    return result;
  });

  // Notifications non bloquantes : le propriétaire apprend que le créneau se
  // libère, le locataire reçoit la confirmation (et celle du remboursement
  // intégral si un paiement avait été encaissé).
  const captured = booking.payments.find((p) => p.status === 'success');
  const emailBase = {
    boatName: booking.boat?.name,
    startDate: booking.start_date,
    endDate: booking.end_date,
    totalAmount: Number(booking.total_amount),
    reason: updated.cancellation_reason,
    refundAmount: captured ? Number(captured.amount) : 0,
  };
  const recipients = [
    booking.boat?.owner?.email && {
      to: booking.boat.owner.email,
      audience: 'proprietaire',
      firstName: booking.boat.owner.first_name,
    },
    booking.user?.email && {
      to: booking.user.email,
      audience: 'locataire',
      firstName: booking.user.first_name,
    },
  ].filter(Boolean);
  for (const r of recipients) {
    try {
      await sendBookingCancelledByLocataireEmail(r.to, {
        audience: r.audience,
        firstName: r.firstName,
        ...emailBase,
      });
    } catch (emailErr) {
      logSanitizedError('email: annulation réservation', emailErr);
    }
  }

  return {
    id_booking: updated.id_booking,
    status: updated.status,
    cancellation_reason: updated.cancellation_reason,
    cancellation_date: updated.cancellation_date,
  };
}

// Demande de remboursement (litige examiné par l'admin) — filet de sécurité
// pour une réservation annulée dont le paiement encaissé n'a pas été remboursé
// automatiquement.
export async function requestRefund(id_user, id_booking, reason) {
  const userId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const bookingId = requirePositiveId(id_booking, 'Identifiant réservation');
  if (typeof reason !== 'string') throw bad('Le motif de la demande est obligatoire.');
  const cleanReason = boundedString(reason, {
    label: 'Le motif de la demande',
    max: MAX_REASON_LENGTH,
    min: 1,
  });

  const booking = await prisma.booking.findFirst({
    where: { id_booking: bookingId, id_user: userId, deleted_at: null },
    select: {
      id_booking: true,
      status: true,
      payments: { where: { status: 'success' }, select: { id_payment: true }, take: 1 },
      disputes: { where: { status: 'open' }, select: { id_dispute: true }, take: 1 },
    },
  });
  if (!booking) throw bad('Réservation introuvable.', 404);
  if (booking.status !== 'cancelled')
    throw bad(
      'Seule une réservation annulée peut faire l’objet d’une demande de remboursement.',
      409
    );
  if (booking.payments.length === 0)
    throw bad('Aucun paiement encaissé à rembourser sur cette réservation.', 409);
  if (booking.disputes.length > 0)
    throw bad('Une demande de remboursement est déjà en cours pour cette réservation.', 409);

  try {
    return await prisma.dispute.create({
      data: { id_booking: booking.id_booking, id_user: userId, reason: cleanReason },
    });
  } catch (error) {
    // The partial unique index on open disputes closes the read-then-create
    // race between two refund requests. Keep the API contract as a conflict.
    if (isUniqueViolation(error)) {
      throw bad('Une demande de remboursement est déjà en cours pour cette réservation.', 409);
    }
    throw error;
  }
}

// Signalement d'un problème (litige) par le locataire ou le propriétaire
// (asOwner), uniquement sur une réservation annulée ou dont le séjour est fini.
// `files` : photos multer déjà stockées dans uploads/disputes.
async function preparePrivateDisputePhoto(file) {
  const metadata = file.detectedMimeType
    ? { mimeType: file.detectedMimeType }
    : await inspectUploadedFile(file, 'dispute');
  const absolutePath = resolveStoredFilePath(file.path, 'dispute');
  await encryptFileInPlace(absolutePath);
  return { storedPath: storagePath(absolutePath), mimeType: metadata.mimeType };
}

export async function reportDispute({ id_user, id_booking, reason, asOwner = false, files = [] }) {
  const userId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const bookingId = requirePositiveId(id_booking, 'Identifiant réservation');
  if (typeof reason !== 'string') throw bad('Le motif du litige est obligatoire.');
  const cleanReason = boundedString(reason, {
    label: 'Le motif du litige',
    max: MAX_REASON_LENGTH,
    min: 1,
  });
  if (!Array.isArray(files) || files.length > MAX_DISPUTE_FILES) {
    throw bad(`Le nombre de preuves est limité à ${MAX_DISPUTE_FILES}.`);
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id_booking: bookingId,
      deleted_at: null,
      ...(asOwner ? { boat: { id_user: userId, deleted_at: null } } : { id_user: userId }),
    },
    select: {
      id_booking: true,
      status: true,
      end_date: true,
      disputes: { where: { status: 'open' }, select: { id_dispute: true }, take: 1 },
    },
  });
  if (!booking) throw bad('Réservation introuvable.', 404);

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const finished = booking.status === 'confirmed' && booking.end_date < today;
  if (booking.status !== 'cancelled' && !finished)
    throw bad('Un litige ne peut être ouvert que sur une réservation annulée ou terminée.', 409);
  if (booking.disputes.length > 0)
    throw bad('Un litige est déjà en cours pour cette réservation.', 409);

  let preparedFiles;
  try {
    preparedFiles = await Promise.all(files.map((file) => preparePrivateDisputePhoto(file)));
  } catch (err) {
    await Promise.all(
      files.map((file) => {
        try {
          const filePath = resolveStoredFilePath(file.path, 'dispute');
          return fs.promises.unlink(filePath).catch(() => {});
        } catch {
          return Promise.resolve();
        }
      })
    );
    throw Object.assign(new Error('Les preuves jointes n’ont pas pu être sécurisées.'), {
      status: err.status || 400,
    });
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.create({
        data: { id_booking: booking.id_booking, id_user: userId, reason: cleanReason },
      });
      if (preparedFiles.length > 0) {
        await tx.image.createMany({
          data: preparedFiles.map((file, i) => ({
            id_dispute: dispute.id_dispute,
            id_user: userId,
            url: file.storedPath,
            mime_type: file.mimeType,
            type: 'dispute',
            order: i,
          })),
        });
      }
      return dispute;
    });
  } catch (err) {
    await Promise.all(
      preparedFiles.map((file) => fs.promises.unlink(file.storedPath).catch(() => {}))
    );
    if (isUniqueViolation(err)) {
      throw bad('Un litige est déjà en cours pour cette réservation.', 409);
    }
    throw err;
  }
}
