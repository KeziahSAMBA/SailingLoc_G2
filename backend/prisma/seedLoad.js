import bcrypt from 'bcryptjs';
import prisma from '../src/config/db.js';

// Jeu de données volumétrique pour les tests de charge k6.
//
// Tout ce qui est créé ici porte le domaine @loadtest.local ou le préfixe LT- :
// le script commence par supprimer ces données, il est donc rejouable à
// l'identique pour repartir d'un état propre entre deux tirs.
//
// À NE JAMAIS LANCER EN PRODUCTION.

const MARKER = '@loadtest.local';
const BOAT_PREFIX = 'LT-';

const BOATS = Number(process.env.LOAD_BOATS) || 500;
const BOOKINGS = Number(process.env.LOAD_BOOKINGS) || 20000;
const OWNERS = Number(process.env.LOAD_OWNERS) || 20;
const GUESTS = Number(process.env.LOAD_GUESTS) || 100;
const PASSWORD = process.env.LOAD_PASSWORD || 'LoadTest!2026';

const CHUNK = 2000;

// Générateur pseudo-aléatoire déterministe : deux exécutions produisent le même
// jeu, sinon les tirs successifs ne seraient pas comparables entre eux.
let seed = 20260828;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));

const BOAT_TYPES = [
  'voilier',
  'catamaran',
  'moteur',
  'peniche',
  'trimaran',
  'hors_bord',
  'jet_ski',
  'gulet',
];
const BOAT_NAMES = [
  'Albatros',
  'Bonne Brise',
  'Cap Horn',
  'Dauphin',
  'Écume',
  'Farniente',
  'Grand Large',
  'Hirondelle',
  'Istria',
  'Joyeuse',
];
const BOOKING_STATUSES = [
  ...Array(60).fill('confirmed'),
  ...Array(15).fill('pending'),
  ...Array(15).fill('cancelled'),
  ...Array(10).fill('refused'),
];

async function inChunks(label, rows, create) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await create(rows.slice(i, i + CHUNK));
    process.stdout.write(`\r  ${label} : ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  process.stdout.write('\n');
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: MARKER } },
    select: { id_user: true },
  });
  if (users.length === 0) {
    console.log('Aucune donnée de charge préexistante.');
    return;
  }
  const userIds = users.map((u) => u.id_user);
  const boats = await prisma.boat.findMany({
    where: { id_user: { in: userIds } },
    select: { id_boat: true },
  });
  const boatIds = boats.map((b) => b.id_boat);
  const bookings = await prisma.booking.findMany({
    where: { OR: [{ id_user: { in: userIds } }, { id_boat: { in: boatIds } }] },
    select: { id_booking: true },
  });
  const bookingIds = bookings.map((b) => b.id_booking);

  console.log(
    `Nettoyage : ${userIds.length} comptes, ${boatIds.length} bateaux, ${bookingIds.length} réservations.`
  );

  // L'ordre suit les clés étrangères, du plus dépendant au moins dépendant.
  await prisma.review.deleteMany({ where: { id_booking: { in: bookingIds } } });
  await prisma.payment.deleteMany({ where: { id_booking: { in: bookingIds } } });
  await prisma.booking.deleteMany({ where: { id_booking: { in: bookingIds } } });
  await prisma.image.deleteMany({ where: { id_boat: { in: boatIds } } });
  await prisma.boatAvailability.deleteMany({ where: { id_boat: { in: boatIds } } });
  await prisma.userBoatFavorite.deleteMany({ where: { id_user: { in: userIds } } });
  await prisma.boat.deleteMany({ where: { id_boat: { in: boatIds } } });
  await prisma.refreshToken.deleteMany({ where: { id_user: { in: userIds } } });
  await prisma.message.deleteMany({
    where: { OR: [{ id_sender: { in: userIds } }, { id_receiver: { in: userIds } }] },
  });
  await prisma.image.deleteMany({ where: { id_user: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id_user: { in: userIds } } });
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seedLoad refuse de tourner avec NODE_ENV=production.');
  }

  console.log(`Cible : ${BOATS} bateaux, ${BOOKINGS} réservations, ${GUESTS} locataires.\n`);
  await cleanup();

  // Le hash bcrypt coûte ~275 ms : on le calcule une seule fois et on le
  // réutilise pour tous les comptes, qui partagent le même mot de passe.
  const hashed = await bcrypt.hash(PASSWORD, 12);

  const accounts = [
    { first_name: 'Admin', last_name: 'Charge', email: `admin${MARKER}`, role: 'admin' },
    ...Array.from({ length: OWNERS }, (_, i) => ({
      first_name: 'Proprio',
      last_name: `N${i + 1}`,
      email: `proprio${i + 1}${MARKER}`,
      role: 'proprietaire',
    })),
    ...Array.from({ length: GUESTS }, (_, i) => ({
      first_name: 'Locataire',
      last_name: `N${i + 1}`,
      email: `locataire${i + 1}${MARKER}`,
      role: 'locataire',
    })),
  ].map((u) => ({ ...u, password: hashed, is_active: true, email_verified: true }));

  await prisma.user.createMany({ data: accounts });
  const users = await prisma.user.findMany({
    where: { email: { endsWith: MARKER } },
    select: { id_user: true, role: true },
  });
  const ownerIds = users.filter((u) => u.role === 'proprietaire').map((u) => u.id_user);
  const guestIds = users.filter((u) => u.role === 'locataire').map((u) => u.id_user);
  console.log(`  comptes : ${users.length}`);

  let ports = await prisma.port.findMany({
    where: { deleted_at: null },
    select: { id_port: true },
  });
  if (ports.length === 0) {
    await prisma.port.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        name: `${BOAT_PREFIX}Port ${i + 1}`,
        city: `Ville ${i + 1}`,
        country: 'France',
      })),
    });
    ports = await prisma.port.findMany({ select: { id_port: true } });
  }
  const portIds = ports.map((p) => p.id_port);

  const boatRows = Array.from({ length: BOATS }, (_, i) => ({
    id_user: pick(ownerIds),
    id_port: pick(portIds),
    name: `${pick(BOAT_NAMES)} ${BOAT_PREFIX}${i + 1}`,
    type: pick(BOAT_TYPES),
    size: between(6, 25),
    daily_price: between(80, 1200),
    capacity: between(2, 12),
    build_year: between(1990, 2025),
    registration: `${BOAT_PREFIX}${String(i + 1).padStart(5, '0')}`,
    description: 'Bateau généré pour les tests de charge.',
    is_published: true,
    status: 'published',
    with_skipper: rand() > 0.7,
    license_required: rand() > 0.3,
  }));
  await inChunks('bateaux', boatRows, (rows) => prisma.boat.createMany({ data: rows }));

  const boats = await prisma.boat.findMany({
    where: { registration: { startsWith: BOAT_PREFIX } },
    select: { id_boat: true, daily_price: true },
  });
  const boatIds = boats.map((b) => b.id_boat);

  const imageRows = boats.flatMap((b, i) =>
    Array.from({ length: between(1, 3) }, (_, k) => ({
      id_boat: b.id_boat,
      url: `https://picsum.photos/seed/${BOAT_PREFIX}${i}-${k}/800/600`,
      type: 'boat',
      order: k,
    }))
  );
  await inChunks('images', imageRows, (rows) => prisma.image.createMany({ data: rows }));

  const today = new Date();
  const bookingRows = Array.from({ length: BOOKINGS }, () => {
    const boat = pick(boats);
    // Deux tiers de séjours passés (avis possibles), un tiers à venir.
    const offset = rand() > 0.33 ? -between(2, 700) : between(1, 200);
    const start = new Date(today);
    start.setDate(start.getDate() + offset);
    const nights = between(2, 14);
    const end = new Date(start);
    end.setDate(end.getDate() + nights);
    const booked = new Date(start);
    booked.setDate(booked.getDate() - between(1, 60));
    return {
      id_user: pick(guestIds),
      id_boat: boat.id_boat,
      start_date: start,
      end_date: end,
      status: pick(BOOKING_STATUSES),
      total_amount: Number(boat.daily_price) * nights,
      booking_date: booked,
    };
  });
  await inChunks('réservations', bookingRows, (rows) => prisma.booking.createMany({ data: rows }));

  const confirmed = await prisma.booking.findMany({
    where: { id_boat: { in: boatIds }, status: 'confirmed' },
    select: { id_booking: true, id_user: true, total_amount: true, end_date: true },
  });

  const paymentRows = confirmed.map((b, i) => ({
    id_booking: b.id_booking,
    amount: b.total_amount,
    commission: Number(b.total_amount) * 0.1,
    payment_date: b.end_date,
    payment_method: 'card',
    status: 'success',
    transaction_ref: `SIM-${BOAT_PREFIX}${i + 1}`,
  }));
  await inChunks('paiements', paymentRows, (rows) => prisma.payment.createMany({ data: rows }));

  // Un avis sur trois séjours terminés, pour alimenter les pages publiques.
  const past = confirmed.filter((b) => b.end_date < today);
  const reviewRows = past
    .filter(() => rand() > 0.66)
    .map((b) => ({
      id_user: b.id_user,
      id_booking: b.id_booking,
      rating: between(3, 5),
      comment: 'Séjour généré pour les tests de charge, tout s’est bien passé.',
      status: 'validated',
    }));
  await inChunks('avis', reviewRows, (rows) => prisma.review.createMany({ data: rows }));

  console.log('\nTerminé.');
  console.log(
    `  Comptes    : admin${MARKER} / proprio1..${OWNERS}${MARKER} / locataire1..${GUESTS}${MARKER}`
  );
  console.log(`  Mot de passe : ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('\n[seedLoad] échec :', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
