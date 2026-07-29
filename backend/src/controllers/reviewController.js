import prisma from '../config/db.js';

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
        ...(idBoat !== null ? { booking: { id_boat: idBoat } } : {}),
      },
      orderBy: { created_at: 'desc' },
      select: {
        id_review: true,
        rating: true,
        comment: true,
        created_at: true,
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
      avatar: r.user.images[0]?.url ?? null,
      boatId: r.booking.id_boat,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('[reviewController] getPublicReviews:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}
