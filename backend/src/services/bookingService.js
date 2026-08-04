import prisma from '../config/db.js';
import { DOCUMENT_TYPES } from './documentService.js';
import { getStripe, isStripeRef, cancelIntentQuietly, refundIntent } from '../config/stripe.js';
import { sendBookingCancelledByLocataireEmail } from './emailService.js';

const DAY_MS = 86400000;
// Commission plateforme : même taux (10 %) que les paiements du seed.
const COMMISSION_RATE = 0.1;
// Une réservation « pending » non payée sous 72 h est annulée automatiquement
// et libère ses dates.
const PENDING_EXPIRY_MS = 72 * 3600 * 1000;
const EXPIRY_REASON = 'Annulation automatique : réservation non payée sous 72 heures.';

const bad = (message, status = 400) => Object.assign(new Error(message), { status });

// Parse une date « YYYY-MM-DD » en Date UTC minuit, même convention que les
// colonnes @db.Date de Prisma. Retourne null si invalide.
function parseDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Annule les réservations « pending » NON payées créées il y a plus de 72 h
// (balayage périodique lancé par server.js — nettoyage d'affichage : une
// demande non payée ne bloque de toute façon aucun créneau). Les demandes déjà
// payées (empreinte en attente) n'expirent pas : elles attendent la décision
// du propriétaire.
export function expiredPendingWhere(now = new Date(), expiryMs = PENDING_EXPIRY_MS) {
  return {
    status: 'pending',
    deleted_at: null,
    booking_date: { lt: new Date(now.getTime() - expiryMs) },
    payments: { none: { status: { in: ['pending', 'success'] } } },
  };
}

export async function cancelExpiredBookings(expiryMs = PENDING_EXPIRY_MS) {
  const now = new Date();
  const { count } = await prisma.booking.updateMany({
    where: expiredPendingWhere(now, expiryMs),
    data: {
      status: 'cancelled',
      cancellation_reason: EXPIRY_REASON,
      cancellation_date: now,
      updated_at: now,
    },
  });
  return count;
}

// Annulation individuelle avec motif (expiration, créneau perdu…).
function cancelBooking(id_booking, reason) {
  const now = new Date();
  return prisma.booking.update({
    where: { id_booking },
    data: {
      status: 'cancelled',
      cancellation_reason: reason,
      cancellation_date: now,
      updated_at: now,
    },
  });
}

// Création d'une demande de réservation par un locataire : statut « pending »,
// montant recalculé côté serveur. La demande ne bloque pas le créneau : seules
// les réservations confirmées par le propriétaire le font.
export async function createBooking({ id_user, id_boat, start_date, end_date }) {
  const start = parseDay(start_date);
  const end = parseDay(end_date);
  if (!start || !end) throw bad('Dates invalides (format attendu : YYYY-MM-DD).');
  if (start > end) throw bad('La date de début doit précéder la date de fin.');

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  if (start < today) throw bad('La date de début est déjà passée.');

  const boat = await prisma.boat.findFirst({
    where: { id_boat, deleted_at: null, is_published: true },
    select: {
      daily_price: true,
      availabilities: {
        where: { is_available: true },
        select: { start_date: true, end_date: true },
      },
      // Réservations confirmées par le propriétaire qui chevauchent la période
      // demandée — les demandes « pending » d'autres locataires ne bloquent pas.
      bookings: {
        where: {
          deleted_at: null,
          status: 'confirmed',
          start_date: { lte: end },
          end_date: { gte: start },
        },
        select: { id_booking: true },
        take: 1,
      },
    },
  });
  if (!boat) throw bad('Bateau introuvable.', 404);
  if (boat.bookings.length > 0)
    throw bad('Ces dates ne sont plus disponibles. Choisissez une autre période.', 409);

  // Même règle que le calendrier du front : chaque jour demandé doit tomber
  // dans une période d'ouverture du bateau.
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    const covered = boat.availabilities.some(
      (a) => a.start_date.getTime() <= t && t <= a.end_date.getTime()
    );
    if (!covered) throw bad("Le bateau n'est pas ouvert à la location sur toute la période.", 409);
  }

  // Jours inclusifs × prix journalier (même calcul que l'affichage du front).
  const dayCount = Math.round((end - start) / DAY_MS) + 1;
  const total_amount = dayCount * Number(boat.daily_price);

  const booking = await prisma.booking.create({
    data: {
      id_user,
      id_boat,
      start_date: start,
      end_date: end,
      status: 'pending',
      total_amount,
      booking_date: new Date(),
    },
  });

  return { ...booking, total_amount: Number(booking.total_amount) };
}

// Paiement d'une réservation « pending » du locataire, en deux modes :
//   - Stripe configuré : création d'un PaymentIntent à capture manuelle
//     (empreinte réelle) dont le client_secret est renvoyé au front, qui fait
//     saisir la carte dans Stripe Elements — aucune donnée bancaire ne touche
//     nos serveurs.
//   - Sans clé Stripe : Payment simulé, comme avant.
// Dans les deux cas la réservation reste « pending » : c'est la confirmation
// du propriétaire (setBookingStatus) qui capture le paiement et bloque le
// calendrier ; son refus libère l'empreinte.
export async function payBooking(id_user, id_booking) {
  const stripe = getStripe();
  const booking = await prisma.booking.findFirst({
    where: { id_booking: Number(id_booking), id_user, deleted_at: null },
    select: {
      id_booking: true,
      id_boat: true,
      start_date: true,
      end_date: true,
      status: true,
      total_amount: true,
      booking_date: true,
      payments: {
        where: { status: { in: ['pending', 'success'] } },
        select: { id_payment: true, status: true, transaction_ref: true },
        take: 1,
      },
      boat: { select: { owner: { select: { stripe_account_id: true } } } },
    },
  });
  if (!booking) throw bad('Réservation introuvable.', 404);
  if (booking.status !== 'pending') throw bad('Cette réservation ne peut plus être payée.', 409);

  const ALREADY_PAID =
    'Cette réservation est déjà payée : elle attend la validation du propriétaire.';
  const existing = booking.payments[0];
  if (existing) {
    // Paiement simulé, ou Stripe indisponible : impossible de vérifier plus
    // finement, on considère la demande payée.
    if (!stripe || !isStripeRef(existing.transaction_ref)) throw bad(ALREADY_PAID, 409);
    const intent = await stripe.paymentIntents.retrieve(existing.transaction_ref);
    if (intent.status === 'requires_capture' || intent.status === 'succeeded')
      throw bad(ALREADY_PAID, 409);
    if (intent.status === 'canceled') {
      // Empreinte morte côté Stripe (annulée/expirée) : on solde l'ancienne
      // tentative et on repart sur un nouveau PaymentIntent plus bas.
      await prisma.payment.update({
        where: { id_payment: existing.id_payment },
        data: { status: 'failed' },
      });
    } else {
      // Carte pas encore validée (refusée, 3DS abandonné…) : on reprend la
      // même intention de paiement au lieu d'en créer une deuxième.
      return { payment: { id_payment: existing.id_payment }, client_secret: intent.client_secret };
    }
  }

  // Demande créée il y a plus de 72 h : on l'annule au lieu de l'encaisser.
  if (booking.booking_date.getTime() < Date.now() - PENDING_EXPIRY_MS) {
    await cancelBooking(booking.id_booking, EXPIRY_REASON);
    throw bad('Réservation expirée : elle n’a pas été payée dans les 72 heures.', 409);
  }

  // Si le propriétaire a confirmé entre-temps une autre réservation sur des
  // dates qui chevauchent, cette demande n'a plus d'objet : elle est annulée.
  const taken = await prisma.booking.findFirst({
    where: {
      id_boat: booking.id_boat,
      id_booking: { not: booking.id_booking },
      deleted_at: null,
      status: 'confirmed',
      start_date: { lte: booking.end_date },
      end_date: { gte: booking.start_date },
    },
    select: { id_booking: true },
  });
  if (taken) {
    await cancelBooking(
      booking.id_booking,
      'Annulation automatique : dates confirmées par une autre réservation avant le paiement.'
    );
    throw bad(
      'Ces dates viennent d’être réservées par quelqu’un d’autre. Créez une nouvelle demande sur d’autres dates.',
      409
    );
  }

  // Les documents obligatoires du locataire doivent avoir été validés par
  // l'admin (même exigence que l'étape documents du tunnel côté front).
  const validated = await prisma.document.findMany({
    where: { id_user, status: 'validated', type: { in: DOCUMENT_TYPES.locataire } },
    select: { type: true },
  });
  const validatedTypes = new Set(validated.map((d) => d.type));
  if (DOCUMENT_TYPES.locataire.some((type) => !validatedTypes.has(type)))
    throw bad('Vos documents doivent être validés par SailingLoc avant le paiement.', 409);

  const amount = Number(booking.total_amount);
  const commission = Math.round(amount * COMMISSION_RATE * 100) / 100;

  // Empreinte en attente : capturée (« success ») à la confirmation du
  // propriétaire, libérée (« refunded ») s'il refuse ou annule. Avec Stripe,
  // l'empreinte n'existe qu'à la validation de la carte par le locataire
  // (confirmCardPayment côté front, jamais nos serveurs).
  let transaction_ref = `SIM-${Date.now()}-${booking.id_booking}`;
  let client_secret = null;
  if (stripe) {
    // Proprio onboardé sur Stripe Connect : paiement partagé automatiquement
    // (90 % vers son compte, 10 % de commission plateforme). Sinon, tout est
    // encaissé par SailingLoc comme avant.
    const destination = booking.boat?.owner?.stripe_account_id || null;
    let destinationReady = false;
    if (destination) {
      try {
        const account = await stripe.accounts.retrieve(destination);
        destinationReady = Boolean(account.charges_enabled);
      } catch (err) {
        console.warn('[stripe] compte connecté injoignable :', err.message);
      }
    }
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'eur',
      capture_method: 'manual',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { id_booking: String(booking.id_booking), id_user: String(id_user) },
      ...(destinationReady && {
        application_fee_amount: Math.round(commission * 100),
        transfer_data: { destination },
      }),
    });
    transaction_ref = intent.id;
    client_secret = intent.client_secret;
  }

  const payment = await prisma.payment.create({
    data: {
      id_booking: booking.id_booking,
      amount,
      commission,
      payment_date: new Date(),
      payment_method: 'card',
      status: 'pending',
      transaction_ref,
    },
  });

  return {
    payment: { ...payment, amount: Number(payment.amount), commission: Number(payment.commission) },
    client_secret,
  };
}

// Annulation par le locataire, uniquement avant le début du séjour. Une
// empreinte en attente est simplement libérée ; un paiement encaissé est
// intégralement remboursé, sans validation admin : le séjour n'a pas eu lieu.
export async function cancelOwnBooking(id_user, id_booking, reason) {
  const booking = await prisma.booking.findFirst({
    where: { id_booking: Number(id_booking), id_user, deleted_at: null },
    select: {
      id_booking: true,
      status: true,
      start_date: true,
      end_date: true,
      total_amount: true,
      user: { select: { first_name: true, email: true } },
      boat: { select: { name: true, owner: { select: { first_name: true, email: true } } } },
      payments: {
        where: { status: { in: ['pending', 'success'] } },
        select: { id_payment: true, status: true, amount: true, transaction_ref: true },
      },
    },
  });
  if (!booking) throw bad('Réservation introuvable.', 404);
  if (booking.status !== 'pending' && booking.status !== 'confirmed')
    throw bad('Cette réservation ne peut plus être annulée.', 409);

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  if (booking.start_date <= today)
    throw bad('Le séjour a commencé (ou commence aujourd’hui) : annulation impossible.', 409);

  // Côté Stripe d'abord : libération de l'empreinte non capturée (best-effort,
  // une empreinte déjà expirée ne bloque pas) et remboursement réel d'un
  // paiement capturé (bloquant : pas d'annulation en base si Stripe refuse).
  for (const p of booking.payments) {
    if (p.status === 'pending') await cancelIntentQuietly(p.transaction_ref);
    else await refundIntent(p.transaction_ref, null, { refundApplicationFee: true });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.booking.update({
      where: { id_booking: booking.id_booking },
      data: {
        status: 'cancelled',
        cancellation_reason: (reason && String(reason).trim()) || 'Annulée par le locataire.',
        cancellation_date: now,
        updated_at: now,
      },
    });
    for (const p of booking.payments) {
      await tx.payment.update({
        where: { id_payment: p.id_payment },
        data: {
          status: 'refunded',
          refunded_at: now,
          // Empreinte jamais débitée : libération sans montant. Paiement
          // encaissé : remboursement automatique intégral.
          ...(p.status === 'success' && {
            refunded_amount: p.amount,
            refund_reason:
              'Remboursement automatique : annulation par le locataire avant le début du séjour.',
          }),
        },
      });
    }
    return result;
  });

  // Notifications non bloquantes : le propriétaire apprend que le créneau se
  // libère, le locataire reçoit la confirmation (et celle du remboursement
  // intégral si un paiement avait été encaissé).
  const captured = booking.payments.find((p) => p.status === 'success');
  const emailBase = {
    boatName: booking.boat?.name,
    startDate: booking.start_date,
    endDate: booking.end_date,
    totalAmount: Number(booking.total_amount),
    reason: updated.cancellation_reason,
    refundAmount: captured ? Number(captured.amount) : 0,
  };
  const recipients = [
    booking.boat?.owner?.email && {
      to: booking.boat.owner.email,
      audience: 'proprietaire',
      firstName: booking.boat.owner.first_name,
    },
    booking.user?.email && {
      to: booking.user.email,
      audience: 'locataire',
      firstName: booking.user.first_name,
    },
  ].filter(Boolean);
  for (const r of recipients) {
    try {
      await sendBookingCancelledByLocataireEmail(r.to, {
        audience: r.audience,
        firstName: r.firstName,
        ...emailBase,
      });
    } catch (emailErr) {
      console.error('[email] annulation réservation :', emailErr.message);
    }
  }

  return {
    id_booking: updated.id_booking,
    status: updated.status,
    cancellation_reason: updated.cancellation_reason,
    cancellation_date: updated.cancellation_date,
  };
}

// Demande de remboursement (litige examiné par l'admin) — filet de sécurité
// pour une réservation annulée dont le paiement encaissé n'a pas été remboursé
// automatiquement.
export async function requestRefund(id_user, id_booking, reason) {
  const cleanReason = reason && String(reason).trim();
  if (!cleanReason) throw bad('Le motif de la demande est obligatoire.');

  const booking = await prisma.booking.findFirst({
    where: { id_booking: Number(id_booking), id_user, deleted_at: null },
    select: {
      id_booking: true,
      status: true,
      payments: { where: { status: 'success' }, select: { id_payment: true }, take: 1 },
      disputes: { where: { status: 'open' }, select: { id_dispute: true }, take: 1 },
    },
  });
  if (!booking) throw bad('Réservation introuvable.', 404);
  if (booking.status !== 'cancelled')
    throw bad(
      'Seule une réservation annulée peut faire l’objet d’une demande de remboursement.',
      409
    );
  if (booking.payments.length === 0)
    throw bad('Aucun paiement encaissé à rembourser sur cette réservation.', 409);
  if (booking.disputes.length > 0)
    throw bad('Une demande de remboursement est déjà en cours pour cette réservation.', 409);

  return prisma.dispute.create({
    data: { id_booking: booking.id_booking, id_user, reason: cleanReason.slice(0, 1000) },
  });
}

// Signalement d'un problème (litige) par le locataire ou le propriétaire
// (asOwner), uniquement sur une réservation annulée ou dont le séjour est fini.
// `files` : photos multer déjà stockées dans uploads/disputes.
export async function reportDispute({
  id_user,
  id_booking,
  reason,
  asOwner = false,
  files = [],
  origin = '',
}) {
  const cleanReason = reason && String(reason).trim();
  if (!cleanReason) throw bad('Le motif du litige est obligatoire.');

  const booking = await prisma.booking.findFirst({
    where: {
      id_booking: Number(id_booking),
      deleted_at: null,
      ...(asOwner ? { boat: { id_user, deleted_at: null } } : { id_user }),
    },
    select: {
      id_booking: true,
      status: true,
      end_date: true,
      disputes: { where: { status: 'open' }, select: { id_dispute: true }, take: 1 },
    },
  });
  if (!booking) throw bad('Réservation introuvable.', 404);

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const finished = booking.status === 'confirmed' && booking.end_date < today;
  if (booking.status !== 'cancelled' && !finished)
    throw bad('Un litige ne peut être ouvert que sur une réservation annulée ou terminée.', 409);
  if (booking.disputes.length > 0)
    throw bad('Un litige est déjà en cours pour cette réservation.', 409);

  return prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.create({
      data: { id_booking: booking.id_booking, id_user, reason: cleanReason.slice(0, 1000) },
    });
    if (files.length > 0) {
      await tx.image.createMany({
        data: files.map((f, i) => ({
          id_dispute: dispute.id_dispute,
          id_user,
          url: `${origin}/uploads/disputes/${f.filename}`,
          type: 'dispute',
          order: i,
        })),
      });
    }
    return dispute;
  });
}
