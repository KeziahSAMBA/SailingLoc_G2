import prisma from '../config/db.js';

const RATING_MIN = 1;
const RATING_MAX = 5;

// Avatar de profil de l'auteur (même relation que getPublicReviews).
const AUTHOR_SELECT = {
  first_name: true,
  last_name: true,
  images: {
    where: { type: 'profil', deleted_at: null },
    select: { url: true },
    take: 1,
    orderBy: { order: 'asc' },
  },
};

function authorName(user) {
  return `${user.first_name} ${user.last_name.charAt(0)}.`;
}

// Minuit du jour courant : une location est « terminée » dès le lendemain de sa
// date de fin (même règle que la carte de réservation côté locataire).
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Le locataire dépose un avis sur une réservation confirmée, terminée et qui
// lui appartient, une seule fois. L'avis reste en modération (pending).
export async function createBookingReview(id_user, id_booking, { rating, comment } = {}) {
  const parsedRating = Number(rating);
  const cleanComment = String(comment ?? '').trim();
  if (!Number.isInteger(parsedRating) || parsedRating < RATING_MIN || parsedRating > RATING_MAX) {
    throw Object.assign(new Error('Note invalide (1 à 5).'), { status: 400 });
  }
  if (cleanComment.length < 10 || cleanComment.length > 1000) {
    throw Object.assign(new Error('Le commentaire doit contenir entre 10 et 1000 caractères.'), {
      status: 400,
    });
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id_booking: Number(id_booking),
      id_user,
      deleted_at: null,
      boat: { deleted_at: null },
    },
    select: {
      id_booking: true,
      status: true,
      end_date: true,
      reviews: { where: { id_user }, select: { id_review: true }, take: 1 },
    },
  });
  if (!booking) {
    throw Object.assign(new Error('Réservation introuvable.'), { status: 404 });
  }

  const end = new Date(booking.end_date);
  end.setHours(0, 0, 0, 0);
  const finished = booking.status === 'confirmed' && end < startOfToday();
  if (!finished) {
    throw Object.assign(new Error('Vous pourrez laisser un avis une fois la location terminée.'), {
      status: 400,
    });
  }
  if (booking.reviews.length > 0) {
    throw Object.assign(new Error('Un avis a déjà été déposé pour cette location.'), {
      status: 409,
    });
  }

  return prisma.review.create({
    data: {
      id_user,
      id_booking: booking.id_booking,
      rating: parsedRating,
      comment: cleanComment,
      status: 'pending',
      created_at: new Date(),
    },
    select: { id_review: true, rating: true, comment: true, status: true, created_at: true },
  });
}

// Le locataire connecté peut-il laisser un avis sur ce bateau ? Vrai s'il a une
// location confirmée et terminée (plusieurs avis autorisés). Renvoie la
// réservation la plus récente comme cible.
export async function getReviewEligibility(id_user, id_boat) {
  const booking = await prisma.booking.findFirst({
    where: {
      id_user,
      id_boat: Number(id_boat),
      status: 'confirmed',
      deleted_at: null,
      boat: { deleted_at: null },
      end_date: { lt: startOfToday() },
    },
    orderBy: { end_date: 'desc' },
    select: { id_booking: true },
  });
  return { can_review: Boolean(booking), id_booking: booking?.id_booking ?? null };
}

// Avis d'un bateau pour la page publique : validés ET en attente de modération
// (les refusés restent masqués). Le statut est renvoyé pour n'afficher le badge
// « vérifié » que sur les avis validés.
export async function listBoatReviews(id_boat, viewer = null) {
  const boatId = Number(id_boat);
  if (!Number.isSafeInteger(boatId) || boatId <= 0) {
    throw Object.assign(new Error('Identifiant de bateau invalide.'), { status: 400 });
  }

  // Les avis en attente restent consultables uniquement par leur auteur afin
  // qu'il puisse les corriger. Ils ne doivent jamais devenir du contenu public
  // avant validation ; les avis supprimés sont exclus dans tous les cas.
  const validatedForPublishedBoat = {
    status: 'validated',
    booking: {
      id_boat: boatId,
      deleted_at: null,
      boat: { deleted_at: null, is_published: true, status: 'published' },
    },
  };
  const ownPending = viewer?.id_user
    ? {
        status: 'pending',
        id_user: viewer.id_user,
        booking: { id_boat: boatId, deleted_at: null, boat: { deleted_at: null } },
      }
    : null;
  const reviews = await prisma.review.findMany({
    where: {
      deleted_at: null,
      OR: ownPending ? [validatedForPublishedBoat, ownPending] : [validatedForPublishedBoat],
    },
    orderBy: { created_at: 'desc' },
    select: {
      id_review: true,
      id_user: true,
      rating: true,
      comment: true,
      status: true,
      created_at: true,
      owner_reply: true,
      owner_reply_at: true,
      user: { select: AUTHOR_SELECT },
    },
  });

  return reviews.map((r) => ({
    id_review: r.id_review,
    // Auteur exposé pour permettre à celui-ci d'éditer son propre avis.
    id_user: r.id_user,
    rating: r.rating,
    comment: r.comment,
    status: r.status,
    created_at: r.created_at,
    author: authorName(r.user),
    avatar: r.user.images[0]?.url ?? null,
    owner_reply: r.status === 'validated' ? r.owner_reply : null,
    owner_reply_at: r.status === 'validated' ? r.owner_reply_at : null,
  }));
}

// Le locataire modifie son propre avis : le contenu repart en modération.
export async function updateBookingReview(id_user, id_review, { rating, comment } = {}) {
  const parsedRating = Number(rating);
  if (!Number.isInteger(parsedRating) || parsedRating < RATING_MIN || parsedRating > RATING_MAX) {
    throw Object.assign(new Error('Note invalide (1 à 5).'), { status: 400 });
  }

  const review = await prisma.review.findFirst({
    where: { id_review: Number(id_review), id_user, deleted_at: null },
    select: { id_review: true },
  });
  if (!review) {
    throw Object.assign(new Error('Avis introuvable.'), { status: 404 });
  }

  return prisma.review.update({
    where: { id_review: review.id_review },
    data: {
      rating: parsedRating,
      comment: comment?.trim() || null,
      status: 'pending',
      updated_at: new Date(),
    },
    select: { id_review: true, rating: true, comment: true, status: true, updated_at: true },
  });
}

// Le locataire supprime son propre avis : suppression douce, il sort des listes
// publiques comme du fil du propriétaire.
export async function deleteBookingReview(id_user, id_review) {
  const review = await prisma.review.findFirst({
    where: { id_review: Number(id_review), id_user, deleted_at: null },
    select: { id_review: true },
  });
  if (!review) {
    throw Object.assign(new Error('Avis introuvable.'), { status: 404 });
  }

  const now = new Date();
  await prisma.review.update({
    where: { id_review: review.id_review },
    data: { deleted_at: now, updated_at: now },
  });
  return { id_review: review.id_review };
}

// Avis reçus sur les bateaux du propriétaire (fil « Avis reçus ») : uniquement
// les avis validés, ceux en attente de modération restent masqués.
export async function listOwnerReviews(id_owner) {
  const reviews = await prisma.review.findMany({
    where: {
      status: 'validated',
      deleted_at: null,
      booking: { deleted_at: null, boat: { id_user: id_owner, deleted_at: null } },
    },
    orderBy: { created_at: 'desc' },
    select: {
      id_review: true,
      rating: true,
      comment: true,
      status: true,
      created_at: true,
      owner_reply: true,
      owner_reply_at: true,
      user: { select: { first_name: true, last_name: true } },
      booking: { select: { boat: { select: { id_boat: true, name: true } } } },
    },
  });

  return reviews.map((r) => ({
    id_review: r.id_review,
    rating: r.rating,
    comment: r.comment,
    status: r.status,
    created_at: r.created_at,
    author: authorName(r.user),
    boat: r.booking.boat,
    owner_reply: r.owner_reply,
    owner_reply_at: r.owner_reply_at,
  }));
}

// Le propriétaire répond (ou modifie sa réponse) à un avis portant sur l'un de
// ses bateaux.
export async function replyToReview(id_owner, id_review, reply) {
  const text = (reply || '').trim();
  if (!text) {
    throw Object.assign(new Error('La réponse ne peut pas être vide.'), { status: 400 });
  }

  const review = await prisma.review.findFirst({
    where: {
      id_review: Number(id_review),
      deleted_at: null,
      booking: { boat: { id_user: id_owner } },
    },
    select: { id_review: true },
  });
  if (!review) {
    throw Object.assign(new Error('Avis introuvable.'), { status: 404 });
  }

  return prisma.review.update({
    where: { id_review: review.id_review },
    data: { owner_reply: text, owner_reply_at: new Date(), updated_at: new Date() },
    select: { id_review: true, owner_reply: true, owner_reply_at: true },
  });
}
