// Jeu de données destiné à essayer les tâches planifiées depuis le back-office.
// Chaque catégorie contient des lignes à purger ET des lignes qui doivent
// survivre, pour vérifier que les tâches épargnent bien ce qu'elles doivent.
//
//   node prisma/seedCronTestData.js          → insère le jeu de données
//   node prisma/seedCronTestData.js --clean  → le retire intégralement
//
// Toutes les lignes créées portent un marqueur : préfixe « cron_demo_ » pour les
// jetons, domaine « @cron-demo.test » pour les contacts, meta.demo pour les
// logs, result.demo pour les exécutions, montant 1337 pour les réservations.
//
// Les comptes de démonstration font exception : users.purge efface justement
// tout ce qui pourrait les identifier. Leur marqueur est donc une date de
// création sentinelle, le seul champ que l'anonymisation ne touche pas.

import prisma from '../src/config/db.js';

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const DEMO_AMOUNT = 1337;
const DEMO_DOMAIN = '@cron-demo.test';
const DEMO_TOKEN_PREFIX = 'cron_demo_';
const DEMO_USER_CREATED_AT = new Date('2000-01-01T00:00:00.000Z');

const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);
const hoursAgo = (n) => new Date(Date.now() - n * HOUR_MS);
const between = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

async function clean() {
  const [tokens, logs, contacts, bookings, runs] = await Promise.all([
    prisma.refreshToken.deleteMany({ where: { token_hash: { startsWith: DEMO_TOKEN_PREFIX } } }),
    prisma.activityLog.deleteMany({ where: { meta: { path: ['demo'], equals: true } } }),
    prisma.contactRequest.deleteMany({ where: { email: { endsWith: DEMO_DOMAIN } } }),
    prisma.booking.deleteMany({ where: { total_amount: DEMO_AMOUNT } }),
    prisma.cronRun.deleteMany({ where: { result: { path: ['demo'], equals: true } } }),
  ]);

  // Deux marqueurs : la sentinelle pour les comptes que l'anonymisation aura
  // dépouillés, le domaine de démo pour ceux qui gardent leur e-mail.
  const demoUsers = await prisma.user.findMany({
    where: {
      OR: [{ created_at: DEMO_USER_CREATED_AT }, { email: { endsWith: DEMO_DOMAIN } }],
    },
    select: { id_user: true },
  });
  const demoUserIds = demoUsers.map((user) => user.id_user);
  await prisma.document.deleteMany({ where: { id_user: { in: demoUserIds } } });
  const users = await prisma.user.deleteMany({ where: { id_user: { in: demoUserIds } } });

  console.log('Jeu de données de test retiré :');
  console.log(`  jetons de session   : ${tokens.count}`);
  console.log(`  entrées de journal  : ${logs.count}`);
  console.log(`  demandes de contact : ${contacts.count}`);
  console.log(`  réservations        : ${bookings.count}`);
  console.log(`  exécutions de tâche : ${runs.count}`);
  console.log(`  comptes supprimés   : ${users.count}`);
}

async function seedDeletedUsers() {
  const makeUser = (i, deletedAt, anonymizedAt = null) =>
    prisma.user.create({
      data: {
        last_name: 'Testeur',
        first_name: `Compte ${i}`,
        email: `supprime${i}${DEMO_DOMAIN}`,
        password: 'demo',
        role: 'locataire',
        phone: '0600000000',
        is_active: false,
        created_at: DEMO_USER_CREATED_AT,
        deleted_at: deletedAt,
        anonymized_at: anonymizedAt,
      },
      select: { id_user: true },
    });

  // Cibles : supprimés depuis plus de 30 jours, avec une pièce d'identité à
  // effacer. Le fichier n'existe pas sur le disque, l'effacement passe outre.
  for (let i = 0; i < 12; i += 1) {
    const user = await makeUser(i, daysAgo(between(35, 200)));
    await prisma.document.create({
      data: {
        id_user: user.id_user,
        type: 'identite',
        file_name: `piece_${i}.pdf`,
        file_url: `storage/documents/cron_demo_${i}.pdf`,
        upload_date: daysAgo(210),
        status: 'validated',
      },
    });
  }

  // Épargnés : encore dans le délai de grâce.
  for (let i = 100; i < 103; i += 1) await makeUser(i, daysAgo(between(1, 25)));
  // Épargnés : déjà anonymisés, la tâche ne doit pas les retraiter.
  for (let i = 200; i < 202; i += 1) await makeUser(i, daysAgo(300), daysAgo(250));

  return { purgeables: 12, epargnes: 5 };
}

async function seedUnverifiedUsers() {
  const makeUser = (i, createdAt, verified) =>
    prisma.user.create({
      data: {
        last_name: 'Inscrit',
        first_name: `Sans suite ${i}`,
        email: `inscription${i}${DEMO_DOMAIN}`,
        password: 'demo',
        role: 'locataire',
        email_verified: verified,
        email_verification_token: verified ? null : `cron_demo_verif_${i}`,
        created_at: createdAt,
      },
      select: { id_user: true },
    });

  // Cibles : jamais confirmées, créées il y a plus de 30 jours.
  for (let i = 0; i < 18; i += 1) await makeUser(i, daysAgo(between(35, 400)), false);
  // Épargnées : encore dans le délai pour confirmer.
  for (let i = 100; i < 106; i += 1) await makeUser(i, daysAgo(between(1, 25)), false);
  // Épargnés : confirmés de longue date, ils n'ont rien à voir avec la tâche.
  for (let i = 200; i < 204; i += 1) await makeUser(i, daysAgo(between(200, 500)), true);

  return { purgeables: 18, epargnes: 10 };
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

async function seedCronRuns() {
  const jobs = await prisma.cronJob.findMany({ select: { id_job: true } });
  if (!jobs.length) throw new Error('Aucune tâche en base : démarrez le backend une fois.');

  const statuses = ['success', 'success', 'success', 'failed', 'skipped'];
  const rows = [];

  const run = (ageDays, i) => {
    const status = statuses[i % statuses.length];
    const started = daysAgo(ageDays);
    const duration = between(20, 4000);
    return {
      id_job: jobs[i % jobs.length].id_job,
      trigger: i % 7 === 0 ? 'manual' : 'schedule',
      status,
      dry_run: i % 4 === 0,
      started_at: started,
      finished_at: new Date(started.getTime() + duration),
      duration_ms: duration,
      affected: status === 'success' ? between(0, 500) : 0,
      result: { demo: true },
      error: status === 'failed' ? 'Erreur de démonstration.' : null,
    };
  };

  // Cibles : terminées il y a plus de 90 jours.
  for (let i = 0; i < 300; i += 1) rows.push(run(between(95, 400), i));
  // Épargnées : dans la rétention.
  for (let i = 0; i < 60; i += 1) rows.push(run(between(1, 89), i));

  await prisma.cronRun.createMany({ data: rows });
  return { purgeables: 300, epargnes: 60 };
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

  const [tokens, logs, contacts, bookings, runs, deletedUsers, unverifiedUsers] = [
    await seedTokens(user.id_user),
    await seedLogs(admin),
    await seedContactRequests(),
    await seedBookings(user.id_user, boat.id_boat),
    await seedCronRuns(),
    await seedDeletedUsers(),
    await seedUnverifiedUsers(),
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
  line('exécutions de tâche', 'cron.runs.purge', runs);
  line('comptes supprimés', 'users.purge', deletedUsers);
  line('inscriptions', 'users.unverified.purge', unverifiedUsers);
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
