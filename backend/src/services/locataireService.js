import prisma from '../config/db.js';
import { DOCUMENT_TYPES } from './documentService.js';

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
    userDocuments,
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
    // Documents du locataire (type + statut) : sert à calculer les documents
    // en attente/refusés ET les types obligatoires manquants.
    prisma.document.findMany({
      where: { id_user },
      select: { type: true, status: true },
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

  // Documents en attente de validation ou refusés (à corriger).
  const pendingDocuments = userDocuments.filter(
    (d) => d.status === 'pending' || d.status === 'refused'
  ).length;
  // Types obligatoires (rôle locataire) pour lesquels aucun document n'a été déposé.
  const providedTypes = new Set(userDocuments.map((d) => d.type));
  const requiredTypes = DOCUMENT_TYPES.locataire || [];
  const missingDocuments = requiredTypes.filter((t) => !providedTypes.has(t)).length;

  return {
    activeBookings,
    favorites,
    unreadMessages,
    pendingDocuments,
    missingDocuments,
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

// Liste complète des réservations du locataire (plus récentes d'abord).
export async function listBookings(id_user) {
  const bookings = await prisma.booking.findMany({
    where: { id_user, deleted_at: null },
    orderBy: { start_date: 'desc' },
    select: {
      id_booking: true,
      start_date: true,
      end_date: true,
      status: true,
      total_amount: true,
      booking_date: true,
      cancellation_reason: true,
      cancellation_date: true,
      boat: {
        select: {
          name: true,
          type: true,
          port: { select: { name: true, city: true } },
          images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
        },
      },
      reviews: { where: { id_user }, select: { id_review: true } },
    },
  });

  return bookings.map((b) => ({
    id_booking: b.id_booking,
    start_date: b.start_date,
    end_date: b.end_date,
    status: b.status,
    total_amount: Number(b.total_amount),
    booking_date: b.booking_date,
    cancellation_reason: b.cancellation_reason,
    cancellation_date: b.cancellation_date,
    reviewed: b.reviews.length > 0,
    boat: {
      name: b.boat?.name,
      type: b.boat?.type,
      port: b.boat?.port,
      image: b.boat?.images?.[0]?.url ?? null,
    },
  }));
}
