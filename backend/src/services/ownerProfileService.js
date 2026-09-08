import prisma from '../config/db.js';
import { parsePositiveId } from '../utils/inputSecurity.js';

// Fiche publique d'un propriétaire, consultable sans compte depuis la fiche
// d'un de ses bateaux. On n'expose que ce qui est utile à la décision de
// location : identité, badges de vérification (dérivés du statut des
// documents — jamais les fichiers eux-mêmes), bateaux publiés et avis reçus.

const PUBLIC_AVATAR_TYPES = { in: ['profil', 'avatar'] };
const BOAT_IMAGE_TYPES = { in: ['boat', 'bateau'] };

// Documents propriétaire dont un statut « validé » vaut badge de confiance.
const BADGE_DOCUMENT_TYPES = ['permis', 'assurance', 'cv_marin', 'acte_francisation'];

const MAX_BOATS = 100;
const MAX_REVIEWS = 60;

function notFound() {
  return Object.assign(new Error('Propriétaire introuvable.'), { status: 404 });
}

// « Prénom N. » — même anonymisation que les avis publics (reviewController).
function shortName(firstName, lastName) {
  const initial = lastName ? `${lastName.charAt(0)}.` : '';
  return [firstName, initial].filter(Boolean).join(' ');
}

function averageRating(ratings) {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((total, value) => total + value, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export async function getOwnerPublicProfile(idParam) {
  const ownerId = parsePositiveId(idParam);
  // Identifiant absent/mal formé : même réponse qu'un propriétaire inexistant,
  // on ne distingue pas les deux cas côté client.
  if (ownerId === null) throw notFound();

  const owner = await prisma.user.findFirst({
    where: {
      id_user: ownerId,
      role: 'proprietaire',
      is_active: true,
      deleted_at: null,
    },
    select: {
      id_user: true,
      first_name: true,
      last_name: true,
      created_at: true,
      images: {
        where: { type: PUBLIC_AVATAR_TYPES, deleted_at: null },
        orderBy: { order: 'asc' },
        take: 1,
        select: { url: true },
      },
    },
  });
  if (!owner) throw notFound();

  const [boatRows, reviewRows, validatedDocs] = await Promise.all([
    prisma.boat.findMany({
      where: {
        id_user: ownerId,
        is_published: true,
        status: 'published',
        deleted_at: null,
        port: { deleted_at: null },
      },
      orderBy: { id_boat: 'asc' },
      take: MAX_BOATS,
      select: {
        id_boat: true,
        name: true,
        type: true,
        daily_price: true,
        capacity: true,
        with_skipper: true,
        port: { select: { city: true, country: true } },
        images: {
          where: { deleted_at: null, type: BOAT_IMAGE_TYPES },
          orderBy: { order: 'asc' },
          take: 1,
          select: { url: true },
        },
        bookings: {
          where: { deleted_at: null },
          select: {
            reviews: {
              where: { status: 'validated', deleted_at: null, user: { role: 'locataire' } },
              select: { rating: true },
            },
          },
        },
      },
    }),
    prisma.review.findMany({
      where: {
        status: 'validated',
        deleted_at: null,
        // Avis laissés par des locataires sur les bateaux de ce propriétaire.
        user: { role: 'locataire' },
        booking: {
          deleted_at: null,
          boat: {
            id_user: ownerId,
            deleted_at: null,
            is_published: true,
            status: 'published',
          },
        },
      },
      orderBy: [{ created_at: 'desc' }, { id_review: 'desc' }],
      take: MAX_REVIEWS,
      select: {
        id_review: true,
        rating: true,
        comment: true,
        created_at: true,
        owner_reply: true,
        booking: {
          select: { id_boat: true, boat: { select: { name: true } } },
        },
        user: {
          select: {
            first_name: true,
            last_name: true,
            images: {
              where: { type: PUBLIC_AVATAR_TYPES, deleted_at: null },
              orderBy: { order: 'asc' },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    }),
    prisma.document.findMany({
      where: {
        id_user: ownerId,
        type: { in: BADGE_DOCUMENT_TYPES },
        status: 'validated',
      },
      select: { type: true },
    }),
  ]);

  const validatedTypes = new Set(validatedDocs.map((doc) => doc.type));

  const boats = boatRows.map((boat) => {
    const ratings = boat.bookings.flatMap((booking) => booking.reviews.map((r) => r.rating));
    return {
      id_boat: boat.id_boat,
      name: boat.name,
      type: boat.type,
      price: boat.daily_price != null ? Number(boat.daily_price) : null,
      capacity: boat.capacity,
      with_skipper: boat.with_skipper,
      city: boat.port?.city ?? null,
      country: boat.port?.country ?? null,
      image: boat.images[0]?.url ?? null,
      avg_rating: averageRating(ratings),
      review_count: ratings.length,
    };
  });

  const reviews = reviewRows.map((review) => ({
    id: review.id_review,
    name: shortName(review.user.first_name, review.user.last_name),
    avatar: review.user.images[0]?.url ?? null,
    rating: review.rating,
    text: review.comment,
    created_at: review.created_at,
    owner_reply: review.owner_reply,
    boat_id: review.booking.id_boat,
    boat_name: review.booking.boat?.name ?? null,
  }));

  return {
    owner: {
      id_user: owner.id_user,
      first_name: owner.first_name,
      last_name: owner.last_name,
      member_since: owner.created_at,
      avatar: owner.images[0]?.url ?? null,
    },
    badges: {
      license: validatedTypes.has('permis'),
      insurance: validatedTypes.has('assurance'),
      skipper: validatedTypes.has('cv_marin'),
      francisation: validatedTypes.has('acte_francisation'),
    },
    stats: {
      boat_count: boats.length,
      review_count: reviews.length,
      avg_rating: averageRating(reviews.map((review) => review.rating)),
    },
    boats,
    reviews,
  };
}
