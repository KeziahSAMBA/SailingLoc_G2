import prisma from '../config/db.js';
import { DOCUMENT_TYPES } from './documentService.js';
import { requirePositiveId } from '../utils/inputSecurity.js';

const MAX_HISTORY_ROWS = 500;

// A favorite is only useful (and safe to expose) while its boat is part of the
// public catalogue.  Keep this predicate shared by writes and reads so a
// hidden, unpublished or soft-deleted boat can never be added or leak through
// a tenant dashboard/list response.
const PUBLIC_BOAT_WHERE = Object.freeze({
  deleted_at: null,
  is_published: true,
  status: 'published',
  owner: { is_active: true, deleted_at: null, role: 'proprietaire' },
  port: { deleted_at: null },
});

const unavailableFavoriteWhere = (id_user) => ({
  id_user,
  NOT: { boat: PUBLIC_BOAT_WHERE },
});

// Existing favorites can become unavailable after an owner unpublishes or
// deletes a boat.  Cleanup is deliberately best-effort: all reads still apply
// PUBLIC_BOAT_WHERE, so a transient cleanup failure cannot expose stale data.
async function purgeUnavailableFavorites(id_user) {
  if (typeof prisma.userBoatFavorite?.deleteMany !== 'function') return;
  try {
    await prisma.userBoatFavorite.deleteMany({ where: unavailableFavoriteWhere(id_user) });
  } catch {
    // Do not turn a dashboard/list read into a 500 because a maintenance purge
    // failed.  The visibility predicate below remains the security boundary.
  }
}

// Vue synthétique du tableau de bord locataire : compteurs agrégés en une seule passe.
export async function getDashboardStats(id_user) {
  const userId = requirePositiveId(id_user, 'Identifiant utilisateur');
  await purgeUnavailableFavorites(userId);
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
        id_user: userId,
        deleted_at: null,
        status: { in: ['pending', 'confirmed'] },
        end_date: { gte: today },
      },
    }),
    prisma.userBoatFavorite.count({
      where: { id_user: userId, boat: PUBLIC_BOAT_WHERE },
    }),
    prisma.message.count({
      where: { id_receiver: userId, is_read: false, deleted_at: null },
    }),
    // Prochaine réservation confirmée à venir (la plus proche).
    prisma.booking.findFirst({
      where: {
        id_user: userId,
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
      where: { id_user: userId },
      select: { type: true, status: true },
    }),
    // Réservations terminées pour lesquelles le locataire n'a pas encore laissé d'avis.
    prisma.booking.count({
      where: {
        id_user: userId,
        deleted_at: null,
        status: 'confirmed',
        end_date: { lt: today },
        reviews: { none: { id_user: userId } },
      },
    }),
    // Dernières réservations (tous statuts) pour un aperçu chronologique.
    prisma.booking.findMany({
      where: { id_user: userId, deleted_at: null },
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
      where: { id_user: userId, boat: PUBLIC_BOAT_WHERE },
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
    favoriteBoatsPreview: favoriteBoatsPreview
      .filter((f) => f?.boat)
      .map((f) => ({
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
// Historique des paiements du locataire (plus récents d'abord), avec totaux :
// payé (réellement encaissé), remboursé, dépense nette. Les empreintes en
// attente et les tentatives échouées sont listées mais hors totaux.
export async function listPayments(id_user) {
  const userId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const payments = await prisma.payment.findMany({
    where: { booking: { id_user: userId, deleted_at: null } },
    orderBy: { payment_date: 'desc' },
    take: MAX_HISTORY_ROWS,
    include: {
      booking: {
        select: {
          id_booking: true,
          start_date: true,
          end_date: true,
          boat: { select: { name: true } },
        },
      },
    },
  });

  const rows = payments.map((p) => ({
    id_payment: p.id_payment,
    amount: Number(p.amount),
    status: p.status,
    payment_date: p.payment_date,
    transaction_ref: p.transaction_ref,
    refunded_amount: p.refunded_amount != null ? Number(p.refunded_amount) : null,
    refunded_at: p.refunded_at,
    refund_reason: p.refund_reason,
    booking: p.booking
      ? {
          id_booking: p.booking.id_booking,
          start_date: p.booking.start_date,
          end_date: p.booking.end_date,
          boat_name: p.booking.boat?.name ?? null,
        }
      : null,
  }));

  // Un « refunded » avec montant a d'abord été encaissé ; sans montant, c'est
  // une empreinte libérée (jamais débitée) : hors totaux.
  const paid = rows
    .filter((p) => p.status === 'success' || (p.status === 'refunded' && p.refunded_amount != null))
    .reduce((sum, p) => sum + p.amount, 0);
  const refunded = rows.reduce((sum, p) => sum + (p.refunded_amount || 0), 0);
  return {
    payments: rows,
    totals: {
      paid: Math.round(paid * 100) / 100,
      refunded: Math.round(refunded * 100) / 100,
      net: Math.round((paid - refunded) * 100) / 100,
    },
  };
}

export async function listBookings(id_user) {
  const userId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const bookings = await prisma.booking.findMany({
    where: { id_user: userId, deleted_at: null },
    orderBy: { start_date: 'desc' },
    take: MAX_HISTORY_ROWS,
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
          id_boat: true,
          name: true,
          type: true,
          port: { select: { name: true, city: true } },
          images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
        },
      },
      reviews: { where: { id_user: userId }, select: { id_review: true } },
      // Dernier paiement (empreinte, encaissé ou remboursé) et demande de
      // remboursement en cours, pour l'affichage du dashboard.
      payments: {
        orderBy: { payment_date: 'desc' },
        take: 1,
        select: { status: true, refunded_amount: true },
      },
      disputes: { where: { status: 'open' }, select: { id_dispute: true }, take: 1 },
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
    payment: b.payments[0]
      ? {
          status: b.payments[0].status,
          refunded_amount:
            b.payments[0].refunded_amount != null ? Number(b.payments[0].refunded_amount) : null,
        }
      : null,
    refund_requested: b.disputes.length > 0,
    boat: {
      id_boat: b.boat?.id_boat,
      name: b.boat?.name,
      type: b.boat?.type,
      port: b.boat?.port,
      image: b.boat?.images?.[0]?.url ?? null,
    },
  }));
}

// Liste des bateaux favoris du locataire (plus récents d'abord).
export async function listFavorites(id_user) {
  const userId = requirePositiveId(id_user, 'Identifiant utilisateur');
  await purgeUnavailableFavorites(userId);
  const favorites = await prisma.userBoatFavorite.findMany({
    where: { id_user: userId, boat: PUBLIC_BOAT_WHERE },
    orderBy: { created_at: 'desc' },
    take: MAX_HISTORY_ROWS,
    select: {
      id_favorite: true,
      boat: {
        select: {
          id_boat: true,
          name: true,
          type: true,
          daily_price: true,
          capacity: true,
          port: { select: { name: true, city: true } },
          images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
        },
      },
    },
  });

  return favorites
    .filter((f) => f?.boat)
    .map((f) => ({
      id_favorite: f.id_favorite,
      boat: {
        id_boat: f.boat.id_boat,
        name: f.boat.name,
        type: f.boat.type,
        daily_price: Number(f.boat.daily_price),
        capacity: f.boat.capacity,
        port: f.boat.port,
        image: f.boat.images?.[0]?.url ?? null,
      },
    }));
}

// Ajoute un bateau aux favoris du locataire (idempotent).
export async function addFavorite(id_user, id_boat) {
  const userId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const boatId = requirePositiveId(id_boat, 'Identifiant bateau');
  const boat = await prisma.boat.findFirst({
    where: { id_boat: boatId, ...PUBLIC_BOAT_WHERE },
    select: { id_boat: true },
  });
  if (!boat) throw Object.assign(new Error('Bateau introuvable.'), { status: 404 });
  await prisma.userBoatFavorite.upsert({
    where: { id_user_id_boat: { id_user: userId, id_boat: boatId } },
    create: { id_user: userId, id_boat: boatId },
    update: {},
  });
}

// Retire un bateau des favoris du locataire (idempotent).
export async function removeFavorite(id_user, id_boat) {
  const userId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const boatId = requirePositiveId(id_boat, 'Identifiant bateau');
  await prisma.userBoatFavorite.deleteMany({ where: { id_user: userId, id_boat: boatId } });
}
