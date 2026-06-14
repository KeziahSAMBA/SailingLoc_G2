import prisma from '../config/db.js';

// Statistiques générales + séries pour les graphiques du tableau de bord admin.
export async function getAdminStats() {
  const [
    users,
    bookings,
    payments,
    statusGroups,
    bookingsByMonth,
    revenueByMonth,
    commissionByMonth,
  ] = await Promise.all([
    prisma.user.count({ where: { deleted_at: null } }),
    prisma.booking.count({ where: { deleted_at: null } }),
    // Revenus/commissions : uniquement les paiements aboutis.
    prisma.payment.aggregate({
      where: { status: 'success' },
      _sum: { amount: true, commission: true },
    }),
    // Répartition des réservations par statut.
    prisma.booking.groupBy({
      by: ['status'],
      where: { deleted_at: null },
      _count: { _all: true },
    }),
    // Réservations par mois (sur la date de réservation).
    prisma.$queryRaw`
      SELECT to_char(booking_date, 'YYYY-MM') AS month, COUNT(*)::int AS count
         FROM booking WHERE deleted_at IS NULL
         GROUP BY 1 ORDER BY 1
    `,
    // Revenus par mois (paiements aboutis).
    prisma.$queryRaw`
      SELECT to_char(payment_date, 'YYYY-MM') AS month, SUM(amount)::float AS revenue
         FROM payment WHERE status = 'success'
         GROUP BY 1 ORDER BY 1
    `,
    // Commissions par mois (paiements aboutis).
    prisma.$queryRaw`
      SELECT to_char(payment_date, 'YYYY-MM') AS month, SUM(commission)::float AS commission
         FROM payment WHERE status = 'success'
         GROUP BY 1 ORDER BY 1
    `,
  ]);

  return {
    users,
    bookings,
    revenue: payments._sum.amount ? Number(payments._sum.amount) : 0,
    commission: payments._sum.commission ? Number(payments._sum.commission) : 0,
    bookingsByStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
    bookingsByMonth,
    revenueByMonth,
    commissionByMonth,
  };
}
