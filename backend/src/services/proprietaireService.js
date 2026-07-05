import prisma from '../config/db.js';

// Vue synthétique du tableau de bord propriétaire : compteurs agrégés en une seule passe.
export async function getDashboardStats(id_user) {
  // « Revenus du mois » : somme des réservations confirmées de mes bateaux
  // dont le séjour démarre dans le mois en cours.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

  const [publishedBoats, pendingBookings, monthRevenue, recentBookings, boatsPreview] =
    await Promise.all([
      // Bateaux publiés (non supprimés) du propriétaire.
      prisma.boat.count({
        where: { id_user, deleted_at: null, is_published: true },
      }),
      // Réservations à confirmer : demandes en attente sur mes bateaux.
      prisma.booking.count({
        where: {
          deleted_at: null,
          status: 'pending',
          boat: { id_user, deleted_at: null },
        },
      }),
      prisma.booking.aggregate({
        _sum: { total_amount: true },
        where: {
          deleted_at: null,
          status: 'confirmed',
          boat: { id_user, deleted_at: null },
          start_date: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      // Dernières réservations (tous statuts) sur mes bateaux, avec le locataire.
      prisma.booking.findMany({
        where: { deleted_at: null, boat: { id_user, deleted_at: null } },
        orderBy: { booking_date: 'desc' },
        take: 5,
        select: {
          id_booking: true,
          start_date: true,
          end_date: true,
          status: true,
          total_amount: true,
          boat: { select: { name: true } },
          user: { select: { first_name: true, last_name: true } },
        },
      }),
      // Aperçu des derniers bateaux publiés (avec l'image principale).
      prisma.boat.findMany({
        where: { id_user, deleted_at: null, is_published: true },
        orderBy: { created_at: 'desc' },
        take: 4,
        select: {
          id_boat: true,
          name: true,
          type: true,
          daily_price: true,
          port: { select: { name: true, city: true } },
          images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
        },
      }),
    ]);

  return {
    publishedBoats,
    pendingBookings,
    monthRevenue: Number(monthRevenue._sum.total_amount ?? 0),
    recentBookings: recentBookings.map((b) => ({
      ...b,
      total_amount: Number(b.total_amount),
    })),
    boatsPreview: boatsPreview.map((b) => ({
      id_boat: b.id_boat,
      name: b.name,
      type: b.type,
      daily_price: Number(b.daily_price),
      port: b.port,
      image: b.images[0]?.url ?? null,
    })),
  };
}
