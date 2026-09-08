import prisma from '../config/db.js';
import { parsePositiveId } from '../utils/inputSecurity.js';

// Fiche d'un locataire, réservée au propriétaire ayant (eu) au moins une
// réservation avec lui : identité, badges de vérification, historique des
// locations chez CE propriétaire, avis laissés par les propriétaires.

const PUBLIC_AVATAR_TYPES = { in: ['profil', 'avatar'] };
const BOAT_IMAGE_TYPES = { in: ['boat', 'bateau'] };
const IDENTITY_DOC_TYPES = ['permis_conduire', 'piece_identite', 'cv_nautique'];

const MAX_BOOKINGS = 200;
const MAX_REVIEWS = 60;

function notFound() {
  return Object.assign(new Error('Locataire introuvable.'), { status: 404 });
}

// « Prénom N. » — même anonymisation que les avis publics.
function shortName(firstName, lastName) {
  const initial = lastName ? `${lastName.charAt(0)}.` : '';
  return [firstName, initial].filter(Boolean).join(' ');
}

function averageRating(ratings) {
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((total, v) => total + v, 0) / ratings.length) * 10) / 10;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getRenterProfileForOwner(id_owner, idParam) {
  const renterId = parsePositiveId(idParam);
  if (renterId === null) throw notFound();

  // Cloisonnement : un propriétaire ne consulte la fiche que d'un locataire
  // ayant réservé l'un de ses bateaux.
  const sharedBookingCount = await prisma.booking.count({
    where: {
      id_user: renterId,
      deleted_at: null,
      boat: { id_user: id_owner, deleted_at: null },
    },
  });
  if (sharedBookingCount === 0) throw notFound();

  const renter = await prisma.user.findFirst({
    where: { id_user: renterId, role: 'locataire', is_active: true, deleted_at: null },
    select: {
      id_user: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      created_at: true,
      images: {
        where: { type: PUBLIC_AVATAR_TYPES, deleted_at: null },
        orderBy: { order: 'asc' },
        take: 1,
        select: { url: true },
      },
    },
  });
  if (!renter) throw notFound();

  const today = startOfToday();

  const [bookingRows, reviewRows, validatedDocs, documents] = await Promise.all([
    prisma.booking.findMany({
      where: {
        id_user: renterId,
        deleted_at: null,
        boat: { id_user: id_owner, deleted_at: null },
      },
      orderBy: { start_date: 'desc' },
      take: MAX_BOOKINGS,
      select: {
        id_booking: true,
        start_date: true,
        end_date: true,
        booking_date: true,
        status: true,
        total_amount: true,
        boat: {
          select: {
            id_boat: true,
            name: true,
            type: true,
            port: { select: { city: true, country: true } },
            images: {
              where: { deleted_at: null, type: BOAT_IMAGE_TYPES },
              orderBy: { order: 'asc' },
              take: 1,
              select: { url: true },
            },
          },
        },
        // L'avis de CE propriétaire sur cette réservation (le cas échéant).
        reviews: {
          where: { id_user: id_owner, deleted_at: null },
          select: { id_review: true, rating: true, comment: true, status: true },
          take: 1,
        },
      },
    }),
    prisma.review.findMany({
      where: {
        status: 'validated',
        deleted_at: null,
        // Avis écrits par des propriétaires → ils portent sur le locataire.
        user: { role: 'proprietaire' },
        booking: { id_user: renterId, deleted_at: null },
      },
      orderBy: [{ created_at: 'desc' }, { id_review: 'desc' }],
      take: MAX_REVIEWS,
      select: {
        id_review: true,
        rating: true,
        comment: true,
        created_at: true,
        booking: { select: { boat: { select: { name: true } } } },
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
      where: { id_user: renterId, type: { in: IDENTITY_DOC_TYPES }, status: 'validated' },
      select: { type: true },
    }),
    // Documents d'identité rattachés à une réservation partagée avec ce
    // propriétaire (mêmes règles d'accès que la fiche locataire d'une réservation).
    prisma.document.findMany({
      where: {
        id_user: renterId,
        type: { in: IDENTITY_DOC_TYPES },
        bookings: {
          some: { booking: { id_user: renterId, boat: { id_user: id_owner } } },
        },
      },
      orderBy: { upload_date: 'desc' },
      select: { id_document: true, type: true, file_name: true, status: true, upload_date: true },
    }),
  ]);

  const validatedTypes = new Set(validatedDocs.map((d) => d.type));

  const bookings = bookingRows.map((b) => {
    const end = new Date(b.end_date);
    end.setHours(0, 0, 0, 0);
    const finished = b.status === 'confirmed' && end < today;
    const mine = b.reviews[0] || null;
    return {
      id_booking: b.id_booking,
      start_date: b.start_date,
      end_date: b.end_date,
      booking_date: b.booking_date,
      status: b.status,
      total_amount: b.total_amount != null ? Number(b.total_amount) : null,
      boat: {
        id_boat: b.boat?.id_boat ?? null,
        name: b.boat?.name ?? null,
        type: b.boat?.type ?? null,
        city: b.boat?.port?.city ?? null,
        image: b.boat?.images?.[0]?.url ?? null,
      },
      can_review: finished,
      my_review: mine
        ? {
            id_review: mine.id_review,
            rating: mine.rating,
            comment: mine.comment,
            status: mine.status,
          }
        : null,
    };
  });

  const reviews = reviewRows.map((r) => ({
    id: r.id_review,
    name: shortName(r.user.first_name, r.user.last_name),
    avatar: r.user.images[0]?.url ?? null,
    rating: r.rating,
    text: r.comment,
    created_at: r.created_at,
    boat_name: r.booking.boat?.name ?? null,
  }));

  return {
    renter: {
      id_user: renter.id_user,
      first_name: renter.first_name,
      last_name: renter.last_name,
      email: renter.email,
      phone: renter.phone,
      member_since: renter.created_at,
      avatar: renter.images[0]?.url ?? null,
    },
    badges: {
      license: validatedTypes.has('permis_conduire'),
      identity: validatedTypes.has('piece_identite'),
      nautical_cv: validatedTypes.has('cv_nautique'),
    },
    stats: {
      booking_count: bookings.length,
      review_count: reviews.length,
      avg_rating: averageRating(reviews.map((r) => r.rating)),
    },
    bookings,
    reviews,
    documents,
  };
}
