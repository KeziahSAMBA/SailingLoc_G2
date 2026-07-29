// Script d'appoint : ajoute 5 avis locataire (3 bien notés, 1 neutre, 1
// critique) à chaque bateau publié, en piochant parmi les locataires déjà en
// base — sans rien tronquer ni recréer, contrairement à `npm run prisma:seed`
// (SEED_FORCE=true) qui repart d'une base vide. À lancer une seule fois sur
// une base déjà peuplée pour combler les bateaux avec peu ou pas d'avis.
//
// Usage (depuis le conteneur/dossier backend) : node prisma/addMissingReviews.js
import { PrismaClient } from '@prisma/client';
import { seedBoatReviews } from './reviewSeedData.js';

const prisma = new PrismaClient();

async function main() {
  const reviewers = await prisma.user.findMany({
    where: { role: 'locataire' },
    select: { id_user: true },
    orderBy: { id_user: 'asc' },
  });
  // seedBoatReviews pioche 5 locataires distincts par bateau (cf. reviewSeedData.js) :
  // il en faut donc au moins 5 dans le pool.
  if (reviewers.length < 5) {
    throw new Error(
      `Pas assez de locataires en base (${reviewers.length}) pour générer 5 avis distincts par bateau — il en faut au moins 5.`
    );
  }
  const reviewerPool = reviewers.map((u) => u.id_user);

  const boats = await prisma.boat.findMany({
    where: { is_published: true },
    orderBy: { id_boat: 'asc' },
  });

  await seedBoatReviews(prisma, boats, reviewerPool);

  console.log(
    `${boats.length} bateau(x) publié(s) : 5 avis locataire ajoutés à chacun (${boats.length * 5} au total).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
