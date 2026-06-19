import prisma from '../config/db.js';

const REVIEW_STATUSES = ['pending', 'validated', 'refused'];

const reviewInclude = {
  user: { select: { id_user: true, first_name: true, last_name: true } },
  booking: { select: { boat: { select: { name: true } } } },
};

function publicReview(r) {
  return {
    id_review: r.id_review,
    rating: r.rating,
    comment: r.comment,
    status: r.status,
    created_at: r.created_at,
    author: r.user ? { first_name: r.user.first_name, last_name: r.user.last_name } : null,
    boat_name: r.booking?.boat?.name || null,
  };
}

export async function listReviews({ status, search } = {}) {
  const where = { deleted_at: null };
  if (status && REVIEW_STATUSES.includes(status)) where.status = status;
  if (search && String(search).trim()) {
    const s = String(search).trim();
    where.OR = [
      { comment: { contains: s, mode: 'insensitive' } },
      { user: { first_name: { contains: s, mode: 'insensitive' } } },
      { user: { last_name: { contains: s, mode: 'insensitive' } } },
    ];
  }
  const reviews = await prisma.review.findMany({
    where,
    include: reviewInclude,
    orderBy: { created_at: 'desc' },
  });
  return reviews.map(publicReview);
}

export async function updateReview(id_review, { status, comment, rating }) {
  const id = Number(id_review);
  const review = await prisma.review.findUnique({ where: { id_review: id } });
  if (!review || review.deleted_at) {
    throw Object.assign(new Error('Avis introuvable.'), { status: 404 });
  }

  const data = {};
  if (status !== undefined) {
    if (!REVIEW_STATUSES.includes(status)) {
      throw Object.assign(new Error('Statut invalide.'), { status: 400 });
    }
    data.status = status;
  }
  if (comment !== undefined) {
    data.comment = (comment && String(comment).trim()) || null;
  }
  if (rating !== undefined) {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      throw Object.assign(new Error('La note doit être un entier de 1 à 5.'), { status: 400 });
    }
    data.rating = r;
  }
  if (Object.keys(data).length === 0) {
    throw Object.assign(new Error('Aucune modification à appliquer.'), { status: 400 });
  }

  data.updated_at = new Date();
  const updated = await prisma.review.update({
    where: { id_review: id },
    data,
    include: reviewInclude,
  });
  return publicReview(updated);
}

export async function deleteReview(id_review) {
  const id = Number(id_review);
  const review = await prisma.review.findUnique({ where: { id_review: id } });
  if (!review || review.deleted_at) {
    throw Object.assign(new Error('Avis introuvable.'), { status: 404 });
  }
  // Soft delete : conserve l'historique.
  await prisma.review.update({
    where: { id_review: id },
    data: { deleted_at: new Date(), updated_at: new Date() },
  });
}
