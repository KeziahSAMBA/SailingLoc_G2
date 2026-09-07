// Données et logique partagées pour générer des avis propriétaire → locataire
// (le propriétaire note le locataire après une location terminée). Utilisées à
// la fois par le seed complet (prisma/seed.js) et par le script d'appoint
// (prisma/addRenterReviews.js) qui complète une base déjà peuplée sans
// rien tronquer.
//
// Un avis propriétaire → locataire est une ligne `review` dont l'auteur
// (id_user) est le propriétaire : c'est ce qui le distingue d'un avis
// locataire → bateau (cf. reviewService.js côté API).

const POSITIVE_TEMPLATES = [
  (n) => `${n} est un locataire exemplaire : ponctuel, soigneux, bateau rendu impeccable.`,
  (n) =>
    `Très bon contact avec ${n}, consignes respectées à la lettre. Je relouerais sans hésiter.`,
  (n) => `${n} maîtrise bien la navigation, restitution nickel et communication fluide.`,
  (n) => `Location sans accroc avec ${n}, échanges clairs avant comme pendant le séjour.`,
];
const NEUTRAL_TEMPLATES = [
  (n) => `Séjour correct avec ${n}, quelques petites négligences à bord mais rien de grave.`,
  (n) => `${n} a rendu le bateau avec un léger retard, sinon rien à signaler.`,
];
const CRITICAL_TEMPLATES = [
  (n) => `Restitution décevante avec ${n} : ménage non fait et petites traces non signalées.`,
  (n) => `Communication compliquée avec ${n}, consignes de sécurité peu suivies.`,
];

// Profils de notes (3 avis / locataire au minimum) : la plupart bien notés,
// un locataire « difficile » de temps à autre pour varier les fiches.
const RATING_SETS = [
  [5, 5, 4],
  [4, 5, 3],
  [5, 3, 4],
  [2, 4, 5],
  [5, 4, 4],
];

function templatesForRating(rating) {
  if (rating >= 4) return POSITIVE_TEMPLATES;
  if (rating === 3) return NEUTRAL_TEMPLATES;
  return CRITICAL_TEMPLATES;
}

// Pour chaque locataire fourni, garantit au moins `minPerRenter` avis
// propriétaire → locataire (réservation confirmée passée + review 'validated'),
// chacun signé d'un propriétaire distinct pioché dans `owners` — chaque owner
// devant avoir au moins un bateau avec un prix. N'insère que du nouveau
// (compte les avis déjà présents et se contente de compléter).
export async function seedRenterReviews(
  prisma,
  locataires,
  owners,
  { minPerRenter = 3, baseDate = new Date('2024-02-01T00:00:00Z') } = {}
) {
  const ownerPool = owners.filter((o) => o.boats.some((b) => b.daily_price != null));
  if (ownerPool.length === 0) return 0;

  let created = 0;
  for (const [i, renter] of locataires.entries()) {
    const existing = await prisma.review.count({
      where: {
        deleted_at: null,
        user: { role: 'proprietaire' },
        booking: { id_user: renter.id_user },
      },
    });
    const need = Math.max(minPerRenter - existing, 0);
    if (need === 0) continue;

    const ratings = RATING_SETS[i % RATING_SETS.length];
    for (let k = 0; k < need; k += 1) {
      // Décalage par `existing` : une seconde exécution pioche d'autres
      // propriétaires et d'autres notes plutôt que de répéter les mêmes.
      const owner = ownerPool[(i + existing + k) % ownerPool.length];
      const boats = owner.boats.filter((b) => b.daily_price != null);
      const boat = boats[(renter.id_user + k) % boats.length];
      const rating = ratings[(existing + k) % ratings.length];

      const nights = 4 + (k % 3);
      const startDate = new Date(baseDate);
      startDate.setDate(startDate.getDate() + (i * 11 + k * 4));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + nights);
      const reviewDate = new Date(endDate);
      reviewDate.setDate(reviewDate.getDate() + 3);

      const booking = await prisma.booking.create({
        data: {
          id_user: renter.id_user,
          id_boat: boat.id_boat,
          start_date: startDate,
          end_date: endDate,
          status: 'confirmed',
          total_amount: Number(boat.daily_price) * nights,
          booking_date: startDate,
        },
      });

      const templates = templatesForRating(rating);
      await prisma.review.create({
        data: {
          id_user: owner.id_user,
          id_booking: booking.id_booking,
          rating,
          comment: templates[(renter.id_user + k) % templates.length](renter.first_name),
          status: 'validated',
          created_at: reviewDate,
        },
      });
      created += 1;
    }
  }
  return created;
}
