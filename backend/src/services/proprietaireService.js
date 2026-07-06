import prisma from '../config/db.js';
import { sendBookingDecisionEmail } from './emailService.js';

// Les demandes encore « en attente » dont le séjour a déjà commencé ne peuvent
// plus être confirmées : elles passent automatiquement « refusée » à la
// consultation (pas d'email : ce n'est pas une décision du propriétaire).
async function refuseExpiredPending(id_user) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.booking.updateMany({
    where: {
      deleted_at: null,
      status: 'pending',
      start_date: { lt: today },
      boat: { id_user, deleted_at: null },
    },
    data: { status: 'refused', updated_at: new Date() },
  });
}

// Vue synthétique du tableau de bord propriétaire : compteurs agrégés en une seule passe.
export async function getDashboardStats(id_user) {
  await refuseExpiredPending(id_user);
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

// Liste complète des réservations reçues sur les bateaux du propriétaire
// (plus récentes d'abord), avec le locataire demandeur.
export async function listBookings(id_user) {
  await refuseExpiredPending(id_user);
  const bookings = await prisma.booking.findMany({
    where: { deleted_at: null, boat: { id_user, deleted_at: null } },
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
      user: { select: { first_name: true, last_name: true, email: true } },
      boat: {
        select: {
          name: true,
          type: true,
          port: { select: { name: true, city: true } },
          images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
        },
      },
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
    locataire: b.user
      ? {
          first_name: b.user.first_name,
          last_name: b.user.last_name,
          email: b.user.email,
        }
      : null,
    boat: {
      name: b.boat?.name,
      type: b.boat?.type,
      port: b.boat?.port,
      image: b.boat?.images?.[0]?.url ?? null,
    },
  }));
}

// Historique des paiements reçus sur les bateaux du propriétaire (plus récents
// d'abord), avec les totaux : brut encaissé, commissions SailingLoc déduites et
// net propriétaire — calculés sur les paiements réussis uniquement (même règle
// que l'admin : pending/failed ne sont pas du chiffre d'affaires).
export async function listPayments(id_user) {
  const payments = await prisma.payment.findMany({
    where: { booking: { deleted_at: null, boat: { id_user, deleted_at: null } } },
    orderBy: { payment_date: 'desc' },
    include: {
      booking: {
        select: {
          id_booking: true,
          start_date: true,
          end_date: true,
          boat: { select: { name: true } },
          user: { select: { first_name: true, last_name: true } },
        },
      },
    },
  });

  const totals = { gross: 0, commission: 0, net: 0, success_count: 0 };
  for (const p of payments) {
    if (p.status !== 'success') continue;
    totals.gross += Number(p.amount);
    totals.commission += Number(p.commission);
    totals.success_count += 1;
  }
  totals.net = totals.gross - totals.commission;

  return {
    totals,
    payments: payments.map((p) => ({
      id_payment: p.id_payment,
      transaction_ref: p.transaction_ref,
      payment_date: p.payment_date,
      payment_method: p.payment_method,
      status: p.status,
      amount: Number(p.amount),
      commission: Number(p.commission),
      net: Number(p.amount) - Number(p.commission),
      refunded_amount: p.refunded_amount != null ? Number(p.refunded_amount) : null,
      refunded_at: p.refunded_at,
      refund_reason: p.refund_reason,
      booking: p.booking
        ? {
            id_booking: p.booking.id_booking,
            start_date: p.booking.start_date,
            end_date: p.booking.end_date,
            boat_name: p.booking.boat?.name || null,
            locataire: [p.booking.user?.first_name, p.booking.user?.last_name]
              .filter(Boolean)
              .join(' '),
          }
        : null,
    })),
  };
}

// Transitions autorisées pour le propriétaire sur une réservation de ses bateaux.
const BOOKING_ACTIONS = {
  confirm: { from: ['pending'], to: 'confirmed' },
  refuse: { from: ['pending'], to: 'refused' },
  cancel: { from: ['pending', 'confirmed'], to: 'cancelled' },
};

// Confirme, refuse ou annule une réservation — uniquement sur un bateau
// appartenant au propriétaire connecté.
export async function setBookingStatus(id_user, id_booking, action, reason) {
  const transition = BOOKING_ACTIONS[action];
  if (!transition) {
    throw Object.assign(new Error('Action invalide.'), { status: 400 });
  }

  const id = Number(id_booking);
  const booking = await prisma.booking.findUnique({
    where: { id_booking: id },
    select: {
      id_booking: true,
      status: true,
      deleted_at: true,
      start_date: true,
      end_date: true,
      total_amount: true,
      user: { select: { first_name: true, email: true } },
      boat: { select: { id_user: true, name: true } },
    },
  });
  // 404 aussi quand la réservation appartient à un autre propriétaire :
  // on ne révèle pas l'existence de réservations qui ne nous concernent pas.
  if (!booking || booking.deleted_at || booking.boat?.id_user !== id_user) {
    throw Object.assign(new Error('Réservation introuvable.'), { status: 404 });
  }
  if (!transition.from.includes(booking.status)) {
    throw Object.assign(
      new Error(`Cette action n'est pas possible sur une réservation « ${booking.status} ».`),
      { status: 400 }
    );
  }
  // Une demande dont le séjour a déjà commencé ne peut plus être confirmée.
  if (action === 'confirm') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(booking.start_date) < today) {
      throw Object.assign(
        new Error('La date de début est déjà passée : cette demande ne peut plus être confirmée.'),
        { status: 400 }
      );
    }
  }

  const updated = await prisma.booking.update({
    where: { id_booking: id },
    data: {
      status: transition.to,
      updated_at: new Date(),
      ...(action === 'cancel' && {
        cancellation_reason: (reason && String(reason).trim()) || 'Annulée par le propriétaire.',
        cancellation_date: new Date(),
      }),
    },
  });

  // Notification au locataire — non bloquante : la décision reste valide
  // même si l'envoi de l'email échoue.
  if (booking.user?.email) {
    try {
      await sendBookingDecisionEmail(booking.user.email, {
        firstName: booking.user.first_name,
        decision: updated.status,
        boatName: booking.boat?.name,
        startDate: booking.start_date,
        endDate: booking.end_date,
        totalAmount: Number(booking.total_amount),
        reason: updated.cancellation_reason,
      });
    } catch (emailErr) {
      console.error('[email] décision réservation :', emailErr.message);
    }
  }

  return {
    id_booking: updated.id_booking,
    status: updated.status,
    cancellation_reason: updated.cancellation_reason,
    cancellation_date: updated.cancellation_date,
  };
}
