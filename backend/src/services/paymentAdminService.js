import prisma from '../config/db.js';

// Format JSON renvoyé au front : on convertit les Decimal Prisma en Number et on
// aplatit la relation booking pour limiter la taille de la réponse.
function publicPayment(p) {
  return {
    id_payment: p.id_payment,
    transaction_ref: p.transaction_ref,
    payment_date: p.payment_date,
    payment_method: p.payment_method,
    status: p.status,
    amount: p.amount != null ? Number(p.amount) : 0,
    commission: p.commission != null ? Number(p.commission) : 0,
    refunded_amount: p.refunded_amount != null ? Number(p.refunded_amount) : null,
    refunded_at: p.refunded_at,
    refund_reason: p.refund_reason,
    id_dispute: p.id_dispute,
    booking: p.booking
      ? {
          id_booking: p.booking.id_booking,
          start_date: p.booking.start_date,
          end_date: p.booking.end_date,
          boat_name: p.booking.boat?.name || null,
          guest_first_name: p.booking.user?.first_name || null,
          guest_last_name: p.booking.user?.last_name || null,
          guest_email: p.booking.user?.email || null,
        }
      : null,
  };
}

// Liste filtrable : statut, méthode, recherche libre sur la référence
// transaction, le nom du bateau et l'email du locataire.
export async function listPayments({ status, method, search } = {}) {
  const where = {};
  if (status && String(status).trim()) where.status = String(status).trim();
  if (method && String(method).trim()) where.payment_method = String(method).trim();
  if (search && String(search).trim()) {
    const s = String(search).trim();
    where.OR = [
      { transaction_ref: { contains: s, mode: 'insensitive' } },
      { booking: { boat: { name: { contains: s, mode: 'insensitive' } } } },
      { booking: { user: { email: { contains: s, mode: 'insensitive' } } } },
      { booking: { user: { last_name: { contains: s, mode: 'insensitive' } } } },
    ];
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      booking: {
        select: {
          id_booking: true,
          start_date: true,
          end_date: true,
          boat: { select: { name: true } },
          user: { select: { first_name: true, last_name: true, email: true } },
        },
      },
    },
    orderBy: { payment_date: 'desc' },
  });

  return payments.map(publicPayment);
}

// Agrégats globaux : volume encaissé, commissions perçues, comptages par statut.
// On limite aux paiements 'success' pour le volume/commission (les pending ou
// failed ne sont pas considérés comme du chiffre d'affaires).
export async function paymentStats() {
  const [success, all] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: 'success' },
      _sum: { amount: true, commission: true },
      _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const counts = { pending: 0, success: 0, failed: 0, refunded: 0 };
  for (const row of all) counts[row.status] = row._count._all;

  return {
    total_volume: success._sum.amount != null ? Number(success._sum.amount) : 0,
    total_commission: success._sum.commission != null ? Number(success._sum.commission) : 0,
    success_count: success._count._all,
    counts,
  };
}
