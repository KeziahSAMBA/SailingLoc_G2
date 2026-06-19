import prisma from '../config/db.js';

// Vue synthétique du tableau de bord locataire : compteurs agrégés en une seule passe.
export async function getDashboardStats(id_user) {
  // « Réservations en cours » : réservations non supprimées, en attente ou
  // confirmées, et non encore terminées (date de fin >= aujourd'hui).
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    activeBookings,
    favorites,
    unreadMessages,
    nextBooking,
    pendingDocuments,
    reviewsToLeave,
    recentBookings,
    favoriteBoatsPreview,
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        id_user,
        deleted_at: null,
        status: { in: ['pending', 'confirmed'] },
        end_date: { gte: today },
      },
    }),
    prisma.userBoatFavorite.count({ where: { id_user } }),
    prisma.message.count({
      where: { id_receiver: id_user, is_read: false, deleted_at: null },
    }),
    // Prochaine réservation confirmée à venir (la plus proche).
    prisma.booking.findFirst({
      where: {
        id_user,
        deleted_at: null,
        status: 'confirmed',
        start_date: { gte: today },
      },
      orderBy: { start_date: 'asc' },
      select: {
        id_booking: true,
        start_date: true,
        end_date: true,
        total_amount: true,
        boat: {
          select: {
            name: true,
            type: true,
            port: { select: { name: true, city: true } },
          },
        },
      },
    }),
    // Documents à compléter : en attente de validation ou refusés.
    prisma.document.count({
      where: { id_user, status: { in: ['pending', 'refused'] } },
    }),
    // Réservations terminées pour lesquelles le locataire n'a pas encore laissé d'avis.
    prisma.booking.count({
      where: {
        id_user,
        deleted_at: null,
        status: 'confirmed',
        end_date: { lt: today },
        reviews: { none: { id_user } },
      },
    }),
    // Dernières réservations (tous statuts) pour un aperçu chronologique.
    prisma.booking.findMany({
      where: { id_user, deleted_at: null },
      orderBy: { booking_date: 'desc' },
      take: 5,
      select: {
        id_booking: true,
        start_date: true,
        end_date: true,
        status: true,
        total_amount: true,
        boat: { select: { name: true, type: true } },
      },
    }),
    // Aperçu des derniers favoris (avec l'image principale du bateau).
    prisma.userBoatFavorite.findMany({
      where: { id_user },
      orderBy: { created_at: 'desc' },
      take: 4,
      select: {
        id_favorite: true,
        boat: {
          select: {
            id_boat: true,
            name: true,
            type: true,
            daily_price: true,
            port: { select: { name: true, city: true } },
            images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
          },
        },
      },
    }),
  ]);

  return {
    activeBookings,
    favorites,
    unreadMessages,
    pendingDocuments,
    reviewsToLeave,
    nextBooking: nextBooking && {
      ...nextBooking,
      total_amount: Number(nextBooking.total_amount),
    },
    recentBookings: recentBookings.map((b) => ({
      ...b,
      total_amount: Number(b.total_amount),
    })),
    favoriteBoatsPreview: favoriteBoatsPreview.map((f) => ({
      id_favorite: f.id_favorite,
      boat: {
        ...f.boat,
        daily_price: Number(f.boat.daily_price),
        image: f.boat.images[0]?.url ?? null,
        images: undefined,
      },
    })),
  };
}
