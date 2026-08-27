import prisma from '../config/db.js';
import { listBoatReviews } from '../services/reviewService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function getBoatReviews(req, res) {
  try {
    const reviews = await listBoatReviews(req.params.id_boat, req.user);
    res.json({ reviews });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getPublicReviews(req, res) {
  try {
    const idBoat = req.query.id_boat === undefined ? null : Number(req.query.id_boat);
    if (idBoat !== null && (!Number.isInteger(idBoat) || idBoat <= 0)) {
      return res.status(400).json({ message: 'Identifiant de bateau invalide.' });
    }
    const reviews = await prisma.review.findMany({
      where: {
        status: 'validated',
        deleted_at: null,
        booking: {
          ...(idBoat !== null ? { id_boat: idBoat } : {}),
          deleted_at: null,
          boat: { deleted_at: null, is_published: true, status: 'published' },
        },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id_review: true,
        // Auteur exposé pour que celui-ci retrouve son avis et puisse l'éditer.
        id_user: true,
        rating: true,
        comment: true,
        created_at: true,
        owner_reply: true,
        booking: {
          select: { id_boat: true },
        },
        user: {
          select: {
            first_name: true,
            last_name: true,
            role: true,
            images: {
              where: { type: 'profil', deleted_at: null },
              select: { url: true },
              take: 1,
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    const formatted = reviews.map((r) => ({
      id: r.id_review,
      id_user: r.id_user,
      name: `${r.user.first_name} ${r.user.last_name.charAt(0)}.`,
      role: r.user.role,
      rating: r.rating,
      created_at: r.created_at,
      date: new Date(r.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      text: r.comment,
      owner_reply: r.owner_reply,
      avatar: r.user.images[0]?.url ?? null,
      boatId: r.booking.id_boat,
    }));

    res.json(formatted);
  } catch (err) {
    return sendError(res, err);
  }
}
