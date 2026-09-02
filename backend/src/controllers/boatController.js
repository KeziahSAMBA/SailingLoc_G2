import prisma from '../config/db.js';
import { createBooking } from '../services/bookingService.js';
import { createBoat, updateBoat, deleteBoat } from '../services/proprietaireService.js';
import { parsePagination } from '../utils/inputSecurity.js';

const PUBLIC_BOAT_PAGE_SIZE = 25;
// Nombre d'annonces mises en avant par type sur la vitrine groupée.
const BOATS_PAR_TYPE = 3;

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

// Colonnes du bateau qu'aucun écran ne lit et qui n'ont donc rien à faire sur
// un endpoint public : id_user désigne le propriétaire, registration est
// l'immatriculation officielle du navire, et les horodatages renseignent sur la
// vie interne des données — deleted_at révélant jusqu'aux annonces retirées.
const CHAMPS_INTERNES = ['id_user', 'registration', 'created_at', 'updated_at', 'deleted_at'];

// Les onze ports du catalogue sont recopiés dans chacun des bateaux : autant ne
// projeter que les colonnes réellement affichées. latitude et longitude en font
// partie, la fiche produit s'en servant pour situer le port sur la carte.
const PORT_SELECT = {
  id_port: true,
  name: true,
  city: true,
  country: true,
  region: true,
  image_url: true,
  latitude: true,
  longitude: true,
};

// Construit à chaque appel, et non figé au chargement du module : la borne
// « aujourd'hui » resterait sinon celle du démarrage du serveur.
function boatInclude() {
  return {
    port: { select: PORT_SELECT },
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
    for (const champ of CHAMPS_INTERNES) delete boat[champ];
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
  let pagination;
  try {
    pagination = parsePagination(req.query, PUBLIC_BOAT_PAGE_SIZE);
  } catch (err) {
    // Express 4 ne rattrape pas les rejets asynchrones et cette branche n'a pas
    // de gestionnaire d'erreur global : sans ce catch, un « ?page=abc » laisserait
    // la requête pendre jusqu'au délai d'expiration du client. Le bloc surveillé
    // se limite volontairement à l'analyse des paramètres, dont la seule erreur
    // possible est un 400.
    return res.status(400).json({ message: err.message });
  }

  const boats = await prisma.boat.findMany({
    where: { is_published: true },
    include: boatInclude(),
    // Un tri explicite n'est pas décoratif ici : sans lui, PostgreSQL est libre
    // de renvoyer les lignes dans un ordre variable d'une requête à l'autre, et
    // deux pages successives pourraient se recouvrir ou sauter des annonces.
    orderBy: { id_boat: 'asc' },
    skip: pagination.skip,
    take: pagination.take,
  });

  const reviewStats = await reviewStatsByBoat(boats.map((b) => b.id_boat));

  res.json(enrichWithRating(boats, reviewStats));
}

export async function getBoatsByType(req, res) {
  // Cette vitrine n'affiche que trois annonces par type. Les charger toutes pour
  // n'en garder qu'une poignée faisait travailler la base vingt fois pour rien :
  // on demande d'abord les types présents, puis les trois premières de chacun.
  const types = await prisma.boat.groupBy({
    by: ['type'],
    where: { is_published: true },
    _min: { id_boat: true },
  });

  // Les types sont indépendants : les interroger en parallèle évite d'empiler
  // autant d'allers-retours que de sections.
  const parType = await Promise.all(
    types.map((t) =>
      prisma.boat.findMany({
        where: { is_published: true, type: t.type },
        include: boatInclude(),
        orderBy: { id_boat: 'asc' },
        take: BOATS_PAR_TYPE,
      })
    )
  );

  const boats = parType.flat();
  const reviewStats = await reviewStatsByBoat(boats.map((b) => b.id_boat));
  const enrichis = new Map(enrichWithRating(boats, reviewStats).map((b) => [b.id_boat, b]));

  // L'ordre des sections suivait celui d'un balayage trié sur id_boat : chaque
  // type apparaissait à la position de sa plus petite annonce. Le tri sur _min
  // reproduit exactement cet ordre.
  const sections = types
    .map((t, i) => ({
      type: t.type,
      rang: t._min.id_boat,
      boats: parType[i].map((b) => enrichis.get(b.id_boat)),
    }))
    .filter((s) => s.boats.length > 0)
    .sort((a, b) => a.rang - b.rang)
    .map(({ type, boats: liste }) => ({ type, boats: liste }));

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
