import prisma from '../config/db.js';
import { createBooking } from '../services/bookingService.js';
import { createBoat, updateBoat, deleteBoat } from '../services/proprietaireService.js';

const BOAT_INCLUDE = {
  // La vitrine publique ne renvoie que les attributs nécessaires à l'UI ; les
  // timestamps internes, suppressions et métadonnées de stockage restent
  // privés.
  port: {
    select: {
      id_port: true,
      name: true,
      city: true,
      country: true,
      department: true,
      region: true,
      latitude: true,
      longitude: true,
    },
  },
  images: {
    where: { deleted_at: null, type: 'boat' },
    orderBy: { order: 'asc' },
    select: { url: true },
  },
  equipment: { select: { id_equipment: true, category: true, name: true } },
  availabilities: {
    where: { is_available: true },
    orderBy: { start_date: 'asc' },
  },
  bookings: {
    where: { deleted_at: null },
    select: {
      status: true,
      start_date: true,
      end_date: true,
      reviews: {
        where: { status: 'validated', deleted_at: null },
        select: { rating: true, comment: true },
      },
    },
  },
};

// Seules les réservations confirmées (payées) bloquent les dates du calendrier :
// une demande « pending » en cours de tunnel ne réserve pas le créneau, le
// premier locataire qui paie l'emporte.
const BLOCKING_BOOKING_STATUSES = ['confirmed'];

function enrichWithRating(boats) {
  return boats.map((b) => {
    const allReviews = b.bookings.flatMap((bk) => bk.reviews);
    const avg =
      allReviews.length > 0
        ? Math.round((allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) * 10) / 10
        : null;
    const comment_count = allReviews.filter((r) => r.comment?.trim()).length;
    const booking_count = b.bookings.filter((bk) => bk.status === 'confirmed').length;
    const booked_ranges = b.bookings
      .filter((bk) => BLOCKING_BOOKING_STATUSES.includes(bk.status))
      .map((bk) => ({ start_date: bk.start_date, end_date: bk.end_date }));
    const { bookings, ...boat } = b;
    return {
      ...boat,
      avg_rating: avg,
      review_count: allReviews.length,
      comment_count,
      booking_count,
      booked_ranges,
    };
  });
}

export async function getBoats(req, res) {
  const boats = await prisma.boat.findMany({
    where: {
      is_published: true,
      status: 'published',
      deleted_at: null,
      owner: { is_active: true, deleted_at: null, role: 'proprietaire' },
      port: { deleted_at: null },
    },
    include: BOAT_INCLUDE,
  });

  res.json(enrichWithRating(boats));
}

export async function getBoatsByType(req, res) {
  const boats = await prisma.boat.findMany({
    where: {
      is_published: true,
      status: 'published',
      deleted_at: null,
      owner: { is_active: true, deleted_at: null, role: 'proprietaire' },
      port: { deleted_at: null },
    },
    include: BOAT_INCLUDE,
    orderBy: { id_boat: 'asc' },
  });

  const enriched = enrichWithRating(boats);

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
