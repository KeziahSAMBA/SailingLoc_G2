// Données et logique partagées pour générer un lot d'avis locataire par
// bateau — utilisées à la fois par le seed complet (prisma/seed.js) et par
// le script d'appoint (prisma/addMissingReviews.js) qui ajoute des avis à une
// base déjà peuplée, sans rien tronquer.

const POSITIVE_TEMPLATES = [
  (n) =>
    `Superbe expérience à bord de ${n}, tout était conforme à l'annonce et le bateau impeccable.`,
  (n) => `${n} correspond parfaitement à la description, je recommande vivement cette location.`,
  (n) => `Séjour très agréable avec ${n}, propriétaire réactif et bateau parfaitement entretenu.`,
  (n) => `${n} était magnifique, une location sans la moindre mauvaise surprise. Je reviendrai !`,
  (n) => `Excellente prestation avec ${n}, tout était au rendez-vous du début à la fin.`,
];
const NEUTRAL_TEMPLATES = [
  (n) => `Location correcte avec ${n}, quelques petits détails à améliorer mais rien de grave.`,
  (n) =>
    `Bonne découverte avec ${n}, expérience globalement satisfaisante sans être exceptionnelle.`,
];
const CRITICAL_TEMPLATES = [
  (n) =>
    `Déçu par ${n}, plusieurs équipements ne fonctionnaient pas correctement pendant le séjour.`,
  (n) =>
    `Expérience décevante avec ${n}, l'état du bateau ne correspondait pas vraiment à l'annonce.`,
  (n) =>
    `Communication difficile avec le propriétaire de ${n}, prestation en deçà de mes attentes.`,
];

// 5 avis par bateau : 3 bien notés (4-5), 1 neutre (3), 1 critique (1-2).
const REVIEW_PLAN = [
  { rating: 5, templates: POSITIVE_TEMPLATES },
  { rating: 4, templates: POSITIVE_TEMPLATES },
  { rating: 5, templates: POSITIVE_TEMPLATES },
  { rating: 3, templates: NEUTRAL_TEMPLATES },
  { rating: 2, templates: CRITICAL_TEMPLATES },
];

// Crée, pour chaque bateau fourni, un lot fixe de 5 avis locataire (booking +
// review confirmés, statut 'validated') piochés dans reviewerPool — jamais
// deux fois le même locataire sur les 5 avis d'un même bateau (le pool doit
// donc contenir au moins 5 utilisateurs). N'insère que du nouveau (Prisma
// Client génère les IDs), ne touche jamais aux lignes existantes.
export async function seedBoatReviews(
  prisma,
  boats,
  reviewerPool,
  { baseDate = new Date('2024-01-01T00:00:00Z') } = {}
) {
  for (const boat of boats) {
    for (const [j, plan] of REVIEW_PLAN.entries()) {
      const nights = 5;
      // Décalage borné par bateau (pas un compteur global illimité) : reste
      // toujours dans un passé raisonnable quel que soit le nombre de bateaux.
      const startDate = new Date(baseDate);
      startDate.setDate(startDate.getDate() + boat.id_boat * 6 + j * 5);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + nights);
      const reviewDate = new Date(endDate);
      reviewDate.setDate(reviewDate.getDate() + 2);
      const reviewerId = reviewerPool[(boat.id_boat + j) % reviewerPool.length];

      const booking = await prisma.booking.create({
        data: {
          id_user: reviewerId,
          id_boat: boat.id_boat,
          start_date: startDate,
          end_date: endDate,
          status: 'confirmed',
          total_amount: Number(boat.daily_price) * nights,
          booking_date: startDate,
        },
      });

      const template = plan.templates[(boat.id_boat + j) % plan.templates.length];
      await prisma.review.create({
        data: {
          id_user: reviewerId,
          id_booking: booking.id_booking,
          rating: plan.rating,
          comment: template(boat.name),
          status: 'validated',
          created_at: reviewDate,
        },
      });
    }
  }
}
