import prisma from '../config/db.js';
import { createBooking } from '../services/bookingService.js';
import { createBoat, updateBoat, deleteBoat } from '../services/proprietaireService.js';

// Seules les réservations confirmées (payées) bloquent les dates du calendrier :
// une demande « pending » en cours de tunnel ne réserve pas le créneau, le
// premier locataire qui paie l'emporte.
const BLOCKING_BOOKING_STATUSES = ['confirmed'];

// Les colonnes start_date / end_date sont des DATE : Prisma les restitue à
// minuit UTC. Prendre ici minuit UTC plutôt que minuit local évite qu'une
// réservation s'achevant aujourd'hui disparaisse du calendrier des serveurs
// situés à l'ouest de Greenwich.
function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Construit à chaque appel, et non figé au chargement du module : la borne
// « aujourd'hui » resterait sinon celle du démarrage du serveur.
function boatInclude() {
  return {
    port: true,
    images: { orderBy: { order: 'asc' } },
    equipment: true,
    availabilities: {
      where: { is_available: true },
      orderBy: { start_date: 'asc' },
    },
    // Le calendrier n'a besoin que des créneaux qu'il doit griser : les
    // réservations confirmées non encore échues. Une réservation passée ne peut
    // bloquer aucune date sélectionnable, le sélecteur refusant les jours
    // antérieurs à aujourd'hui — la remonter alourdirait la réponse sans rien
    // changer à l'affichage.
    bookings: {
      where: {
        status: { in: BLOCKING_BOOKING_STATUSES },
        end_date: { gte: startOfToday() },
      },
      orderBy: { start_date: 'asc' },
      select: { start_date: true, end_date: true },
    },
    // Le compte des réservations est un indicateur de popularité portant sur
    // tout l'historique : PostgreSQL le calcule, au lieu de rapatrier les
    // lignes pour les dénombrer en mémoire.
    _count: {
      select: { bookings: { where: { status: { in: BLOCKING_BOOKING_STATUSES } } } },
    },
  };
}

// Les avis sont rattachés au bateau par leur réservation. Les agréger dans une
// requête dédiée évite de traverser tout l'historique des réservations pour les
// atteindre : seules les lignes d'avis sont lues, et l'index sur booking.id_boat
// porte la jointure.
async function reviewStatsByBoat(boatIds) {
  const stats = new Map();
  if (boatIds.length === 0) return stats;

  const reviews = await prisma.review.findMany({
    where: {
      status: 'validated',
      deleted_at: null,
      booking: { id_boat: { in: boatIds } },
    },
    select: { rating: true, comment: true, booking: { select: { id_boat: true } } },
  });

  for (const review of reviews) {
    const id = review.booking.id_boat;
    const entry = stats.get(id) || { sum: 0, count: 0, comment_count: 0 };
    entry.sum += review.rating;
    entry.count += 1;
    if (review.comment?.trim()) entry.comment_count += 1;
    stats.set(id, entry);
  }

  return stats;
}

function enrichWithRating(boats, reviewStats) {
  return boats.map((b) => {
    const stats = reviewStats.get(b.id_boat) || { sum: 0, count: 0, comment_count: 0 };
    const avg = stats.count > 0 ? Math.round((stats.sum / stats.count) * 10) / 10 : null;
    // Les réservations remontées sont déjà les seules bloquantes : le filtrage
    // est fait par la base, il ne reste qu'à projeter les dates.
    const { bookings, _count, ...boat } = b;
    return {
      ...boat,
      avg_rating: avg,
      review_count: stats.count,
      comment_count: stats.comment_count,
      booking_count: _count.bookings,
      booked_ranges: bookings.map((bk) => ({ start_date: bk.start_date, end_date: bk.end_date })),
    };
  });
}

export async function getBoats(req, res) {
  const boats = await prisma.boat.findMany({
    where: { is_published: true },
    include: boatInclude(),
  });

  const reviewStats = await reviewStatsByBoat(boats.map((b) => b.id_boat));

  res.json(enrichWithRating(boats, reviewStats));
}

export async function getBoatsByType(req, res) {
  const boats = await prisma.boat.findMany({
    where: { is_published: true },
    include: boatInclude(),
    orderBy: { id_boat: 'asc' },
  });

  const reviewStats = await reviewStatsByBoat(boats.map((b) => b.id_boat));
  const enriched = enrichWithRating(boats, reviewStats);

  // Group by type, keep at most 3 boats per type
  const groups = {};
  for (const boat of enriched) {
    if (!groups[boat.type]) groups[boat.type] = [];
    if (groups[boat.type].length < 3) groups[boat.type].push(boat);
  }

  const sections = Object.entries(groups)
    .filter(([, list]) => list.length > 0)
    .map(([type, list]) => ({ type, boats: list }));

  res.json(sections);
}

// Fichiers reçus par upload.fields : photos publiques + acte de francisation privé.
function boatFiles(req) {
  return {
    images: req.files?.images || [],
    acteFrancisation: req.files?.acte_francisation?.[0] || null,
  };
}

// Mise à jour d'un brouillon d'annonce par son propriétaire.
export async function putBoat(req, res) {
  try {
    const origin = `${req.protocol}://${req.get('host')}`;
    const boat = await updateBoat(
      req.user.id_user,
      req.params.id_boat,
      req.body,
      boatFiles(req),
      origin
    );
    res.json({ boat });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// Suppression (soft delete) d'un brouillon ou d'une annonce par son propriétaire.
export async function removeBoat(req, res) {
  try {
    await deleteBoat(req.user.id_user, req.params.id_boat);
    res.json({ deleted: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// Création d'une annonce par un propriétaire : caractéristiques + photos +
// acte de francisation + port (réutilisé s'il existe, créé sinon) + disponibilités.
export async function uploadBoat(req, res) {
  try {
    // Origine publique du backend pour construire les URLs des photos servies
    // en statique (/uploads).
    const origin = `${req.protocol}://${req.get('host')}`;
    const boat = await createBoat(req.user.id_user, req.body, boatFiles(req), origin);
    res.locals.auditTargetId = String(boat.id_boat);
    res.status(201).json({ boat });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// Réservation d'un bateau par un locataire (statut « pending », payée ensuite
// via POST /api/users/me/bookings/:id_booking/pay).
export async function createBookingController(req, res) {
  try {
    const booking = await createBooking({
      id_user: req.user.id_user,
      id_boat: Number(req.params.id_boat),
      start_date: req.body.start_date,
      end_date: req.body.end_date,
    });
    res.locals.auditTargetId = String(booking.id_booking);
    res.status(201).json({ booking });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
