import prisma from '../config/db.js';
import { DOCUMENT_TYPES } from './documentService.js';

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
export async function cancelExpiredBookings() {
  const now = new Date();
  await prisma.booking.updateMany({
    where: {
      status: 'pending',
      deleted_at: null,
      booking_date: { lt: new Date(now.getTime() - PENDING_EXPIRY_MS) },
      payments: { none: { status: { in: ['pending', 'success'] } } },
    },
    data: {
      status: 'cancelled',
      cancellation_reason: EXPIRY_REASON,
      cancellation_date: now,
      updated_at: now,
    },
  });
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

// Paiement simulé d'une réservation « pending » du locataire : aucune donnée
// bancaire ne transite (pas de Stripe pour l'instant). Le Payment est créé en
// « pending » (empreinte, rien n'est débité) et la réservation reste
// « pending » : c'est la confirmation du propriétaire (setBookingStatus) qui
// capture le paiement et bloque le calendrier ; son refus libère l'empreinte.
export async function payBooking(id_user, id_booking) {
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
        select: { id_payment: true },
        take: 1,
      },
    },
  });
  if (!booking) throw bad('Réservation introuvable.', 404);
  if (booking.status !== 'pending') throw bad('Cette réservation ne peut plus être payée.', 409);
  if (booking.payments.length > 0)
    throw bad('Cette réservation est déjà payée : elle attend la validation du propriétaire.', 409);

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
  // propriétaire, libérée (« refunded ») s'il refuse ou annule.
  const payment = await prisma.payment.create({
    data: {
      id_booking: booking.id_booking,
      amount,
      commission,
      payment_date: new Date(),
      payment_method: 'card',
      status: 'pending',
      transaction_ref: `SIM-${Date.now()}-${booking.id_booking}`,
    },
  });

  return { ...payment, amount: Number(payment.amount), commission: Number(payment.commission) };
}
