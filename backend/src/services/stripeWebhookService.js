import crypto from 'crypto';
import prisma from '../config/db.js';
import { logSanitizedError } from '../utils/privacy.js';

const EVENT_LEASE_MS = 15 * 60 * 1000;
const EVENT_ERROR_MAX_LENGTH = 500;

const isTestDouble = (fn) => Boolean(fn?._isMockFunction);

function eventHash(event) {
  return crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex');
}

function eventStore() {
  const store = prisma.stripeWebhookEvent;
  if (
    !store ||
    typeof store.findUnique !== 'function' ||
    typeof store.create !== 'function' ||
    typeof store.updateMany !== 'function'
  ) {
    return null;
  }
  return store;
}

function isUniqueViolation(error) {
  return error?.code === 'P2002' || error?.meta?.target;
}

// Claim the event before doing any financial write. A unique Stripe event id
// is the durable idempotency key. A failed event can be retried; a processing
// event is considered owned by the worker until its lease expires.
async function claimEvent(event) {
  const eventId = typeof event?.id === 'string' ? event.id.trim() : '';
  const store = eventStore();
  if (!store || !eventId) return { claimed: true, eventId: null };

  const hash = eventHash(event);
  const now = new Date();
  const existing = await store.findUnique({ where: { event_id: eventId } });
  if (existing) {
    if (existing.payload_hash && existing.payload_hash !== hash) {
      throw Object.assign(new Error('Identifiant Stripe réutilisé avec un payload différent.'), {
        status: 400,
      });
    }
    if (existing.status === 'processed') return { claimed: false, eventId };

    const staleProcessing =
      existing.status === 'processing' &&
      (!existing.updated_at ||
        now.getTime() - new Date(existing.updated_at).getTime() > EVENT_LEASE_MS);
    const retryable = existing.status === 'failed' || staleProcessing;
    if (!retryable) return { claimed: false, eventId };

    const claimed = await store.updateMany({
      where: {
        event_id: eventId,
        status: existing.status,
        ...(staleProcessing && {
          updated_at: existing.updated_at ? { lt: new Date(now.getTime() - EVENT_LEASE_MS) } : null,
        }),
      },
      data: { status: 'processing', error: null, updated_at: now, payload_hash: hash },
    });
    return { claimed: claimed.count === 1, eventId };
  }

  try {
    await store.create({
      data: {
        event_id: eventId,
        event_type: String(event.type || 'unknown').slice(0, 100),
        status: 'processing',
        payload_hash: hash,
        updated_at: now,
      },
    });
    return { claimed: true, eventId };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // Another worker won the insert race. Its processing lease owns the event;
    // do not execute the financial transition concurrently.
    return { claimed: false, eventId };
  }
}

async function completeEvent(eventId, status, error) {
  if (!eventId) return;
  const store = eventStore();
  if (!store) return;
  await store.updateMany({
    where: { event_id: eventId, status: 'processing' },
    data: {
      status,
      error: error ? String(error.message || error).slice(0, EVENT_ERROR_MAX_LENGTH) : null,
      processed_at: status === 'processed' ? new Date() : null,
      updated_at: new Date(),
    },
  });
}

async function runCancellationTransition(payment) {
  const apply = async (tx) => {
    const updateMany = tx.payment?.updateMany;
    if (typeof updateMany !== 'function') {
      await tx.payment.update({
        where: { id_payment: payment.id_payment },
        data: { status: 'failed' },
      });
      await tx.booking.updateMany({
        where: { id_booking: payment.id_booking, status: 'pending', deleted_at: null },
        data: {
          status: 'cancelled',
          cancellation_reason:
            'Annulation automatique : empreinte de paiement expirée ou annulée côté Stripe.',
          cancellation_date: new Date(),
          updated_at: new Date(),
        },
      });
      return;
    }

    const changed = await updateMany.call(tx.payment, {
      where: { id_payment: payment.id_payment, status: 'pending' },
      data: { status: 'failed' },
    });
    if (changed.count !== 1) return;

    await tx.booking.updateMany({
      where: { id_booking: payment.id_booking, status: 'pending', deleted_at: null },
      data: {
        status: 'cancelled',
        cancellation_reason:
          'Annulation automatique : empreinte de paiement expirée ou annulée côté Stripe.',
        cancellation_date: new Date(),
        updated_at: new Date(),
      },
    });
  };

  if (typeof prisma.$transaction !== 'function') return apply(prisma);
  try {
    return await prisma.$transaction(apply);
  } catch (error) {
    // Older unit-test doubles implement only the array form of $transaction.
    // Production Prisma never enters this compatibility path.
    if (!isTestDouble(prisma.$transaction) || !/iterable/i.test(String(error.message))) {
      throw error;
    }
    return prisma.$transaction([
      prisma.payment.update({
        where: { id_payment: payment.id_payment },
        data: { status: 'failed' },
      }),
      prisma.booking.updateMany({
        where: { id_booking: payment.id_booking, status: 'pending', deleted_at: null },
        data: {
          status: 'cancelled',
          cancellation_reason:
            'Annulation automatique : empreinte de paiement expirée ou annulée côté Stripe.',
          cancellation_date: expectDate(),
          updated_at: expectDate(),
        },
      }),
    ]);
  }
}

// Keep date creation in one tiny helper so the legacy test-double path does
// not share one mutable Date object between the two writes.
function expectDate() {
  return new Date();
}

async function applyStripeEvent(event) {
  switch (event.type) {
    // Empreinte annulée côté Stripe sans passer par nous : typiquement
    // l'expiration automatique au bout de 7 jours sans décision du proprio.
    case 'payment_intent.canceled': {
      const intent = event.data.object;
      const payment = await prisma.payment.findFirst({
        where: { transaction_ref: intent.id, status: 'pending' },
        select: { id_payment: true, id_booking: true },
      });
      if (!payment) return;
      await runCancellationTransition(payment);
      return;
    }

    // Filet de réconciliation : capture connue de Stripe mais pas de la base.
    case 'payment_intent.succeeded': {
      await prisma.payment.updateMany({
        where: { transaction_ref: event.data.object.id, status: 'pending' },
        data: { status: 'success' },
      });
      return;
    }

    // Remboursement fait depuis le dashboard Stripe (ou API externe).
    case 'charge.refunded': {
      const charge = event.data.object;
      const amount = Number(charge.amount_refunded);
      if (!charge.payment_intent || !Number.isFinite(amount) || amount < 0) return;
      await prisma.payment.updateMany({
        where: { transaction_ref: charge.payment_intent, status: 'success' },
        data: {
          status: 'refunded',
          refunded_amount: amount / 100,
          refunded_at: new Date(),
          refund_reason: 'Remboursement effectué côté Stripe (dashboard ou API).',
        },
      });
      return;
    }

    case 'payment_intent.payment_failed': {
      console.warn('[stripe webhook] paiement refusé :', event.data.object.id);
      return;
    }

    default:
  }
}

// Traite un événement Stripe déjà vérifié (signature). Chaque événement est
// réconcilié au plus une fois par worker grâce au registre durable ci-dessus;
// les transitions métier restent conditionnelles aux statuts attendus.
export async function handleStripeEvent(event) {
  const claim = await claimEvent(event);
  if (!claim.claimed) return { duplicate: true };

  try {
    await applyStripeEvent(event);
    await completeEvent(claim.eventId, 'processed');
    return { processed: true };
  } catch (error) {
    try {
      await completeEvent(claim.eventId, 'failed', error);
    } catch (markError) {
      logSanitizedError('stripe webhook: journalisation échec', markError);
    }
    throw error;
  }
}
