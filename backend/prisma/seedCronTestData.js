// Jeu de données destiné à essayer les tâches planifiées depuis le back-office.
// Chaque catégorie contient des lignes à purger ET des lignes qui doivent
// survivre, pour vérifier que les tâches épargnent bien ce qu'elles doivent.
//
//   node prisma/seedCronTestData.js          → insère le jeu de données
//   node prisma/seedCronTestData.js --clean  → le retire intégralement
//
// Toutes les lignes créées portent un marqueur : préfixe « cron_demo_ » pour les
// jetons, domaine « @cron-demo.test » pour les contacts, meta.demo pour les
// logs, montant 1337 pour les réservations.

import prisma from '../src/config/db.js';

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const DEMO_AMOUNT = 1337;
const DEMO_DOMAIN = '@cron-demo.test';
const DEMO_TOKEN_PREFIX = 'cron_demo_';

const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);
const hoursAgo = (n) => new Date(Date.now() - n * HOUR_MS);
const between = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

async function clean() {
  const [tokens, logs, contacts, bookings] = await Promise.all([
    prisma.refreshToken.deleteMany({ where: { token_hash: { startsWith: DEMO_TOKEN_PREFIX } } }),
    prisma.activityLog.deleteMany({ where: { meta: { path: ['demo'], equals: true } } }),
    prisma.contactRequest.deleteMany({ where: { email: { endsWith: DEMO_DOMAIN } } }),
    prisma.booking.deleteMany({ where: { total_amount: DEMO_AMOUNT } }),
  ]);

  console.log('Jeu de données de test retiré :');
  console.log(`  jetons de session   : ${tokens.count}`);
  console.log(`  entrées de journal  : ${logs.count}`);
  console.log(`  demandes de contact : ${contacts.count}`);
  console.log(`  réservations        : ${bookings.count}`);
}

async function seedTokens(userId) {
  const rows = [];

  // Cibles : expirés depuis 31 à 400 jours.
  for (let i = 0; i < 400; i += 1) {
    const age = between(31, 400);
    rows.push({
      id_user: userId,
      token_hash: `${DEMO_TOKEN_PREFIX}purge_${i}`,
      expires_at: daysAgo(age),
      revoked_at: i % 3 === 0 ? daysAgo(age + 7) : null,
      created_at: daysAgo(age + 7),
    });
  }

  // Épargnés : encore valides, ou expirés depuis moins de 30 jours.
  for (let i = 0; i < 40; i += 1) {
    rows.push({
      id_user: userId,
      token_hash: `${DEMO_TOKEN_PREFIX}actif_${i}`,
      expires_at: new Date(Date.now() + between(1, 7) * DAY_MS),
      created_at: daysAgo(1),
    });
  }
  // Révoqués mais pas encore expirés : ce sont eux qui permettent de détecter
  // un rejeu de session, ils ne doivent jamais partir.
  for (let i = 0; i < 20; i += 1) {
    rows.push({
      id_user: userId,
      token_hash: `${DEMO_TOKEN_PREFIX}revoque_valide_${i}`,
      expires_at: new Date(Date.now() + between(1, 5) * DAY_MS),
      revoked_at: hoursAgo(between(1, 48)),
      created_at: daysAgo(2),
    });
  }
  for (let i = 0; i < 20; i += 1) {
    rows.push({
      id_user: userId,
      token_hash: `${DEMO_TOKEN_PREFIX}expire_recent_${i}`,
      expires_at: daysAgo(between(1, 29)),
      created_at: daysAgo(35),
    });
  }

  await prisma.refreshToken.createMany({ data: rows });
  return { purgeables: 400, epargnes: 80 };
}

async function seedLogs(user) {
  const actions = [
    ['user', 'user.update', 'info'],
    ['boat', 'boat.publish', 'info'],
    ['booking', 'booking.cancel', 'warning'],
    ['document', 'document.status', 'info'],
    ['auth', 'admin.login_failed', 'error'],
  ];
  const rows = [];

  // Cibles : plus vieux que la rétention d'un an, tous niveaux confondus.
  for (let i = 0; i < 500; i += 1) {
    const [category, action, level] = actions[i % actions.length];
    rows.push({
      level,
      category,
      action,
      message: `Entrée de démonstration ${i}`,
      actor_id: user.id_user,
      actor_email: user.email,
      actor_role: user.role,
      target_type: category,
      target_id: String(between(1, 99)),
      meta: { demo: true },
      created_at: daysAgo(between(366, 900)),
    });
  }

  // Épargnées : dans la rétention.
  for (let i = 0; i < 100; i += 1) {
    const [category, action, level] = actions[i % actions.length];
    rows.push({
      level,
      category,
      action,
      message: `Entrée récente ${i}`,
      actor_id: user.id_user,
      actor_email: user.email,
      actor_role: user.role,
      target_type: category,
      target_id: String(between(1, 99)),
      meta: { demo: true },
      created_at: daysAgo(between(1, 300)),
    });
  }

  await prisma.activityLog.createMany({ data: rows });
  return { purgeables: 500, epargnes: 100 };
}

async function seedContactRequests() {
  const rows = [];

  // Cibles, premier régime : traitées il y a plus de 90 jours.
  for (let i = 0; i < 35; i += 1) {
    const age = between(95, 400);
    rows.push({
      name: `Prospect traité ${i}`,
      email: `traite${i}${DEMO_DOMAIN}`,
      subject: 'Demande de renseignements',
      message: 'Bonjour, je souhaite louer un voilier cet été.',
      status: 'processed',
      created_at: daysAgo(age + 5),
      processed_at: daysAgo(age),
    });
  }
  // Cibles, second régime : jamais traitées depuis plus d'un an.
  for (let i = 0; i < 25; i += 1) {
    rows.push({
      name: `Demande abandonnée ${i}`,
      email: `abandon${i}${DEMO_DOMAIN}`,
      subject: 'Question tarifs',
      message: 'Quels sont vos tarifs à la semaine ?',
      status: 'new',
      created_at: daysAgo(between(370, 800)),
    });
  }

  // Épargnées : traitées récemment, ou en attente depuis moins d'un an.
  for (let i = 0; i < 15; i += 1) {
    rows.push({
      name: `Prospect récent ${i}`,
      email: `recent${i}${DEMO_DOMAIN}`,
      subject: 'Disponibilité août',
      message: 'Le bateau est-il libre la semaine du 15 ?',
      status: 'processed',
      created_at: daysAgo(between(20, 60)),
      processed_at: daysAgo(between(1, 15)),
    });
  }
  for (let i = 0; i < 15; i += 1) {
    rows.push({
      name: `En attente ${i}`,
      email: `attente${i}${DEMO_DOMAIN}`,
      subject: 'Demande de devis',
      message: 'Pouvez-vous me faire une proposition ?',
      status: 'new',
      created_at: daysAgo(between(30, 300)),
    });
  }

  await prisma.contactRequest.createMany({ data: rows });
  return { purgeables: 60, epargnes: 30 };
}

async function seedBookings(userId, boatId) {
  const rows = [];

  // Cibles : « pending », sans paiement, créées il y a plus de 72 h.
  for (let i = 0; i < 25; i += 1) {
    const start = new Date(Date.now() + between(30, 120) * DAY_MS);
    rows.push({
      id_user: userId,
      id_boat: boatId,
      start_date: start,
      end_date: new Date(start.getTime() + 5 * DAY_MS),
      status: 'pending',
      total_amount: DEMO_AMOUNT,
      booking_date: hoursAgo(between(73, 500)),
    });
  }
  // Épargnées : demandes récentes, encore dans le délai de paiement.
  for (let i = 0; i < 10; i += 1) {
    const start = new Date(Date.now() + between(30, 120) * DAY_MS);
    rows.push({
      id_user: userId,
      id_boat: boatId,
      start_date: start,
      end_date: new Date(start.getTime() + 3 * DAY_MS),
      status: 'pending',
      total_amount: DEMO_AMOUNT,
      booking_date: hoursAgo(between(1, 60)),
    });
  }

  await prisma.booking.createMany({ data: rows });
  return { purgeables: 25, epargnes: 10 };
}

async function seed() {
  const user = await prisma.user.findFirst({ where: { role: 'locataire', deleted_at: null } });
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  const boat = await prisma.boat.findFirst({ where: { deleted_at: null } });

  if (!user || !admin || !boat) {
    throw new Error('Base incomplète : lancez d’abord le seed principal (prisma db seed).');
  }

  const [tokens, logs, contacts, bookings] = [
    await seedTokens(user.id_user),
    await seedLogs(admin),
    await seedContactRequests(),
    await seedBookings(user.id_user, boat.id_boat),
  ];

  const line = (label, task, r) =>
    console.log(
      `  ${label.padEnd(20)} ${String(r.purgeables).padStart(3)} à purger, ${String(r.epargnes).padStart(3)} à épargner   (${task})`
    );

  console.log('Jeu de données de test inséré :');
  line('jetons de session', 'tokens.purge', tokens);
  line('entrées de journal', 'logs.purge', logs);
  line('demandes de contact', 'contact.purge', contacts);
  line('réservations', 'bookings.expire', bookings);
  console.log('\nLancez chaque tâche en simulation depuis /admin/taches/programmation :');
  console.log('les chiffres « à purger » doivent correspondre à la colonne Traités.');
}

const mode = process.argv.includes('--clean') ? clean : seed;

mode()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
