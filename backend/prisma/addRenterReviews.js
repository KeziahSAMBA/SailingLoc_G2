// Script d'appoint : garantit au moins 3 avis propriétaire → locataire pour
// chaque compte locataire déjà en base, en créant les réservations confirmées
// passées correspondantes — sans rien tronquer ni recréer, contrairement à
// `npm run prisma:seed` (SEED_FORCE=true) qui repart d'une base vide.
//
// Usage (depuis le conteneur/dossier backend) : node prisma/addRenterReviews.js
import { PrismaClient } from '@prisma/client';
import { seedRenterReviews } from './renterReviewSeedData.js';
import { enforceSeedPolicy } from './seedPolicy.js';

let prisma;

async function main() {
  const seedPolicy = enforceSeedPolicy();
  if (!seedPolicy.allowed) {
    console.log(
      `[seed:renter-reviews] Ignoré en environnement ${seedPolicy.environment || 'déploiement'}.`
    );
    return;
  }
  prisma = new PrismaClient();

  const locataires = await prisma.user.findMany({
    where: { role: 'locataire', deleted_at: null },
    select: { id_user: true, first_name: true },
    orderBy: { id_user: 'asc' },
  });
  const owners = await prisma.user.findMany({
    where: { role: 'proprietaire', deleted_at: null },
    select: {
      id_user: true,
      boats: { where: { deleted_at: null }, select: { id_boat: true, daily_price: true } },
    },
    orderBy: { id_user: 'asc' },
  });

  if (locataires.length === 0) {
    throw new Error('Aucun locataire en base.');
  }
  if (owners.filter((o) => o.boats.some((b) => b.daily_price != null)).length < 3) {
    throw new Error(
      'Moins de 3 propriétaires avec un bateau tarifé : impossible de garantir 3 avis distincts par locataire.'
    );
  }

  const created = await seedRenterReviews(prisma, locataires, owners);
  console.log(
    `${created} avis propriétaire → locataire ajoutés (${locataires.length} locataire(s), 3 minimum chacun).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma?.$disconnect());
