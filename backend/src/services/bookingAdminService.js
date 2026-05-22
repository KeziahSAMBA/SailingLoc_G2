import prisma from '../config/db.js';
import { sendDisputeDecisionEmail } from './emailService.js';

const BOOKING_STATUSES = ['pending', 'confirmed', 'refused', 'cancelled'];
const DISPUTE_STATUSES = ['open', 'resolved', 'rejected'];

export async function listBookings({ status, search } = {}) {
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

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      user: { select: { id_user: true, first_name: true, last_name: true, email: true } },
      boat: { select: { id_boat: true, name: true } },
      _count: { select: { disputes: { where: { status: 'open' } } } },
    },
    orderBy: { booking_date: 'desc' },
  });

  return bookings.map((b) => ({
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
        },
      },
      opener: { select: { id_user: true, first_name: true, last_name: true, email: true } },
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
    booking: d.booking
      ? {
          id_booking: d.booking.id_booking,
          start_date: d.booking.start_date,
          end_date: d.booking.end_date,
          status: d.booking.status,
          boat_name: d.booking.boat?.name || null,
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

export async function setDisputeStatus(id_dispute, status, resolution) {
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
        },
      },
    },
  });
  if (!dispute) {
    throw Object.assign(new Error('Litige introuvable.'), { status: 404 });
  }
  const updated = await prisma.dispute.update({
    where: { id_dispute: id },
    data: {
      status,
      resolution: (resolution && String(resolution).trim()) || null,
      resolved_at: status === 'open' ? null : new Date(),
    },
  });

  // Notification personnalisée au locataire ET au propriétaire quand une décision est rendue.
  if (status === 'resolved' || status === 'rejected') {
    const boatName = dispute.booking?.boat?.name;

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
  };
}
