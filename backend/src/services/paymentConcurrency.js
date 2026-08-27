// Shared PostgreSQL advisory locks for booking/payment state transitions.
//
// Every money-affecting path acquires the booking lock first and the payment
// lock second. Keeping one order across services prevents two workers from
// deadlocking while serialising operations that otherwise span an external
// Stripe request and a database compare-and-set.

function validId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function advisoryKey(prefix, id) {
  return `${prefix}:${id}`;
}

/**
 * Lock one booking for the duration of the current transaction.
 * Lightweight unit-test doubles do not implement $executeRaw; in that case
 * the caller still retains its conditional database writes as a fallback.
 */
export async function lockBooking(tx, id_booking) {
  const id = validId(id_booking);
  if (!id || typeof tx?.$executeRaw !== 'function') return false;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${advisoryKey('booking', id)}))`;
  return true;
}

/** Lock one payment after its booking lock has been acquired. */
export async function lockPayment(tx, id_payment) {
  const id = validId(id_payment);
  if (!id || typeof tx?.$executeRaw !== 'function') return false;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${advisoryKey('payment', id)}))`;
  return true;
}

/** Lock the shared booking/payment pair in the only supported order. */
export async function lockBookingPayment(tx, id_booking, id_payment) {
  await lockBooking(tx, id_booking);
  if (id_payment !== undefined && id_payment !== null) await lockPayment(tx, id_payment);
  return true;
}

/** Lock a boat when a transition can claim or release one of its time slots. */
export async function lockBoat(tx, id_boat) {
  const id = validId(id_boat);
  if (!id || typeof tx?.$executeRaw !== 'function') return false;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${advisoryKey('boat', id)}))`;
  return true;
}
