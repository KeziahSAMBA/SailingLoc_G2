import prisma from '../config/db.js';
import { refundIntent } from '../config/stripe.js';
import { sendDisputeDecisionEmail } from './emailService.js';
import { parsePagination } from '../utils/inputSecurity.js';

const BOOKING_STATUSES = ['pending', 'confirmed', 'refused', 'cancelled'];
const DISPUTE_STATUSES = ['open', 'resolved', 'rejected'];

// La liste alimente un tableau d'administration paginé côté navigateur : sans
// borne, elle renvoyait l'intégralité des réservations en une réponse — 7,6 Mo
// mesurés en recette. Le total accompagne la page pour que l'écran puisse
// signaler ce qu'il ne montre pas.
const ADMIN_BOOKINGS_PAGE_SIZE = 100;

export async function listBookings({ status, search, page, pageSize } = {}) {
  const pagination = parsePagination({ page, pageSize }, ADMIN_BOOKINGS_PAGE_SIZE);
  const where = { deleted_at: null };
  if (status && BOOKING_STATUSES.includes(status)) where.status = status;
  if (search && String(search).trim()) {
    const s = String(search).trim();
    where.OR = [
      { user: { first_name: { contains: s, mode: 'insensitive' } } },
      { user: { last_name: { contains: s, mode: 'insensitive' } } },
      { user: { email: { contains: s, mode: 'insensitive' } } },
      { boat: { name: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: {
        user: { select: { id_user: true, first_name: true, last_name: true, email: true } },
        boat: { select: { id_boat: true, name: true } },
        _count: { select: { disputes: { where: { status: 'open' } } } },
      },
      // booking_date seule ne départage pas deux réservations enregistrées à la
      // même date : le tri secondaire sur la clé primaire rend l'ordre total,
      // sans quoi deux pages voisines pourraient répéter ou omettre une ligne.
      orderBy: [{ booking_date: 'desc' }, { id_booking: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  const lignes = bookings.map((b) => ({
    id_booking: b.id_booking,
    start_date: b.start_date,
    end_date: b.end_date,
    status: b.status,
    total_amount: b.total_amount != null ? Number(b.total_amount) : null,
    booking_date: b.booking_date,
    cancellation_reason: b.cancellation_reason,
    user: b.user
      ? {
          id_user: b.user.id_user,
          first_name: b.user.first_name,
          last_name: b.user.last_name,
          email: b.user.email,
        }
      : null,
    boat: b.boat ? { id_boat: b.boat.id_boat, name: b.boat.name } : null,
    open_disputes: b._count.disputes,
  }));

  return { bookings: lignes, total };
}

export async function cancelBooking(id_booking, reason) {
  const id = Number(id_booking);
  const booking = await prisma.booking.findUnique({ where: { id_booking: id } });
  if (!booking || booking.deleted_at) {
    throw Object.assign(new Error('Réservation introuvable.'), { status: 404 });
  }
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    throw Object.assign(
      new Error('Seules les réservations en attente ou confirmées peuvent être annulées.'),
      { status: 400 }
    );
  }
  const updated = await prisma.booking.update({
    where: { id_booking: id },
    data: {
      status: 'cancelled',
      cancellation_reason: (reason && String(reason).trim()) || 'Annulée par un administrateur.',
      cancellation_date: new Date(),
      updated_at: new Date(),
    },
  });
  return {
    id_booking: updated.id_booking,
    status: updated.status,
    cancellation_reason: updated.cancellation_reason,
  };
}

export async function listDisputes({ status } = {}) {
  const where = {};
  if (status && DISPUTE_STATUSES.includes(status)) where.status = status;

  const disputes = await prisma.dispute.findMany({
    where,
    include: {
      booking: {
        select: {
          id_booking: true,
          start_date: true,
          end_date: true,
          status: true,
          boat: { select: { name: true } },
          // Paiement le plus récent → utilisé en preview dans la modal de
          // résolution pour calculer le montant remboursable.
          payments: {
            orderBy: { payment_date: 'desc' },
            take: 1,
            select: {
              id_payment: true,
              amount: true,
              commission: true,
              status: true,
            },
          },
        },
      },
      opener: { select: { id_user: true, first_name: true, last_name: true, email: true } },
      images: { where: { deleted_at: null }, orderBy: { order: 'asc' }, select: { url: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  return disputes.map((d) => ({
    id_dispute: d.id_dispute,
    reason: d.reason,
    status: d.status,
    resolution: d.resolution,
    created_at: d.created_at,
    resolved_at: d.resolved_at,
    photos: d.images.map((img) => img.url),
    booking: d.booking
      ? {
          id_booking: d.booking.id_booking,
          start_date: d.booking.start_date,
          end_date: d.booking.end_date,
          status: d.booking.status,
          boat_name: d.booking.boat?.name || null,
          payment: d.booking.payments?.[0]
            ? {
                id_payment: d.booking.payments[0].id_payment,
                amount: Number(d.booking.payments[0].amount),
                commission: Number(d.booking.payments[0].commission),
                status: d.booking.payments[0].status,
              }
            : null,
        }
      : null,
    opener: d.opener
      ? {
          id_user: d.opener.id_user,
          first_name: d.opener.first_name,
          last_name: d.opener.last_name,
          email: d.opener.email,
        }
      : null,
  }));
}

export async function setDisputeStatus(
  id_dispute,
  status,
  resolution,
  { refund_percent, refund_commission } = {}
) {
  if (!DISPUTE_STATUSES.includes(status)) {
    throw Object.assign(new Error('Statut invalide.'), { status: 400 });
  }
  const id = Number(id_dispute);
  const dispute = await prisma.dispute.findUnique({
    where: { id_dispute: id },
    include: {
      booking: {
        include: {
          user: { select: { first_name: true, email: true } },
          boat: { select: { name: true, owner: { select: { first_name: true, email: true } } } },
          // Paiements liés à la réservation, pour identifier celui à rembourser.
          payments: { orderBy: { payment_date: 'desc' } },
        },
      },
    },
  });
  if (!dispute) {
    throw Object.assign(new Error('Litige introuvable.'), { status: 404 });
  }

  // Validation du pourcentage de remboursement (autorisé uniquement quand le
  // litige est résolu en faveur du locataire).
  const pct = Number(refund_percent);
  const wantsRefund = status === 'resolved' && Number.isFinite(pct) && pct > 0;
  if (wantsRefund && (pct < 1 || pct > 100)) {
    throw Object.assign(new Error('Le pourcentage de remboursement doit être entre 1 et 100.'), {
      status: 400,
    });
  }

  const updated = await prisma.dispute.update({
    where: { id_dispute: id },
    data: {
      status,
      resolution: (resolution && String(resolution).trim()) || null,
      resolved_at: status === 'open' ? null : new Date(),
    },
  });

  // Remboursement : on rembourse le paiement 'success' le plus récent rattaché
  // à la réservation. Par défaut la commission est conservée par SailingLoc
  // (politique standard) — sauf si l'admin coche « refund_commission ».
  let refundedPayment = null;
  if (wantsRefund) {
    const target = (dispute.booking?.payments || []).find((p) => p.status === 'success');
    if (target) {
      const amount = Number(target.amount);
      const commission = Number(target.commission);
      const base = refund_commission ? amount + commission : amount;
      const refundedAmount = Math.round(base * pct) / 100;
      // Remboursement réel côté Stripe, plafonné au montant effectivement débité.
      await refundIntent(target.transaction_ref, Math.min(refundedAmount, amount), {
        refundApplicationFee: Boolean(refund_commission),
      });
      refundedPayment = await prisma.payment.update({
        where: { id_payment: target.id_payment },
        data: {
          status: 'refunded',
          refunded_amount: refundedAmount,
          refunded_at: new Date(),
          refund_reason:
            (resolution && String(resolution).trim()) ||
            `Remboursement à ${pct}% suite au litige #${id}`,
          id_dispute: id,
        },
      });
    }
  }

  // Notification personnalisée au locataire ET au propriétaire quand une décision est rendue.
  if (status === 'resolved' || status === 'rejected') {
    const boatName = dispute.booking?.boat?.name;

    // Détails du remboursement à inclure dans l'email (montant, %, commission).
    const refundDetails = refundedPayment
      ? {
          amount: Number(refundedPayment.refunded_amount),
          percent: pct,
          includesCommission: !!refund_commission,
        }
      : null;

    // Deux emails distincts : un au locataire, un au propriétaire.
    const recipients = [];
    if (dispute.booking?.user?.email) {
      recipients.push({ ...dispute.booking.user, audience: 'locataire' });
    }
    if (dispute.booking?.boat?.owner?.email) {
      recipients.push({ ...dispute.booking.boat.owner, audience: 'proprietaire' });
    }

    for (const r of recipients) {
      try {
        await sendDisputeDecisionEmail(r.email, {
          firstName: r.first_name,
          audience: r.audience,
          resolved: status === 'resolved',
          boatName,
          resolution: updated.resolution,
          refund: refundDetails,
        });
      } catch (emailErr) {
        console.error('[email] décision litige :', emailErr.message);
      }
    }
  }

  return {
    id_dispute: updated.id_dispute,
    status: updated.status,
    resolution: updated.resolution,
    resolved_at: updated.resolved_at,
    refund: refundedPayment
      ? {
          id_payment: refundedPayment.id_payment,
          refunded_amount: Number(refundedPayment.refunded_amount),
        }
      : null,
  };
}
