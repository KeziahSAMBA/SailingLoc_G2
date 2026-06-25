import prisma from '../config/db.js';

export async function getPublicReviews(req, res) {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: 'validated', deleted_at: null },
      orderBy: { created_at: 'desc' },
      select: {
        id_review: true,
        rating: true,
        comment: true,
        created_at: true,
        user: {
          select: { first_name: true, last_name: true, role: true },
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
    }));

    res.json(formatted);
  } catch (err) {
    console.error('[reviewController] getPublicReviews:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}
