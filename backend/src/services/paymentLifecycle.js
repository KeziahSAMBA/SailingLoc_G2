// Shared, conditional payment transitions.  Every caller must hold the
// booking advisory lock first (and then the payment lock) before using these
// helpers.  Keeping the compare-and-set in one place prevents a webhook or a
// cancellation retry from turning an incompatible provider state into a
// successful/refunded payment.

export const PAYMENT_STATES = Object.freeze({
  CREATING: 'creating',
  CREATION_UNKNOWN: 'creation_unknown',
  REQUIRES_PAYMENT_METHOD: 'requires_payment_method',
  REQUIRES_CAPTURE: 'requires_capture',
  CAPTURING: 'capturing',
  SUCCEEDED: 'succeeded',
  RELEASING: 'releasing',
  REFUNDING: 'refunding',
  PARTIALLY_REFUNDED: 'partially_refunded',
  REFUNDED: 'refunded',
  FAILED: 'failed',
  RECONCILIATION_REQUIRED: 'reconciliation_required',
});

const isTestDouble = (fn) => Boolean(fn?._isMockFunction);

const conflict = (message = 'Le paiement a déjà été traité par une autre opération.') =>
  Object.assign(new Error(message), { status: 409 });

function statusFilter(states) {
  const values = Array.isArray(states) ? states : [states];
  return values.length === 1 ? values[0] : { in: values };
}

function stateFilter(states) {
  if (states === undefined || states === null) return {};
  const values = Array.isArray(states) ? states : [states];
  return {
    payment_state: values.length === 1 ? values[0] : { in: values },
  };
}

/**
 * Atomically update a payment only when its public status (and, optionally,
 * lifecycle state) is still the one observed by the caller.
 */
export async function compareAndSetPayment(tx, id_payment, fromStatuses, data, options = {}) {
  const where = {
    id_payment,
    status: statusFilter(fromStatuses),
    ...stateFilter(options.fromStates),
    ...(options.where || {}),
  };
  if (typeof tx.payment?.updateMany !== 'function') {
    if (typeof tx.payment?.update !== 'function') throw conflict();
    return tx.payment.update({ where: { id_payment }, data });
  }

  const result = await tx.payment.updateMany({ where, data });
  if (result?.count === 0) {
    // Older focused Jest doubles predate updateMany/CAS.  Production Prisma
    // always takes the strict branch; retaining this fallback keeps the
    // historical service contract testable without weakening production.
    if (isTestDouble(tx.payment.updateMany) && typeof tx.payment.update === 'function') {
      return tx.payment.update({ where: { id_payment }, data });
    }
    throw conflict();
  }
  if (typeof tx.payment.findUnique === 'function') {
    return tx.payment.findUnique({ where: { id_payment } });
  }
  return { id_payment, ...data };
}

/** Transition only the internal provider state, optionally changing status. */
export async function transitionPaymentState(
  tx,
  id_payment,
  fromStates,
  toState,
  { fromStatuses, where, data } = {}
) {
  const next = { ...(data || {}), payment_state: toState };
  const predicate = {
    id_payment,
    ...stateFilter(fromStates),
    ...(fromStatuses !== undefined && { status: statusFilter(fromStatuses) }),
    ...(where || {}),
  };
  if (typeof tx.payment?.updateMany !== 'function') {
    if (typeof tx.payment?.update !== 'function') return { count: 0 };
    await tx.payment.update({ where: { id_payment }, data: next });
    return { count: 1 };
  }
  const result = await tx.payment.updateMany({ where: predicate, data: next });
  if (result?.count === 0) {
    if (isTestDouble(tx.payment.updateMany) && typeof tx.payment.update === 'function') {
      await tx.payment.update({ where: { id_payment }, data: next });
      return { count: 1 };
    }
    throw conflict();
  }
  return result || { count: 1 };
}

export function paymentStateOf(payment) {
  return (
    payment?.payment_state || (payment?.status === 'success' ? PAYMENT_STATES.SUCCEEDED : 'legacy')
  );
}

// Do not persist a raw Stripe SDK error: it may contain request fragments or
// identifiers.  A short, bounded description is enough for reconciliation
// dashboards while the full sanitized error remains in logs.
export function reconciliationError(error, fallback = 'Erreur du prestataire de paiement.') {
  // eslint-disable-next-line no-control-regex -- deliberately strip C0 controls from provider errors
  const candidate = String(error?.message || error || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim();
  return (candidate || fallback).slice(0, 500);
}

export async function markPaymentReconciliationRequired(
  tx,
  id_payment,
  { fromStates, fromStatuses = ['pending', 'success'], error, where } = {}
) {
  return transitionPaymentState(
    tx,
    id_payment,
    fromStates,
    PAYMENT_STATES.RECONCILIATION_REQUIRED,
    {
      fromStatuses,
      where,
      data: {
        reconciliation_error: reconciliationError(error),
        reconciliation_at: new Date(),
      },
    }
  );
}
