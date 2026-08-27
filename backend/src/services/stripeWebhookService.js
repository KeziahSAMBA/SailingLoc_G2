import crypto from 'crypto';
import prisma from '../config/db.js';
import { logSanitizedError } from '../utils/privacy.js';
import { lockBookingPayment } from './paymentConcurrency.js';
import {
  PAYMENT_STATES,
  compareAndSetPayment,
  markPaymentReconciliationRequired,
  paymentStateOf,
  transitionPaymentState,
} from './paymentLifecycle.js';

const EVENT_LEASE_MS = 15 * 60 * 1000;
const EVENT_ERROR_MAX_LENGTH = 500;

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
    await lockBookingPayment(tx, payment.id_booking, payment.id_payment);
    const current =
      typeof tx.payment?.findUnique === 'function'
        ? await tx.payment.findUnique({ where: { id_payment: payment.id_payment } })
        : payment;
    if (!current || current.status !== 'pending') return false;

    // A cancellation webhook is authoritative only for an authorization that
    // was still releasable. A succeeded/refunding/refunded row is deliberately
    // left alone: accepting a late canceled event would hide a real charge.
    const state = paymentStateOf(current);
    const releasable = [
      PAYMENT_STATES.CREATING,
      PAYMENT_STATES.CREATION_UNKNOWN,
      PAYMENT_STATES.REQUIRES_PAYMENT_METHOD,
      PAYMENT_STATES.REQUIRES_CAPTURE,
      PAYMENT_STATES.RELEASING,
      PAYMENT_STATES.RECONCILIATION_REQUIRED,
      'legacy_pending',
      'legacy',
    ];
    if (!releasable.includes(state)) return false;

    // Keep the historical unit-test double compatible while the generated
    // Prisma client uses the strict status+state CAS below.
    if (
      typeof tx.payment?.findUnique !== 'function' &&
      typeof tx.payment?.updateMany !== 'function'
    ) {
      await tx.payment.update({
        where: { id_payment: payment.id_payment },
        data: { status: 'failed' },
      });
    } else {
      await transitionPaymentState(tx, payment.id_payment, [state], PAYMENT_STATES.FAILED, {
        fromStatuses: ['pending'],
        data: { status: 'failed', reconciliation_error: null, reconciliation_at: null },
      });
    }

    // Do not cancel a booking that has another active payment attempt. The
    // booking lock makes this check linearizable with pay/owner decisions.
    const other =
      typeof tx.payment?.findFirst === 'function'
        ? await tx.payment.findFirst({
            where: {
              id_booking: payment.id_booking,
              id_payment: { not: payment.id_payment },
              status: { in: ['pending', 'success'] },
            },
            select: { id_payment: true },
          })
        : null;
    if (!other) {
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
    }
    return true;
  };

  if (typeof prisma.$transaction !== 'function') return apply(prisma);
  return prisma.$transaction(apply);
}

async function paymentByTransactionRef(transactionRef) {
  if (!transactionRef || typeof prisma.payment?.findFirst !== 'function') return null;
  return prisma.payment.findFirst({
    where: { transaction_ref: transactionRef },
    select: {
      id_payment: true,
      id_booking: true,
      status: true,
      amount: true,
      refunded_amount: true,
      payment_state: true,
      transaction_ref: true,
    },
  });
}

async function reconcileSucceededEvent(intent) {
  const ref = intent?.id;
  if (!ref) return;
  const payment = await paymentByTransactionRef(ref);

  // An unknown transaction cannot be safely attributed to a local payment.
  // Never perform a booking-scoped update without first acquiring the pair's
  // advisory locks and re-reading its lifecycle state.
  if (!payment) return;

  const apply = async (tx) => {
    await lockBookingPayment(tx, payment.id_booking, payment.id_payment);
    const current =
      typeof tx.payment?.findUnique === 'function'
        ? await tx.payment.findUnique({ where: { id_payment: payment.id_payment } })
        : payment;
    if (!current) return;
    const state = paymentStateOf(current);
    const recoverable = [
      PAYMENT_STATES.CREATING,
      PAYMENT_STATES.CREATION_UNKNOWN,
      PAYMENT_STATES.REQUIRES_PAYMENT_METHOD,
      PAYMENT_STATES.REQUIRES_CAPTURE,
      PAYMENT_STATES.CAPTURING,
      'legacy_pending',
      'legacy',
    ];

    if (current.status === 'pending' && recoverable.includes(state)) {
      await transitionPaymentState(tx, current.id_payment, [state], PAYMENT_STATES.SUCCEEDED, {
        fromStatuses: ['pending'],
        data: { status: 'success', reconciliation_error: null, reconciliation_at: null },
      });
      return;
    }
    if (current.status === 'success' && recoverable.includes(state)) {
      await transitionPaymentState(tx, current.id_payment, [state], PAYMENT_STATES.SUCCEEDED, {
        fromStatuses: ['success'],
        data: { reconciliation_error: null, reconciliation_at: null },
      });
      return;
    }

    // Stripe succeeded while a local release/refund was already in flight.
    // Never overwrite that decision with `success`; retain an explicit,
    // retryable reconciliation marker instead.
    if (
      current.status === 'pending' &&
      [
        PAYMENT_STATES.RELEASING,
        PAYMENT_STATES.REFUNDING,
        PAYMENT_STATES.RECONCILIATION_REQUIRED,
      ].includes(state)
    ) {
      await markPaymentReconciliationRequired(tx, current.id_payment, {
        fromStates: [state],
        fromStatuses: ['pending'],
        error: 'Capture Stripe reçue après une décision de libération locale.',
      });
    }
    // Failed/refunded rows and already-refunded captures intentionally no-op.
  };

  if (typeof prisma.$transaction !== 'function') return apply(prisma);
  return prisma.$transaction(apply);
}

async function reconcileRefundEvent(charge) {
  const ref = charge?.payment_intent;
  const amountCents = Number(charge?.amount_refunded);
  if (!ref || !Number.isFinite(amountCents) || amountCents < 0) return;
  const payment = await paymentByTransactionRef(ref);
  const amount = amountCents / 100;

  // An unknown reference is deliberately ignored. Applying a refund to every
  // matching row without a lock/state CAS could resurrect or overwrite a
  // payment that another worker is currently reconciling.
  if (!payment) return;

  const apply = async (tx) => {
    await lockBookingPayment(tx, payment.id_booking, payment.id_payment);
    const current =
      typeof tx.payment?.findUnique === 'function'
        ? await tx.payment.findUnique({ where: { id_payment: payment.id_payment } })
        : payment;
    if (!current) return;
    const principal = Math.max(0, Number(current.amount));
    if (!Number.isFinite(principal) || amount > principal + 0.000001) {
      // A provider event claiming more than the original payment is not a
      // valid state transition. Keep the row untouched for operator review.
      if (current.status === 'success') {
        await markPaymentReconciliationRequired(tx, current.id_payment, {
          fromStates: [paymentStateOf(current)],
          fromStatuses: ['success'],
          error: 'Montant de remboursement Stripe supérieur au paiement enregistré.',
        });
      }
      return;
    }

    const currentRefunded = Math.max(0, Number(current.refunded_amount || 0));
    // Stripe sends the cumulative amount_refunded. Events can arrive out of
    // order, so never move the durable amount backwards.
    const nextRefunded = Math.min(principal, Math.max(currentRefunded, amount));
    if (nextRefunded <= currentRefunded && current.status === 'refunded') return;
    const complete = nextRefunded >= principal - 0.000001;
    const nextState = complete ? PAYMENT_STATES.REFUNDED : 'partially_refunded';
    const nextStatus = complete ? 'refunded' : 'success';
    const state = paymentStateOf(current);

    // A failed row cannot be resurrected by a late charge event.
    if ([PAYMENT_STATES.FAILED].includes(state) || current.status === 'failed') return;
    await compareAndSetPayment(
      tx,
      current.id_payment,
      [current.status],
      {
        status: nextStatus,
        payment_state: nextState,
        refunded_amount: nextRefunded,
        refunded_at: new Date(),
        refund_reason: 'Remboursement effectué côté Stripe (dashboard ou API externe).',
        reconciliation_error: null,
        reconciliation_at: null,
      },
      { fromStates: [state] }
    );
  };

  if (typeof prisma.$transaction !== 'function') return apply(prisma);
  return prisma.$transaction(apply);
}

async function applyStripeEvent(event) {
  switch (event.type) {
    // Empreinte annulée côté Stripe sans passer par nous : typiquement
    // l'expiration automatique au bout de 7 jours sans décision du proprio.
    case 'payment_intent.canceled': {
      const intent = event.data.object;
      const payment = await prisma.payment.findFirst({
        where: { transaction_ref: intent.id, status: 'pending' },
        select: { id_payment: true, id_booking: true, status: true, payment_state: true },
      });
      if (!payment) return;
      await runCancellationTransition(payment);
      return;
    }

    // Filet de réconciliation : capture connue de Stripe mais pas de la base.
    case 'payment_intent.succeeded': {
      await reconcileSucceededEvent(event.data.object);
      return;
    }

    // Remboursement fait depuis le dashboard Stripe (ou API externe).
    case 'charge.refunded': {
      await reconcileRefundEvent(event.data.object);
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
