import prisma from '../config/db.js';
import { listBoatReviews } from '../services/reviewService.js';
import { parsePagination } from '../utils/inputSecurity.js';

export async function getBoatReviews(req, res) {
  try {
    const reviews = await listBoatReviews(req.params.id_boat);
    res.json({ reviews });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getPublicReviews(req, res) {
  try {
    const idBoat = req.query.id_boat === undefined ? null : Number(req.query.id_boat);
    if (idBoat !== null && (!Number.isInteger(idBoat) || idBoat <= 0)) {
      return res.status(400).json({ message: 'Identifiant de bateau invalide.' });
    }
    // Sans borne, cet endpoint public renvoyait l'intégralité des avis du site
    // en une réponse — 800 Ko et le poste le plus lourd de la fiche produit.
    const { skip, take } = parsePagination(req.query);

    const reviews = await prisma.review.findMany({
      where: {
        status: 'validated',
        deleted_at: null,
        ...(idBoat !== null ? { booking: { id_boat: idBoat } } : {}),
      },
      // created_at seul ne départage pas deux avis de la même seconde : le tri
      // secondaire sur la clé primaire rend l'ordre total, faute de quoi deux
      // pages voisines pourraient répéter ou omettre un avis.
      orderBy: [{ created_at: 'desc' }, { id_review: 'desc' }],
      skip,
      take,
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
    // parsePagination porte son statut sur l'erreur. Le relayer évite de
    // répondre « Erreur serveur » à ce qui est une faute de la requête, et de
    // polluer les journaux d'une pile pour un paramètre mal formé.
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('[reviewController] getPublicReviews:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}
