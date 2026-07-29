import { PrismaClient } from '@prisma/client';
import { seedBoatReviews } from './reviewSeedData.js';

const prisma = new PrismaClient();

async function main() {
  // Le seed tourne à chaque démarrage du conteneur : on NE réinitialise PAS si des
  // données existent déjà, sinon on effacerait les comptes créés en cours de route.
  // Pour forcer un reset complet : SEED_FORCE=true.
  const force = process.env.SEED_FORCE === 'true';
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && !force) {
    console.log(
      `Seed ignoré : ${existingUsers} utilisateur(s) déjà présents (SEED_FORCE=true pour réinitialiser).`
    );
    return;
  }

  // Idempotence : on repart d'une base propre, IDs réinitialisés à 1.
  // Indispensable car les clés étrangères ci-dessous sont codées en dur
  // (id_boat, id_booking, id_document…) et supposent une numérotation déterministe.
  // CASCADE purge aussi les tables dépendantes (refresh_token, etc.).
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      boat_availability, boat_equipment,
      booking_document, payment, review, image, user_boat_favorite,
      dispute, boat_report, message, document, booking, boat, port, "user"
    RESTART IDENTITY CASCADE
  `);

  // Passwords: Admin@123456 | Proprietaire@2025Secure | Locataire@2025Secure (bcryptjs)
  // email_verified = TRUE for accounts listed in README (ready to login without verification step)
  await prisma.$executeRawUnsafe(`
    INSERT INTO "user" (last_name, first_name, email, password, role, phone, is_active, email_verified) VALUES
    ('Admin',     'Super',    'admin@sailingloc.fr',       '$2a$12$tsDdeCb5vK.n7/Z7cW7wq.G0HU/2eBbkHtW/XqGnRFBdszjhVT5Ay', 'admin',        '0600000001', TRUE, TRUE),
    ('Martin',    'Luc',      'luc.martin@email.fr',       '$2a$12$pti1fNZ6NupK64x/XV0FvOOJpov6K/1DPBBja9Tx0Cp0vCyHg4BTu', 'proprietaire', '0600000002', TRUE, TRUE),
    ('Dupont',    'Claire',   'claire.dupont@email.fr',    '$2a$12$pti1fNZ6NupK64x/XV0FvOOJpov6K/1DPBBja9Tx0Cp0vCyHg4BTu', 'proprietaire', '0600000003', TRUE, TRUE),
    ('Renaud',    'Pierre',   'pierre.renaud@email.fr',    '$2a$12$pti1fNZ6NupK64x/XV0FvOOJpov6K/1DPBBja9Tx0Cp0vCyHg4BTu', 'proprietaire', '0611000004', TRUE, TRUE),
    ('Faure',     'Isabelle', 'isabelle.faure@email.fr',   '$2a$12$pti1fNZ6NupK64x/XV0FvOOJpov6K/1DPBBja9Tx0Cp0vCyHg4BTu', 'proprietaire', '0622000005', TRUE, TRUE),
    ('Bernard',   'Thomas',   'thomas.bernard@email.fr',   '$2a$12$86/bkBw/rXcj4UkvnZY3nuS.oB7ZDPKwrxHRuXfrKpbjCxcAqt.Ze', 'locataire',    '0633000006', TRUE, TRUE),
    ('Lefevre',   'Sophie',   'sophie.lefevre@email.fr',   '$2a$12$86/bkBw/rXcj4UkvnZY3nuS.oB7ZDPKwrxHRuXfrKpbjCxcAqt.Ze', 'locataire',    '0644000007', TRUE, TRUE),
    ('Moreau',    'Jules',    'jules.moreau@email.fr',     '$2a$12$86/bkBw/rXcj4UkvnZY3nuS.oB7ZDPKwrxHRuXfrKpbjCxcAqt.Ze', 'locataire',    '0655000008', TRUE, TRUE),
    ('Girard',    'Camille',  'camille.girard@email.fr',   '$2a$12$86/bkBw/rXcj4UkvnZY3nuS.oB7ZDPKwrxHRuXfrKpbjCxcAqt.Ze', 'locataire',    '0666000009', TRUE, TRUE),
    ('Rousseau',  'Antoine',  'antoine.rousseau@email.fr', '$2a$12$86/bkBw/rXcj4UkvnZY3nuS.oB7ZDPKwrxHRuXfrKpbjCxcAqt.Ze', 'locataire',    '0677000010', TRUE, TRUE),
    ('Lambert',   'Marie',    'marie.lambert@email.fr',    '$2a$12$86/bkBw/rXcj4UkvnZY3nuS.oB7ZDPKwrxHRuXfrKpbjCxcAqt.Ze', 'locataire',    '0688000011', TRUE, TRUE),
    ('Blanc',     'Kevin',    'kevin.blanc@email.fr',      '$2a$12$86/bkBw/rXcj4UkvnZY3nuS.oB7ZDPKwrxHRuXfrKpbjCxcAqt.Ze', 'locataire',    '0699000012', TRUE, TRUE),
    ('Chevalier', 'Lucie',    'lucie.chevalier@email.fr',  '$2a$12$86/bkBw/rXcj4UkvnZY3nuS.oB7ZDPKwrxHRuXfrKpbjCxcAqt.Ze', 'locataire',    NULL,         TRUE, TRUE)
    ON CONFLICT (email, role) DO NOTHING
  `);

  // Photos de profil : réservées aux comptes de démonstration du seed
  // (les vrais inscrits ont un avatar à initiales généré côté front tant
  // qu'ils n'ont pas déposé de photo). Photo déterministe par nom.
  const seedAvatarUrl = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const gender = Math.abs(hash) % 2 === 0 ? 'women' : 'men';
    const index = (Math.abs(hash) % 70) + 1;
    return `https://randomuser.me/api/portraits/${gender}/${index}.jpg`;
  };
  const seedUsers = await prisma.user.findMany({
    select: { id_user: true, first_name: true, last_name: true },
  });
  await prisma.image.createMany({
    data: seedUsers.map((u) => ({
      id_user: u.id_user,
      type: 'avatar',
      url: seedAvatarUrl(`${u.first_name} ${u.last_name}`),
    })),
  });

  // Ports — 5 ports français disponibles (cohérents avec le filtre du carrousel)
  // IDs attribués dans l'ordre d'insertion : 1=Marseille, 2=La Rochelle, 3=Brest, 4=Nice, 5=Bordeaux
  await prisma.$executeRawUnsafe(`
    INSERT INTO port (name, city, country, department, region, latitude, longitude, image_url) VALUES
    ('Port de la Joliette', 'Marseille',   'France', '13', 'Provence-Alpes-Côte d''Azur', 43.351900,  5.355300, 'https://images.unsplash.com/photo-1496309838698-63bfac391248?auto=format&fit=crop&w=800&q=80'),
    ('Port des Minimes',    'La Rochelle', 'France', '17', 'Nouvelle-Aquitaine',          46.146700, -1.174400, 'https://images.unsplash.com/photo-1627333010297-56d4881b8da6?auto=format&fit=crop&w=800&q=80'),
    ('Port de Brest',       'Brest',       'France', '29', 'Bretagne',                    48.387200, -4.494900, 'https://images.unsplash.com/photo-1553637391-2f8d6aab82ae?auto=format&fit=crop&w=800&q=80'),
    ('Port de Nice',        'Nice',        'France', '06', 'Provence-Alpes-Côte d''Azur', 43.699300,  7.274900, 'https://images.unsplash.com/photo-1527675756500-16aac2af73bf?auto=format&fit=crop&w=800&q=80'),
    ('Port de Bordeaux',    'Bordeaux',    'France', '33', 'Nouvelle-Aquitaine',          44.840400, -0.570100, 'https://images.unsplash.com/photo-1482261748897-3288731f2ec5?auto=format&fit=crop&w=800&q=80')
    ON CONFLICT (name) DO NOTHING
  `);

  // Ports étrangers — affichés "Bientôt disponible" dans le carrousel
  // IDs : 6=Barcelone, 7=Valence, 8=Gênes, 9=Naples, 10=Split, 11=Athènes
  await prisma.$executeRawUnsafe(`
    INSERT INTO port (name, city, country, department, region, latitude, longitude, image_url) VALUES
    ('Port de Barcelone', 'Barcelone', 'Espagne', NULL, NULL, 41.356800,  2.188200, 'https://images.unsplash.com/photo-1591907303049-a5e5df26bcb9?auto=format&fit=crop&w=800&q=80'),
    ('Port de Valence',   'Valence',   'Espagne', NULL, NULL, 39.451800, -0.323200, 'https://images.unsplash.com/photo-1667990304125-0a719a004428?auto=format&fit=crop&w=800&q=80'),
    ('Port de Gênes',     'Gênes',     'Italie',  NULL, NULL, 44.398800,  8.957800, 'https://images.unsplash.com/photo-1756917894648-7a74e7aefd72?auto=format&fit=crop&w=800&q=80'),
    ('Port de Naples',    'Naples',    'Italie',  NULL, NULL, 40.842200, 14.268100, 'https://images.unsplash.com/photo-1567202170721-bd01fbdea30a?auto=format&fit=crop&w=800&q=80'),
    ('Port de Split',     'Split',     'Croatie', NULL, NULL, 43.508800, 16.440400, 'https://images.unsplash.com/photo-1715868815633-015b7dc5595f?auto=format&fit=crop&w=800&q=80'),
    ('Port du Pirée',     'Athènes',   'Grèce',   NULL, NULL, 37.945400, 23.641800, 'https://images.unsplash.com/photo-1747571443369-e21d1e2ce292?auto=format&fit=crop&w=800&q=80')
    ON CONFLICT (name) DO NOTHING
  `);

  // Boats
  // Ports : 1=Marseille, 2=La Rochelle, 3=Brest, 4=Nice, 5=Bordeaux, 6=Barcelone…
  await prisma.$executeRawUnsafe(`
    INSERT INTO boat (id_user, id_port, name, type, size, engine, with_skipper, daily_price, capacity, build_year, registration, description, is_published) VALUES
    (2, 4, 'Le Mistral',      'voilier',   12.50, 'Diesel 30cv',   FALSE, 350.00, 6,  2015, 'FR-NIC-001', 'Magnifique voilier idéal pour la Méditerranée. Équipé de tous les instruments modernes.',                  TRUE),
    (2, 1, 'Soleil Levant',   'catamaran', 14.00, 'Diesel 2x40cv', TRUE,  680.00, 8,  2018, 'FR-MRS-002', 'Catamaran spacieux avec skipper expérimenté. Parfait pour les familles et groupes.',                      TRUE),
    (3, 2, 'Atlantique',      'voilier',   10.00, 'Diesel 25cv',   FALSE, 280.00, 4,  2012, 'FR-LRO-003', 'Voilier sobre et fiable pour naviguer sur l''Atlantique. Idéal pour les amateurs confirmés.',            TRUE),
    (3, 5, 'L''Aquitaine',   'moteur',     9.50, 'Essence 150cv', TRUE,  420.00, 5,  2020, 'FR-BDX-004', 'Bateau à moteur rapide et puissant avec skipper en option, idéal pour les croisières sur la Gironde et le littoral atlantique.', TRUE),
    (4, 4, 'Belle de Nice',   'voilier',   13.00, 'Diesel 35cv',   TRUE,  390.00, 6,  2016, 'FR-NIC-005', 'Voilier élégant amarré à Nice, avec skipper disponible pour explorer la Côte d''Azur et ses criques.',                  TRUE),
    (4, 4, 'Côte d''Azur',   'catamaran', 15.50, 'Diesel 2x50cv', TRUE,  750.00, 10, 2021, 'FR-NIC-006', 'Grand catamaran de luxe avec skipper, départ de Nice. Vue imprenable sur la Côte d''Azur.',             TRUE),
    (5, 3, 'Finistère',       'voilier',   11.00, 'Diesel 28cv',   FALSE, 260.00, 5,  2014, 'FR-BRT-007', 'Voilier robuste taillé pour la Bretagne et ses eaux parfois agitées.',                                   TRUE),
    (5, 1, 'Camargue Spirit', 'catamaran', 11.00, 'Diesel 2x30cv', FALSE, 500.00, 6,  2017, 'FR-MRS-008', 'Catamaran confortable au départ de Marseille, idéal pour explorer la côte méditerranéenne et la Camargue.', FALSE)
    ON CONFLICT (registration) DO NOTHING
  `);

  // Bateaux additionnels
  // Ports : 1=Marseille, 2=La Rochelle, 3=Brest, 4=Nice, 5=Bordeaux, 6=Barcelone
  await prisma.$executeRawUnsafe(`
    INSERT INTO boat (id_user, id_port, name, type, size, engine, with_skipper, daily_price, capacity, build_year, registration, description, is_published) VALUES
    (2, 1, 'Voilier Océanis 40',     'voilier',   12.20, 'Diesel 28cv',   FALSE, 420.00,  6, 2019, 'FR-MRS-009', 'Voilier performant et confortable, idéal pour naviguer en Méditerranée.',                    TRUE),
    (3, 4, 'Catamaran Lagoon 42',    'catamaran', 12.80, 'Diesel 2x30cv', FALSE, 580.00,  8, 2020, 'FR-NIC-010', 'Catamaran moderne et spacieux, parfait pour des croisières en famille sur la Côte d''Azur.', TRUE),
    (4, 5, 'Péniche La Garonne',     'peniche',   18.00, 'Diesel 45cv',   FALSE, 180.00,  6, 2008, 'FR-BDX-011', 'Découvrez les vignobles bordelais depuis l''eau à bord de cette péniche chaleureuse.',      TRUE),
    (5, 2, 'Voilier Bénéteau First', 'voilier',    9.80, 'Diesel 22cv',   FALSE, 320.00,  4, 2017, 'FR-LRO-012', 'Voilier maniable et rapide pour explorer les îles de Ré et d''Oléron.',                    TRUE),
    (2, 3, 'Armor Voile',            'voilier',   11.50, 'Diesel 27cv',   FALSE, 290.00,  5, 2013, 'FR-BRT-013', 'Voilier robuste taillé pour les eaux bretonnes et les marées de la Bretagne Nord.',         TRUE),
    (3, 1, 'Catamaran Méditerranée', 'catamaran', 14.50, 'Diesel 2x45cv', TRUE,  650.00, 10, 2022, 'ES-BCN-014', 'Grand catamaran avec skipper au départ de Marseille. Explorez les calanques et la Méditerranée.', TRUE),
    (4, 4, 'Voilier de Régate',      'voilier',   10.50, 'Diesel 24cv',   FALSE, 310.00,  4, 2018, 'FR-NIC-015', 'Voilier rapide et nerveux, taillé pour la compétition et les sensations fortes.',           TRUE),
    (5, 4, 'Catamaran Prestige',     'catamaran', 16.00, 'Diesel 2x60cv', TRUE,  850.00, 12, 2023, 'FR-NIC-016', 'Catamaran de luxe avec skipper, prestations haut de gamme pour une croisière d''exception.',  TRUE),
    (2, 5, 'Péniche Fluviale Adour', 'peniche',   20.00, 'Diesel 50cv',   FALSE, 220.00,  8, 2010, 'FR-BDX-017', 'Explorez la France par ses voies navigables à bord de cette péniche confortable.',          FALSE)
    ON CONFLICT (registration) DO NOTHING
  `);

  // Bookings
  await prisma.$executeRawUnsafe(`
    INSERT INTO booking (id_user, id_boat, start_date, end_date, status, total_amount, booking_date) VALUES
    ( 6, 1, '2025-07-01', '2025-07-08', 'confirmed',  2450.00, '2025-05-10 09:30:00'),
    ( 7, 2, '2025-07-15', '2025-07-22', 'confirmed',  4760.00, '2025-05-12 14:00:00'),
    ( 8, 3, '2025-08-01', '2025-08-05', 'pending',    1120.00, '2025-06-01 10:00:00'),
    ( 6, 4, '2025-08-10', '2025-08-14', 'cancelled',  1680.00, '2025-06-20 16:00:00'),
    ( 7, 1, '2025-09-01', '2025-09-05', 'confirmed',  1400.00, '2025-07-15 11:00:00'),
    ( 9, 2, '2025-09-10', '2025-09-13', 'refused',    2040.00, '2025-07-20 08:00:00'),
    (10, 5, '2025-07-20', '2025-07-27', 'confirmed',  2730.00, '2025-06-01 10:00:00'),
    (11, 6, '2025-08-05', '2025-08-12', 'confirmed',  5250.00, '2025-06-10 09:00:00'),
    (12, 7, '2025-07-10', '2025-07-14', 'confirmed',  1040.00, '2025-05-25 14:00:00'),
    (13, 3, '2025-10-01', '2025-10-04', 'pending',     840.00, '2025-08-01 11:00:00'),
    ( 8, 5, '2025-11-01', '2025-11-03', 'confirmed',   780.00, '2025-09-05 16:00:00'),
    ( 9, 7, '2025-06-15', '2025-06-20', 'confirmed',  1300.00, '2025-04-20 10:00:00'),
    (10, 1, '2025-12-01', '2025-12-05', 'pending',    1400.00, '2025-10-10 08:30:00'),
    (11, 4, '2025-10-10', '2025-10-13', 'cancelled',  1260.00, '2025-08-15 13:00:00'),
    -- Réservations à venir (pour visualiser « Prochaine réservation » / « Réservations en cours »).
    ( 6, 1, '2026-07-05', '2026-07-12', 'confirmed',  2450.00, '2026-05-15 09:00:00'),
    ( 6, 6, '2026-09-01', '2026-09-06', 'confirmed',  3750.00, '2026-06-01 10:00:00'),
    ( 7, 2, '2026-08-10', '2026-08-17', 'confirmed',  4760.00, '2026-05-20 14:00:00'),
    (10, 5, '2026-07-20', '2026-07-25', 'confirmed',  1950.00, '2026-06-05 11:00:00'),
    (11, 7, '2026-09-15', '2026-09-20', 'confirmed',  1300.00, '2026-06-10 09:30:00'),
    (12, 3, '2026-07-01', '2026-07-05', 'pending',    1120.00, '2026-06-12 16:00:00')
    ON CONFLICT DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE booking SET cancellation_reason = 'Changement de plans personnels', cancellation_date = '2025-06-25 10:00:00' WHERE id_booking = 4
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE booking SET cancellation_reason = 'Problème de santé', cancellation_date = '2025-08-20 09:00:00' WHERE id_booking = 14
  `);

  // Payments
  await prisma.$executeRawUnsafe(`
    INSERT INTO payment (id_booking, amount, commission, payment_date, payment_method, status, transaction_ref) VALUES
    ( 1, 2450.00, 245.00, '2025-05-10 09:35:00', 'card',          'success', 'TXN-2025-0001'),
    ( 2, 4760.00, 476.00, '2025-05-12 14:05:00', 'bank_transfer', 'success', 'TXN-2025-0002'),
    ( 5, 1400.00, 140.00, '2025-07-15 11:05:00', 'card',          'success', 'TXN-2025-0003'),
    ( 7, 2730.00, 273.00, '2025-06-01 10:10:00', 'card',          'success', 'TXN-2025-0004'),
    ( 8, 5250.00, 525.00, '2025-06-10 09:10:00', 'bank_transfer', 'success', 'TXN-2025-0005'),
    ( 9, 1040.00, 104.00, '2025-05-25 14:10:00', 'card',          'success', 'TXN-2025-0006'),
    (11,  780.00,  78.00, '2025-09-05 16:10:00', 'card',          'success', 'TXN-2025-0007'),
    (12, 1300.00, 130.00, '2025-04-20 10:10:00', 'bank_transfer', 'success', 'TXN-2025-0008')
    ON CONFLICT (transaction_ref) DO NOTHING
  `);

  // Paiements remboursés suite aux annulations (la commission SailingLoc est
  // conservée : refunded_amount = montant hors commission).
  await prisma.$executeRawUnsafe(`
    INSERT INTO payment (id_booking, amount, commission, payment_date, payment_method, status, transaction_ref, refunded_amount, refunded_at, refund_reason) VALUES
    ( 4, 1680.00, 168.00, '2025-06-21 13:00:00', 'card',          'refunded', 'TXN-2025-1004', 1680.00, '2025-06-25 10:00:00', 'Changement de plans personnels'),
    (14, 1260.00, 126.00, '2025-08-16 11:00:00', 'card',          'refunded', 'TXN-2025-1014', 1260.00, '2025-08-20 09:00:00', 'Problème de santé')
    ON CONFLICT (transaction_ref) DO NOTHING
  `);

  // Documents
  await prisma.$executeRawUnsafe(`
    INSERT INTO document (id_user, type, file_name, file_url, upload_date, status) VALUES
    -- Propriétaires : permis, assurance, cv_marin, acte_francisation (plusieurs possibles)
    (2,  'permis',            'permis_luc_martin.pdf',           'https://storage.sailingloc.fr/docs/permis_luc_martin.pdf',           '2025-01-15 10:00:00', 'validated'),
    (2,  'assurance',         'assurance_le_mistral.pdf',        'https://storage.sailingloc.fr/docs/assurance_le_mistral.pdf',        '2025-01-15 10:05:00', 'validated'),
    (2,  'cv_marin',          'cv_marin_luc_martin.pdf',         'https://storage.sailingloc.fr/docs/cv_marin_luc_martin.pdf',         '2025-01-15 10:10:00', 'validated'),
    (2,  'acte_francisation', 'francisation_le_mistral.pdf',     'https://storage.sailingloc.fr/docs/francisation_le_mistral.pdf',     '2025-01-15 10:15:00', 'validated'),
    (2,  'acte_francisation', 'francisation_soleil_levant.pdf',  'https://storage.sailingloc.fr/docs/francisation_soleil_levant.pdf',  '2025-01-16 09:00:00', 'pending'),
    (3,  'permis',            'permis_claire_dupont.pdf',        'https://storage.sailingloc.fr/docs/permis_claire_dupont.pdf',        '2025-02-20 09:00:00', 'validated'),
    (3,  'assurance',         'assurance_atlantique.pdf',        'https://storage.sailingloc.fr/docs/assurance_atlantique.pdf',        '2025-02-20 09:05:00', 'pending'),
    (3,  'cv_marin',          'cv_marin_claire_dupont.pdf',      'https://storage.sailingloc.fr/docs/cv_marin_claire_dupont.pdf',      '2025-02-20 09:10:00', 'validated'),
    (3,  'acte_francisation', 'francisation_atlantique.pdf',     'https://storage.sailingloc.fr/docs/francisation_atlantique.pdf',     '2025-02-20 09:15:00', 'validated'),
    (4,  'permis',            'permis_pierre_renaud.pdf',        'https://storage.sailingloc.fr/docs/permis_pierre_renaud.pdf',        '2025-03-10 08:00:00', 'validated'),
    (4,  'assurance',         'assurance_belle_de_cannes.pdf',   'https://storage.sailingloc.fr/docs/assurance_belle_de_cannes.pdf',   '2025-03-10 08:10:00', 'validated'),
    (4,  'acte_francisation', 'francisation_belle_de_cannes.pdf','https://storage.sailingloc.fr/docs/francisation_belle_de_cannes.pdf','2025-03-10 08:15:00', 'validated'),
    (5,  'permis',            'permis_isabelle_faure.pdf',       'https://storage.sailingloc.fr/docs/permis_isabelle_faure.pdf',       '2025-04-05 11:00:00', 'pending'),
    (5,  'assurance',         'assurance_finistere.pdf',         'https://storage.sailingloc.fr/docs/assurance_finistere.pdf',         '2025-04-05 11:10:00', 'refused'),
    -- Locataires : permis_conduire, piece_identite, cv_nautique
    (6,  'permis_conduire',   'permis_thomas_bernard.pdf',       'https://storage.sailingloc.fr/docs/permis_thomas_bernard.pdf',       '2025-04-01 08:00:00', 'validated'),
    (6,  'piece_identite',    'cni_thomas_bernard.pdf',          'https://storage.sailingloc.fr/docs/cni_thomas_bernard.pdf',          '2025-04-01 08:05:00', 'validated'),
    (6,  'cv_nautique',       'cv_nautique_thomas_bernard.pdf',  'https://storage.sailingloc.fr/docs/cv_nautique_thomas_bernard.pdf',  '2025-04-01 08:10:00', 'pending'),
    (7,  'piece_identite',    'cni_sophie_lefevre.pdf',          'https://storage.sailingloc.fr/docs/cni_sophie_lefevre.pdf',          '2025-04-10 11:00:00', 'validated'),
    (7,  'permis_conduire',   'permis_sophie_lefevre.pdf',       'https://storage.sailingloc.fr/docs/permis_sophie_lefevre.pdf',       '2025-04-10 11:05:00', 'validated'),
    (8,  'permis_conduire',   'permis_jules_moreau.pdf',         'https://storage.sailingloc.fr/docs/permis_jules_moreau.pdf',         '2025-05-01 14:00:00', 'validated'),
    (9,  'piece_identite',    'cni_camille_girard.pdf',          'https://storage.sailingloc.fr/docs/cni_camille_girard.pdf',          '2025-05-15 09:00:00', 'pending'),
    (10, 'piece_identite',    'cni_antoine_rousseau.pdf',        'https://storage.sailingloc.fr/docs/cni_antoine_rousseau.pdf',        '2025-05-20 10:00:00', 'validated'),
    (10, 'permis_conduire',   'permis_antoine_rousseau.pdf',     'https://storage.sailingloc.fr/docs/permis_antoine_rousseau.pdf',     '2025-05-20 10:05:00', 'validated'),
    (11, 'piece_identite',    'cni_marie_lambert.pdf',           'https://storage.sailingloc.fr/docs/cni_marie_lambert.pdf',           '2025-06-01 08:30:00', 'validated'),
    (12, 'piece_identite',    'cni_kevin_blanc.pdf',             'https://storage.sailingloc.fr/docs/cni_kevin_blanc.pdf',             '2025-06-05 09:00:00', 'refused'),
    (13, 'piece_identite',    'cni_lucie_chevalier.pdf',         'https://storage.sailingloc.fr/docs/cni_lucie_chevalier.pdf',         '2025-07-01 15:00:00', 'pending')
    ON CONFLICT DO NOTHING
  `);

  // Messages
  await prisma.$executeRawUnsafe(`
    INSERT INTO message (id_sender, id_receiver, content, sent_at, is_read, read_at) VALUES
    ( 6,  2, 'Bonjour, le Mistral est-il disponible la première semaine de juillet ?',                        '2025-05-09 10:00:00', TRUE,  '2025-05-09 11:00:00'),
    ( 2,  6, 'Bonjour Thomas, oui tout à fait, n''hésitez pas à réserver !',                                 '2025-05-09 11:30:00', TRUE,  '2025-05-09 12:00:00'),
    ( 7,  3, 'Bonsoir, est-ce que le catamaran inclut le matériel de snorkeling ?',                           '2025-05-11 18:00:00', TRUE,  '2025-05-11 19:00:00'),
    ( 3,  7, 'Bonsoir Sophie, oui le matériel est inclus. Bonne navigation !',                                '2025-05-11 19:30:00', TRUE,  '2025-05-11 20:00:00'),
    ( 8,  3, 'Bonjour, puis-je apporter mon chien à bord de l''Atlantique ?',                                 '2025-05-31 09:00:00', TRUE,  '2025-06-01 08:00:00'),
    ( 3,  8, 'Bonjour Jules, malheureusement les animaux ne sont pas acceptés à bord.',                       '2025-06-01 09:00:00', TRUE,  '2025-06-01 10:00:00'),
    ( 6,  2, 'Merci pour la belle semaine, le bateau était impeccable !',                                     '2025-07-09 10:00:00', TRUE,  '2025-07-09 14:00:00'),
    ( 2,  6, 'Merci à vous Thomas, j''espère vous revoir l''année prochaine !',                               '2025-07-09 15:00:00', TRUE,  '2025-07-10 08:00:00'),
    (10,  4, 'Bonjour Pierre, est-il possible de louer la Belle de Nice avec un départ le 20 juillet ?',    '2025-05-30 14:00:00', TRUE,  '2025-05-30 16:00:00'),
    ( 4, 10, 'Bonjour Antoine, c''est possible, je vous confirme la disponibilité !',                         '2025-05-30 17:00:00', TRUE,  '2025-05-31 08:00:00'),
    (11,  5, 'Bonjour, combien de couchettes sur le Côte d''Azur ?',                                         '2025-06-08 10:00:00', TRUE,  '2025-06-08 12:00:00'),
    ( 5, 11, 'Bonjour Marie, le bateau dispose de 4 cabines doubles et 2 simples.',                           '2025-06-08 12:30:00', TRUE,  '2025-06-08 14:00:00'),
    (12,  4, 'Bonjour, y a-t-il un GPS à bord du Finistère ?',                                               '2025-05-24 09:00:00', TRUE,  '2025-05-24 11:00:00'),
    ( 4, 12, 'Bonjour Kevin, oui un GPS chartplotter tactile est disponible à bord.',                         '2025-05-24 11:30:00', FALSE, NULL),
    (13,  3, 'Bonjour, l''Atlantique est-il adapté aux débutants ?',                                          '2025-07-30 16:00:00', FALSE, NULL)
    ON CONFLICT DO NOTHING
  `);

  // Reviews
  await prisma.$executeRawUnsafe(`
    INSERT INTO review (id_user, id_booking, rating, comment, status, created_at) VALUES
    ( 6,  1, 5, 'Superbe semaine à bord du Mistral, bateau en parfait état et propriétaire très accueillant !',     'validated', '2025-07-09 10:00:00'),
    ( 7,  2, 4, 'Très beau catamaran, skipper professionnel et sympa. Un peu cher mais ça valait largement.',        'validated', '2025-07-23 14:00:00'),
    ( 7,  5, 5, 'Deuxième location sur Le Mistral, toujours aussi parfait. Je recommande vivement !',                'validated', '2025-09-06 09:00:00'),
    (10,  7, 4, 'Belle de Nice est un voilier magnifique, très bien entretenu. Pierre est un super propriétaire.',   'validated', '2025-07-28 11:00:00'),
    (11,  8, 5, 'Le Côte d''Azur est exceptionnel ! Skipper au top, luxe et confort au rendez-vous.',               'validated', '2025-08-13 17:00:00'),
    (12,  9, 3, 'Finistère correct mais quelques petits équipements à revoir. Expérience globalement positive.',     'pending',   '2025-07-15 08:00:00'),
    ( 9, 12, 5, 'Superbe balade avec le Finistère, parfait pour la Bretagne. Je reviendrai !',                       'validated', '2025-06-21 16:00:00'),
    ( 8, 11, 4, 'Belle de Nice très agréable pour un week-end. Tout était propre et bien rangé.',                    'pending',   '2025-11-04 10:00:00')
    ON CONFLICT DO NOTHING
  `);

  // Bookings supplémentaires pour diversifier les avis
  await prisma.$executeRawUnsafe(`
    INSERT INTO booking (id_user, id_boat, start_date, end_date, status, total_amount, booking_date) VALUES
    ( 6,  9, '2025-03-01', '2025-03-06', 'confirmed', 2100.00, '2025-01-15 10:00:00'),
    ( 7, 10, '2025-04-10', '2025-04-16', 'confirmed', 3480.00, '2025-02-20 14:00:00'),
    ( 8, 12, '2025-05-05', '2025-05-09', 'confirmed', 1280.00, '2025-03-10 09:00:00'),
    ( 9,  7, '2025-02-15', '2025-02-20', 'confirmed', 1300.00, '2024-12-01 11:00:00'),
    (10,  3, '2025-01-10', '2025-01-15', 'confirmed', 1400.00, '2024-11-20 08:00:00'),
    (11,  1, '2024-12-20', '2024-12-27', 'confirmed', 2450.00, '2024-10-15 10:00:00'),
    (12,  5, '2024-11-05', '2024-11-10', 'confirmed', 1950.00, '2024-09-20 15:00:00'),
    (13,  6, '2024-10-01', '2024-10-08', 'confirmed', 5250.00, '2024-08-15 13:00:00'),
    ( 6, 14, '2025-06-01', '2025-06-08', 'confirmed', 4550.00, '2025-04-01 09:00:00'),
    ( 7,  4, '2025-04-20', '2025-04-24', 'confirmed', 1680.00, '2025-02-28 16:00:00'),
    ( 8,  2, '2024-09-05', '2024-09-12', 'confirmed', 4760.00, '2024-07-10 10:00:00'),
    ( 9, 15, '2026-01-15', '2026-01-20', 'confirmed', 1550.00, '2025-11-01 08:00:00')
    ON CONFLICT DO NOTHING
  `);

  // Avis supplémentaires — notes variées (1 à 5) et dates étalées sur 2024-2026
  await prisma.$executeRawUnsafe(`
    INSERT INTO review (id_user, id_booking, rating, comment, status, created_at) VALUES
    ( 6, 15, 2, 'Déçu par l''état général du bateau, plusieurs équipements défaillants lors de notre séjour.',              'validated', '2025-03-07 10:00:00'),
    ( 7, 16, 5, 'Catamaran absolument magnifique, vue époustouflante sur la Côte d''Azur. Je reviendrai sans hésiter !',    'validated', '2025-04-17 09:00:00'),
    ( 8, 17, 1, 'Bateau en très mauvais état, rien ne correspondait à l''annonce. Expérience vraiment décevante.',          'validated', '2025-05-10 14:00:00'),
    ( 9, 18, 4, 'Très agréable séjour en Bretagne, bateau fiable et bien équipé. Propriétaire très sympathique.',           'validated', '2025-02-21 16:00:00'),
    (10, 19, 3, 'Location correcte mais quelques défauts à signaler. Dans l''ensemble acceptable sans être exceptionnel.',   'validated', '2025-01-16 11:00:00'),
    (11, 20, 5, 'Noël en mer absolument inoubliable, bateau impeccable et propriétaire aux petits soins. Bravo !',          'validated', '2024-12-28 10:00:00'),
    (12, 21, 1, 'Expérience très décevante, bateau sale et mal entretenu. Je déconseille fortement cette location.',        'validated', '2024-11-11 08:00:00'),
    (13, 22, 2, 'Communication difficile avec le propriétaire, prestation bien en deçà de ce qui était annoncé.',           'validated', '2024-10-09 15:00:00'),
    ( 6, 23, 5, 'Magnifique croisière en Méditerranée, skipper au top et bateau luxueux. Une expérience parfaite !',        'validated', '2025-06-09 17:00:00'),
    ( 7, 24, 4, 'Beau bateau à moteur idéal pour les excursions côtières. Propriétaire réactif et très disponible.',       'validated', '2025-04-25 11:00:00'),
    ( 8, 25, 3, 'Bonne semaine dans l''ensemble, quelques petits points à améliorer mais rien de rédhibitoire.',            'validated', '2024-09-13 09:00:00'),
    ( 9, 26, 5, 'Excellente location en début d''année, parfait pour s''évader du quotidien. Fortement recommandé !',      'validated', '2026-01-21 13:00:00')
    ON CONFLICT DO NOTHING
  `);

  // Bookings de propriétaires (ils louent des bateaux qu'ils ne possèdent pas)
  await prisma.$executeRawUnsafe(`
    INSERT INTO booking (id_user, id_boat, start_date, end_date, status, total_amount, booking_date) VALUES
    (2, 6,  '2025-03-10', '2025-03-15', 'confirmed', 3750.00, '2025-01-20 10:00:00'),
    (3, 7,  '2025-04-15', '2025-04-20', 'confirmed', 1300.00, '2025-02-10 09:00:00'),
    (4, 2,  '2025-05-20', '2025-05-25', 'confirmed', 3400.00, '2025-03-15 14:00:00'),
    (5, 3,  '2025-06-10', '2025-06-15', 'confirmed', 1400.00, '2025-04-05 11:00:00')
    ON CONFLICT DO NOTHING
  `);

  // Avis de propriétaires
  // NB : id_booking pointe sur les réservations créées juste au-dessus (bloc
  // "Bookings de propriétaires", IDs 33-36) — avant correction ces avis
  // référençaient à tort 27-30 (des réservations d'un tout autre lot) et se
  // retrouvaient donc comptés sur les mauvais bateaux.
  await prisma.$executeRawUnsafe(`
    INSERT INTO review (id_user, id_booking, rating, comment, status, created_at) VALUES
    (2, 33, 5, 'Catamaran de rêve, vue époustouflante sur la Côte d''Azur. En tant que propriétaire moi-même, j''apprécie vraiment le soin apporté à l''entretien.', 'validated', '2025-03-16 10:00:00'),
    (3, 34, 4, 'Superbe voilier breton, robuste et parfaitement équipé pour des eaux parfois agitées. Une belle découverte !',                                        'validated', '2025-04-21 09:00:00'),
    (4, 35, 5, 'Le Soleil Levant est un catamaran exceptionnel. Luc a fait un travail remarquable sur l''entretien et l''accueil. Je recommande vivement.',          'validated', '2025-05-26 14:00:00'),
    (5, 36, 4, 'Très belle expérience sur l''Atlantique. Claire est une hôte formidable, voilier en parfait état. Je repars avec de beaux souvenirs.',               'validated', '2025-06-16 11:00:00')
    ON CONFLICT DO NOTHING
  `);

  // Bookings + avis pour la Péniche La Garonne (boat 11) — manquants dans les lots précédents
  await prisma.$executeRawUnsafe(`
    INSERT INTO booking (id_user, id_boat, start_date, end_date, status, total_amount, booking_date) VALUES
    ( 9, 11, '2025-06-01', '2025-06-08', 'confirmed', 1260.00, '2025-04-10 11:00:00'),
    (12, 11, '2025-08-10', '2025-08-15', 'confirmed',  900.00, '2025-06-20 14:00:00')
    ON CONFLICT DO NOTHING
  `);

  // NB : id_booking pointait à tort sur 31/32 (réservations des boats 2 et 15,
  // d'un autre lot) au lieu de 37/38, les vraies réservations du boat 11 créées
  // juste au-dessus — même bug de dérive d'IDs que les autres blocs corrigés.
  await prisma.$executeRawUnsafe(`
    INSERT INTO review (id_user, id_booking, rating, comment, status, created_at) VALUES
    ( 9, 37, 4, 'Très agréable séjour fluvial, péniche bien équipée et parfaite pour découvrir les vignobles bordelais en famille.', 'validated', '2025-06-09 10:00:00'),
    (12, 38, 5, 'Expérience inoubliable sur la Garonne ! Péniche spacieuse, confortable, je recommande vivement.', 'validated', '2025-08-16 09:00:00')
    ON CONFLICT DO NOTHING
  `);

  // Images de profil utilisateurs (tous les 13 comptes)
  await prisma.$executeRawUnsafe(`
    INSERT INTO image (id_boat, id_user, url, type, "order") VALUES
    (NULL,  1, 'https://randomuser.me/api/portraits/men/1.jpg',    'profil', 0),
    (NULL,  2, 'https://randomuser.me/api/portraits/men/32.jpg',   'profil', 0),
    (NULL,  3, 'https://randomuser.me/api/portraits/women/44.jpg', 'profil', 0),
    (NULL,  4, 'https://randomuser.me/api/portraits/men/55.jpg',   'profil', 0),
    (NULL,  5, 'https://randomuser.me/api/portraits/women/35.jpg', 'profil', 0),
    (NULL,  6, 'https://randomuser.me/api/portraits/men/23.jpg',   'profil', 0),
    (NULL,  7, 'https://randomuser.me/api/portraits/women/17.jpg', 'profil', 0),
    (NULL,  8, 'https://randomuser.me/api/portraits/men/45.jpg',   'profil', 0),
    (NULL,  9, 'https://randomuser.me/api/portraits/women/62.jpg', 'profil', 0),
    (NULL, 10, 'https://randomuser.me/api/portraits/men/67.jpg',   'profil', 0),
    (NULL, 11, 'https://randomuser.me/api/portraits/women/28.jpg', 'profil', 0),
    (NULL, 12, 'https://randomuser.me/api/portraits/men/78.jpg',   'profil', 0),
    (NULL, 13, 'https://randomuser.me/api/portraits/women/91.jpg', 'profil', 0)
    ON CONFLICT DO NOTHING
  `);

  // Favorites
  await prisma.$executeRawUnsafe(`
    INSERT INTO user_boat_favorite (id_user, id_boat) VALUES
    ( 6, 2), ( 6, 5), ( 7, 1), ( 7, 6), ( 8, 3), ( 8, 7), ( 9, 4), ( 9, 6),
    (10, 1), (10, 5), (11, 2), (11, 6), (12, 7), (13, 3), (13, 5)
    ON CONFLICT (id_user, id_boat) DO NOTHING
  `);

  // Booking documents
  await prisma.$executeRawUnsafe(`
    -- Lie chaque réservation à la pièce d'identité du locataire concerné.
    INSERT INTO booking_document (id_booking, id_document) VALUES
    (1, 16), (2, 18), (5, 18), (6, 21), (7, 22), (8, 24), (9, 25), (12, 21)
    ON CONFLICT (id_booking, id_document) DO NOTHING
  `);

  // Signalements de bateaux
  await prisma.$executeRawUnsafe(`
    INSERT INTO boat_report (id_boat, id_user, reason, status) VALUES
    (1, 7,  'Équipements de sécurité signalés manquants lors de la visite.', 'resolved'),
    (2, 6,  'Les photos ne correspondent pas au bateau réel.',               'pending'),
    (2, 9,  'Bateau indisponible à la date pourtant affichée libre.',        'pending'),
    (3, 9,  'Prix trompeur : des frais non annoncés ont été demandés.',      'pending'),
    (3, 11, 'Description mensongère sur la capacité du bateau.',             'dismissed'),
    (4, 10, 'Annonce en double avec une autre déjà en ligne.',              'dismissed'),
    (5, 12, 'Le propriétaire demande à payer hors plateforme.',             'pending'),
    (6, 11, 'Annonce suspecte, le propriétaire reste injoignable.',          'pending'),
    (7, 13, 'Comportement déplacé du propriétaire lors de l''échange.',     'resolved'),
    (8, 8,  'Bateau non conforme aux caractéristiques annoncées.',           'pending')
    ON CONFLICT DO NOTHING
  `);

  // Litiges sur réservations
  await prisma.$executeRawUnsafe(`
    INSERT INTO dispute (id_booking, id_user, reason, status, resolution) VALUES
    (1,  6,  'Le bateau présentait des dommages non signalés à la remise des clés.', 'open',     NULL),
    (2,  7,  'Prestation skipper absente alors qu''elle était incluse, remboursement partiel demandé.', 'open', NULL),
    (7,  10, 'Caution non restituée par le propriétaire après la location.',         'open',     NULL),
    (8,  11, 'Annulation tardive du propriétaire, frais de transport engagés.',      'resolved', 'Remboursement intégral effectué par la plateforme.'),
    (12, 9,  'Désaccord sur l''état de propreté du bateau à la livraison.',          'rejected', 'Photos fournies non probantes, litige écarté.')
    ON CONFLICT DO NOTHING
  `);

  // Disponibilités des bateaux (carrousel "liste des produits")
  // Bateaux publiés : 1-7, 9-16. Bateaux non publiés : 8, 17 (pas de dispo affichée).
  // price_override NULL = utiliser le daily_price du bateau.
  await prisma.$executeRawUnsafe(`
    INSERT INTO boat_availability (id_boat, start_date, end_date, is_available, price_override, notes) VALUES
    -- Le Mistral (voilier, Nice)
    (1, '2026-07-01', '2026-07-31', TRUE,  NULL,   'Disponible tout juillet'),
    (1, '2026-08-01', '2026-08-31', TRUE,  390.00, 'Tarif haute saison août'),
    (1, '2026-09-01', '2026-10-31', TRUE,  NULL,   'Arrière-saison disponible'),
    -- Soleil Levant (catamaran, Marseille)
    (2, '2026-07-05', '2026-07-19', TRUE,  NULL,   'Semaines disponibles'),
    (2, '2026-08-10', '2026-08-31', TRUE,  750.00, 'Haute saison — tarif majoré'),
    (2, '2026-09-01', '2026-09-30', TRUE,  NULL,   'Septembre en mer'),
    -- Atlantique (voilier, La Rochelle)
    (3, '2026-07-01', '2026-08-31', TRUE,  NULL,   'Été complet disponible'),
    (3, '2026-10-01', '2026-10-31', TRUE,  250.00, 'Week-ends d''automne'),
    -- L'Aquitaine (moteur, Bordeaux)
    (4, '2026-07-01', '2026-07-14', TRUE,  NULL,   'Première quinzaine de juillet'),
    (4, '2026-07-28', '2026-08-31', TRUE,  460.00, 'Haute saison'),
    (4, '2026-09-01', '2026-09-30', TRUE,  NULL,   'Croisières côtières septembre'),
    -- Belle de Nice (voilier, Nice)
    (5, '2026-07-01', '2026-07-31', TRUE,  NULL,   'Juillet disponible'),
    (5, '2026-08-15', '2026-08-31', TRUE,  430.00, 'Fin août — Côte d''Azur'),
    (5, '2026-09-01', '2026-09-30', TRUE,  NULL,   'Arrière-saison azuréenne'),
    -- Côte d''Azur (catamaran, Nice)
    (6, '2026-07-01', '2026-07-31', TRUE,  NULL,   'Juillet — réservez tôt'),
    (6, '2026-08-01', '2026-08-31', TRUE,  820.00, 'Haute saison — prix premium'),
    (6, '2026-09-01', '2026-10-15', TRUE,  NULL,   'Septembre-octobre disponible'),
    -- Finistère (voilier, Brest)
    (7, '2026-07-01', '2026-08-31', TRUE,  NULL,   'Saison bretonne'),
    (7, '2026-09-01', '2026-09-30', TRUE,  240.00, 'Cap Finistère en automne'),
    -- Voilier Océanis 40 (Marseille)
    (9, '2026-07-01', '2026-07-31', TRUE,  NULL,   'Juillet disponible'),
    (9, '2026-08-01', '2026-08-31', TRUE,  460.00, 'Haute saison'),
    (9, '2026-09-01', '2026-10-31', TRUE,  NULL,   'Arrière-saison méditerranéenne'),
    -- Catamaran Lagoon 42 (Nice)
    (10, '2026-07-01', '2026-08-31', TRUE, NULL,   'Été sur la Côte d''Azur'),
    (10, '2026-09-01', '2026-09-30', TRUE, 550.00, 'Septembre en Méditerranée'),
    -- Péniche La Garonne (Bordeaux)
    (11, '2026-07-01', '2026-08-31', TRUE, NULL,   'Croisières fluviales estivales'),
    (11, '2026-09-01', '2026-11-30', TRUE, NULL,   'Vendanges et tourisme automnal'),
    -- Voilier Bénéteau First (La Rochelle)
    (12, '2026-07-01', '2026-08-31', TRUE, NULL,   'Îles de Ré et Oléron'),
    (12, '2026-09-01', '2026-10-15', TRUE, 290.00, 'Arrière-saison atlantique'),
    -- Armor Voile (Brest)
    (13, '2026-07-01', '2026-08-31', TRUE, NULL,   'Bretagne Nord en été'),
    (13, '2026-09-01', '2026-09-30', TRUE, 270.00, 'Septembre breton'),
    -- Catamaran Méditerranée (Marseille)
    (14, '2026-07-01', '2026-08-31', TRUE, NULL,   'Calanques — été'),
    (14, '2026-09-01', '2026-10-31', TRUE, 600.00, 'Automne méditerranéen'),
    -- Voilier de Régate (Nice)
    (15, '2026-07-01', '2026-08-31', TRUE, NULL,   'Régates et croisières'),
    (15, '2026-09-01', '2026-09-30', TRUE, 280.00, 'Septembre en PACA'),
    -- Catamaran Prestige (Nice)
    (16, '2026-07-01', '2026-07-31', TRUE, NULL,   'Juillet prestige'),
    (16, '2026-08-01', '2026-08-31', TRUE, 920.00, 'Haute saison — expérience premium'),
    (16, '2026-09-01', '2026-10-15', TRUE, NULL,   'Arrière-saison luxueuse')
    ON CONFLICT DO NOTHING
  `);

  // Équipements des bateaux (fiche produit / carrousel)
  // Catégories : navigation, sécurité, confort, cuisine, divertissement
  await prisma.$executeRawUnsafe(`
    INSERT INTO boat_equipment (id_boat, category, name) VALUES
    -- Boat 1 : Le Mistral (voilier 12.5m)
    (1, 'navigation',     'GPS chartplotter tactile'),
    (1, 'navigation',     'VHF radio'),
    (1, 'navigation',     'Pilote automatique'),
    (1, 'navigation',     'Sondeur'),
    (1, 'sécurité',       'Gilets de sauvetage x6'),
    (1, 'sécurité',       'Radeau de survie 6 personnes'),
    (1, 'sécurité',       'Extincteurs'),
    (1, 'confort',        'Douche de cockpit'),
    (1, 'cuisine',        'Cuisinière à gaz 2 feux'),
    (1, 'cuisine',        'Réfrigérateur 50L'),
    -- Boat 2 : Soleil Levant (catamaran 14m)
    (2, 'navigation',     'GPS chartplotter tactile'),
    (2, 'navigation',     'VHF radio'),
    (2, 'navigation',     'Pilote automatique'),
    (2, 'navigation',     'AIS'),
    (2, 'sécurité',       'Gilets de sauvetage x8'),
    (2, 'sécurité',       'Radeau de survie 8 personnes'),
    (2, 'sécurité',       'EPIRB'),
    (2, 'confort',        'Air conditionné'),
    (2, 'confort',        'Douche extérieure'),
    (2, 'cuisine',        'Cuisinière à gaz 3 feux'),
    (2, 'cuisine',        'Réfrigérateur 80L'),
    (2, 'cuisine',        'Micro-ondes'),
    (2, 'divertissement', 'Enceinte Bluetooth'),
    (2, 'divertissement', 'Masques et tubas x4'),
    -- Boat 3 : Atlantique (voilier 10m)
    (3, 'navigation',     'GPS chartplotter'),
    (3, 'navigation',     'VHF radio'),
    (3, 'sécurité',       'Gilets de sauvetage x4'),
    (3, 'sécurité',       'Extincteurs'),
    (3, 'sécurité',       'Feux de détresse'),
    (3, 'confort',        'WC marin'),
    (3, 'cuisine',        'Cuisinière à gaz 2 feux'),
    (3, 'cuisine',        'Réfrigérateur 40L'),
    -- Boat 4 : Euskal Herria (moteur 9.5m)
    (4, 'navigation',     'GPS chartplotter'),
    (4, 'navigation',     'VHF radio'),
    (4, 'navigation',     'Sondeur'),
    (4, 'sécurité',       'Gilets de sauvetage x5'),
    (4, 'sécurité',       'Extincteurs'),
    (4, 'sécurité',       'EPIRB'),
    (4, 'confort',        'Bimini (protection solaire)'),
    (4, 'cuisine',        'Réfrigérateur 30L'),
    (4, 'divertissement', 'Enceinte Bluetooth'),
    -- Boat 5 : Belle de Nice (voilier 13m)
    (5, 'navigation',     'GPS chartplotter tactile'),
    (5, 'navigation',     'VHF radio'),
    (5, 'navigation',     'Pilote automatique'),
    (5, 'navigation',     'AIS'),
    (5, 'sécurité',       'Gilets de sauvetage x6'),
    (5, 'sécurité',       'Radeau de survie 6 personnes'),
    (5, 'sécurité',       'EPIRB'),
    (5, 'confort',        'Douche de cockpit'),
    (5, 'confort',        'WC marin'),
    (5, 'cuisine',        'Cuisinière à gaz 3 feux'),
    (5, 'cuisine',        'Réfrigérateur 60L'),
    (5, 'divertissement', 'Masques et tubas x4'),
    -- Boat 6 : Côte d''Azur (catamaran 15.5m — luxe)
    (6, 'navigation',     'GPS chartplotter tactile'),
    (6, 'navigation',     'VHF radio'),
    (6, 'navigation',     'Pilote automatique'),
    (6, 'navigation',     'AIS'),
    (6, 'navigation',     'Radar'),
    (6, 'sécurité',       'Gilets de sauvetage x10'),
    (6, 'sécurité',       'Radeau de survie 10 personnes'),
    (6, 'sécurité',       'EPIRB'),
    (6, 'confort',        'Air conditionné'),
    (6, 'confort',        'Douche extérieure'),
    (6, 'confort',        'WC marin x2'),
    (6, 'cuisine',        'Cuisinière à gaz 4 feux'),
    (6, 'cuisine',        'Réfrigérateur 120L'),
    (6, 'cuisine',        'Micro-ondes'),
    (6, 'cuisine',        'Cafetière'),
    (6, 'divertissement', 'Enceinte Bluetooth'),
    (6, 'divertissement', 'Masques et tubas x6'),
    (6, 'divertissement', 'Paddleboard x2'),
    -- Boat 7 : Finistère (voilier 11m — côtes bretonnes)
    (7, 'navigation',     'GPS chartplotter'),
    (7, 'navigation',     'VHF radio'),
    (7, 'navigation',     'Pilote automatique'),
    (7, 'navigation',     'Sondeur'),
    (7, 'sécurité',       'Gilets de sauvetage x5'),
    (7, 'sécurité',       'Radeau de survie 5 personnes'),
    (7, 'sécurité',       'EPIRB'),
    (7, 'sécurité',       'Combinaisons de survie x2'),
    (7, 'confort',        'Chauffage'),
    (7, 'confort',        'WC marin'),
    (7, 'cuisine',        'Cuisinière à gaz 2 feux'),
    (7, 'cuisine',        'Réfrigérateur 50L'),
    -- Boat 9 : Voilier Océanis 40 (Marseille)
    (9, 'navigation',     'GPS chartplotter tactile'),
    (9, 'navigation',     'VHF radio'),
    (9, 'navigation',     'Pilote automatique'),
    (9, 'sécurité',       'Gilets de sauvetage x6'),
    (9, 'sécurité',       'Radeau de survie 6 personnes'),
    (9, 'sécurité',       'EPIRB'),
    (9, 'confort',        'Douche extérieure'),
    (9, 'cuisine',        'Cuisinière à gaz 3 feux'),
    (9, 'cuisine',        'Réfrigérateur 60L'),
    (9, 'divertissement', 'Masques et tubas x4'),
    -- Boat 10 : Catamaran Lagoon 42 (Nice)
    (10, 'navigation',     'GPS chartplotter tactile'),
    (10, 'navigation',     'VHF radio'),
    (10, 'navigation',     'Pilote automatique'),
    (10, 'navigation',     'AIS'),
    (10, 'sécurité',       'Gilets de sauvetage x8'),
    (10, 'sécurité',       'Radeau de survie 8 personnes'),
    (10, 'sécurité',       'EPIRB'),
    (10, 'confort',        'Air conditionné'),
    (10, 'confort',        'Douche extérieure'),
    (10, 'cuisine',        'Cuisinière à gaz 3 feux'),
    (10, 'cuisine',        'Réfrigérateur 90L'),
    (10, 'cuisine',        'Micro-ondes'),
    (10, 'divertissement', 'Enceinte Bluetooth'),
    (10, 'divertissement', 'Masques et tubas x4'),
    (10, 'divertissement', 'Paddleboard'),
    -- Boat 11 : Péniche La Garonne (Bordeaux)
    (11, 'navigation',     'GPS fluvial'),
    (11, 'navigation',     'VHF fluviale'),
    (11, 'sécurité',       'Gilets de sauvetage x6'),
    (11, 'sécurité',       'Extincteurs'),
    (11, 'confort',        'Chauffage central'),
    (11, 'confort',        'Salon intérieur'),
    (11, 'confort',        'Terrasse avant'),
    (11, 'cuisine',        'Cuisinière à gaz 4 feux'),
    (11, 'cuisine',        'Réfrigérateur 120L'),
    (11, 'cuisine',        'Four'),
    (11, 'cuisine',        'Micro-ondes'),
    (11, 'divertissement', 'TV'),
    (11, 'divertissement', 'Vélos pliants x2'),
    -- Boat 12 : Voilier Bénéteau First (La Rochelle)
    (12, 'navigation',     'GPS chartplotter'),
    (12, 'navigation',     'VHF radio'),
    (12, 'navigation',     'Pilote automatique'),
    (12, 'sécurité',       'Gilets de sauvetage x4'),
    (12, 'sécurité',       'Extincteurs'),
    (12, 'sécurité',       'EPIRB'),
    (12, 'confort',        'WC marin'),
    (12, 'cuisine',        'Cuisinière à gaz 2 feux'),
    (12, 'cuisine',        'Réfrigérateur 40L'),
    -- Boat 13 : Armor Voile (Brest)
    (13, 'navigation',     'GPS chartplotter'),
    (13, 'navigation',     'VHF radio'),
    (13, 'navigation',     'Sondeur'),
    (13, 'sécurité',       'Gilets de sauvetage x5'),
    (13, 'sécurité',       'Radeau de survie 5 personnes'),
    (13, 'sécurité',       'EPIRB'),
    (13, 'sécurité',       'Combinaisons de survie x2'),
    (13, 'confort',        'Chauffage'),
    (13, 'cuisine',        'Cuisinière à gaz 2 feux'),
    (13, 'cuisine',        'Réfrigérateur 50L'),
    -- Boat 14 : Catamaran Méditerranée (Marseille)
    (14, 'navigation',     'GPS chartplotter tactile'),
    (14, 'navigation',     'VHF radio'),
    (14, 'navigation',     'Pilote automatique'),
    (14, 'navigation',     'AIS'),
    (14, 'sécurité',       'Gilets de sauvetage x10'),
    (14, 'sécurité',       'Radeau de survie 10 personnes'),
    (14, 'sécurité',       'EPIRB'),
    (14, 'confort',        'Air conditionné'),
    (14, 'confort',        'Douche extérieure'),
    (14, 'cuisine',        'Cuisinière à gaz 4 feux'),
    (14, 'cuisine',        'Réfrigérateur 100L'),
    (14, 'cuisine',        'Micro-ondes'),
    (14, 'divertissement', 'Enceinte Bluetooth'),
    (14, 'divertissement', 'Masques et tubas x6'),
    (14, 'divertissement', 'Paddleboard x2'),
    -- Boat 15 : Voilier de Régate (Antibes)
    (15, 'navigation',     'GPS chartplotter'),
    (15, 'navigation',     'VHF radio'),
    (15, 'navigation',     'Pilote automatique'),
    (15, 'sécurité',       'Gilets de sauvetage x4'),
    (15, 'sécurité',       'Extincteurs'),
    (15, 'sécurité',       'EPIRB'),
    (15, 'confort',        'Bimini (protection solaire)'),
    (15, 'cuisine',        'Réfrigérateur 30L'),
    -- Boat 16 : Catamaran Prestige (Saint-Tropez — luxe)
    (16, 'navigation',     'GPS chartplotter tactile 12"'),
    (16, 'navigation',     'VHF radio'),
    (16, 'navigation',     'Pilote automatique'),
    (16, 'navigation',     'AIS'),
    (16, 'navigation',     'Radar'),
    (16, 'sécurité',       'Gilets de sauvetage x12'),
    (16, 'sécurité',       'Radeau de survie 12 personnes'),
    (16, 'sécurité',       'EPIRB'),
    (16, 'confort',        'Air conditionné'),
    (16, 'confort',        'Douche extérieure chaude'),
    (16, 'confort',        'WC marin x3'),
    (16, 'confort',        'Jacuzzi de cockpit'),
    (16, 'cuisine',        'Cuisinière à gaz 4 feux + four'),
    (16, 'cuisine',        'Réfrigérateur 150L'),
    (16, 'cuisine',        'Micro-ondes'),
    (16, 'cuisine',        'Cafetière Nespresso'),
    (16, 'divertissement', 'Enceinte Bluetooth premium'),
    (16, 'divertissement', 'Masques et tubas x6'),
    (16, 'divertissement', 'Paddleboard x2'),
    (16, 'divertissement', 'Kayak x1')
    ON CONFLICT DO NOTHING
  `);

  // ── Péniches supplémentaires pour le carrousel "Annonces du moment" ──────────
  // Objectif : 3 péniches publiées avec images → 3 slides dans le carrousel.
  // Boat 11 (La Garonne) est déjà publié. On publie boat 17 (Adour) et on
  // ajoute boat 18 rattaché à Bordeaux (port 10) — pas de nouveau port créé.

  // Publier la Péniche Fluviale Adour (boat 17)
  await prisma.$executeRawUnsafe(`
    UPDATE boat SET is_published = TRUE WHERE registration = 'FR-BDX-017'
  `);

  // Péniche La Garonne (boat 11) : bateau habitable fluvial, location sans permis.
  await prisma.$executeRawUnsafe(`
    UPDATE boat SET license_required = FALSE WHERE registration = 'FR-BDX-011'
  `);

  // Troisième péniche : "Douce Gironde" à Bordeaux (port 10)
  await prisma.$executeRawUnsafe(`
    INSERT INTO boat (id_user, id_port, name, type, size, engine, with_skipper, daily_price, capacity, build_year, registration, description, is_published) VALUES
    (4, 5, 'Douce Gironde', 'peniche', 21.00, 'Diesel 52cv', FALSE, 240.00, 8, 2007, 'FR-BDX-018',
     'Naviguez sur la Gironde à bord de cette péniche chaleureuse. Vignobles bordelais et paysages fluviaux au programme.', TRUE)
    ON CONFLICT (registration) DO NOTHING
  `);

  // Disponibilités pour boats 17 et 18
  await prisma.$executeRawUnsafe(`
    INSERT INTO boat_availability (id_boat, start_date, end_date, is_available, price_override, notes) VALUES
    (17, '2026-07-01', '2026-08-31', TRUE, NULL,   'Croisières estivales sur l''Adour'),
    (17, '2026-09-01', '2026-11-30', TRUE, NULL,   'Automne fluvial — vignobles gascons'),
    (18, '2026-07-01', '2026-08-31', TRUE, NULL,   'Gironde en été — vignobles et estuaire'),
    (18, '2026-09-01', '2026-10-31', TRUE, 220.00, 'Vendanges en Gironde')
    ON CONFLICT DO NOTHING
  `);

  // Bookings pour boats 17 et 18 (IDs 39 et 40 — 38 réservations déjà créées avant ce bloc)
  await prisma.$executeRawUnsafe(`
    INSERT INTO booking (id_user, id_boat, start_date, end_date, status, total_amount, booking_date) VALUES
    ( 7, 17, '2025-07-20', '2025-07-27', 'confirmed', 1540.00, '2025-05-15 10:00:00'),
    (10, 18, '2025-08-05', '2025-08-12', 'confirmed', 1750.00, '2025-06-10 09:00:00')
    ON CONFLICT DO NOTHING
  `);

  // Paiements des locations confirmées restantes — alimente la page « Mes
  // revenus » des propriétaires. Généré depuis les réservations réellement
  // créées (net = montant − commission de 10 %) pour éviter toute dérive d'IDs
  // codés en dur. Les bookings déjà payés ci-dessus (1er lot) ou remboursés
  // sont exclus.
  const alreadyPaidBookings = [1, 2, 4, 5, 7, 8, 9, 11, 12, 14];
  const bookingsToPay = await prisma.booking.findMany({
    where: { status: 'confirmed', id_booking: { notIn: alreadyPaidBookings } },
    select: { id_booking: true, total_amount: true, booking_date: true },
    orderBy: { id_booking: 'asc' },
  });
  await prisma.payment.createMany({
    data: bookingsToPay.map((b) => {
      const amount = Number(b.total_amount);
      const payDate = new Date(new Date(b.booking_date).getTime() + 86400000);
      return {
        id_booking: b.id_booking,
        amount,
        commission: amount * 0.1,
        payment_date: payDate,
        payment_method: b.id_booking % 3 === 0 ? 'bank_transfer' : 'card',
        status: 'success',
        transaction_ref: `TXN-SEED-${b.id_booking}`,
      };
    }),
    skipDuplicates: true,
  });

  // Avis pour ces bookings (IDs 27 et 28)
  // NB : id_booking pointait à tort sur 33/34 (des réservations d'un autre
  // lot) au lieu de 39/40, ce qui comptait ces avis sur les mauvais bateaux.
  await prisma.$executeRawUnsafe(`
    INSERT INTO review (id_user, id_booking, rating, comment, status, created_at) VALUES
    ( 7, 39, 4, 'Belle croisière sur l''Adour, péniche confortable, idéale pour les Landes et le Pays Basque.', 'validated', '2025-07-28 11:00:00'),
    (10, 40, 5, 'Coup de cœur pour cette péniche bordelaise ! Vue unique sur la Gironde et les vignobles, équipement impeccable.', 'validated', '2025-08-13 09:00:00')
    ON CONFLICT DO NOTHING
  `);

  // Équipements pour boats 17 et 18
  await prisma.$executeRawUnsafe(`
    INSERT INTO boat_equipment (id_boat, category, name) VALUES
    (17, 'navigation',     'GPS fluvial'),
    (17, 'navigation',     'VHF fluviale'),
    (17, 'sécurité',       'Gilets de sauvetage x8'),
    (17, 'sécurité',       'Extincteurs'),
    (17, 'confort',        'Salon intérieur'),
    (17, 'confort',        'Terrasse arrière'),
    (17, 'cuisine',        'Cuisinière à gaz 4 feux'),
    (17, 'cuisine',        'Réfrigérateur 100L'),
    (17, 'cuisine',        'Micro-ondes'),
    (17, 'divertissement', 'TV'),
    (18, 'navigation',     'GPS fluvial'),
    (18, 'navigation',     'VHF fluviale'),
    (18, 'sécurité',       'Gilets de sauvetage x8'),
    (18, 'sécurité',       'Extincteurs'),
    (18, 'confort',        'Chauffage central'),
    (18, 'confort',        'Salon intérieur panoramique'),
    (18, 'confort',        'Terrasse avant'),
    (18, 'cuisine',        'Cuisinière à gaz 4 feux'),
    (18, 'cuisine',        'Réfrigérateur 120L'),
    (18, 'cuisine',        'Four'),
    (18, 'cuisine',        'Micro-ondes'),
    (18, 'divertissement', 'TV'),
    (18, 'divertissement', 'Vélos pliants x2')
    ON CONFLICT DO NOTHING
  `);

  // ── Nouveaux types de bateaux ─────────────────────────────────────────────────
  // IDs attribués dans l'ordre d'insertion :
  //   19-21 = trimaran | 22-24 = hors_bord | 25-27 = jet_ski
  //   28-29 = gulet    | 30-31 = moteur (supplémentaires) | 32-34 = hors_bord (petits open, sans permis)
  // NB : "sans permis" n'est pas un type de coque à part — c'est le champ license_required
  // (FALSE) qui porte cette info. Ces bateaux sont des hors-bords <= 6cv comme les autres.
  // license_required est explicite pour les nouveaux bateaux.
  // Les bateaux existants (1-18) héritent du DEFAULT TRUE de la migration.
  await prisma.$executeRawUnsafe(`
    INSERT INTO boat (id_user, id_port, name, type, size, engine, with_skipper, daily_price, capacity, build_year, registration, description, is_published, license_required) VALUES
    -- Trimarans
    (2, 4, 'Trimaran Azur',       'trimaran',  13.50, 'Diesel 2x30cv', FALSE, 480.00, 8, 2019, 'FR-NIC-019', 'Trimaran performant au départ de Nice, alliant stabilité et vitesse sur la Côte d''Azur.', TRUE, TRUE),
    (5, 3, 'Trimaran Finistère',  'trimaran',  12.00, 'Diesel 2x25cv', FALSE, 350.00, 6, 2016, 'FR-BRT-020', 'Trimaran robuste idéal pour les eaux bretonnes, à la fois rapide et stable par mer formée.', TRUE, TRUE),
    (3, 2, 'Trimaran Atlantique', 'trimaran',  14.50, 'Diesel 2x35cv', TRUE,  520.00, 8, 2021, 'FR-LRO-021', 'Grand trimaran au départ de La Rochelle, skipper disponible pour des croisières rapides vers les îles de Ré et Oléron.', TRUE, TRUE),
    -- Hors-bords (< 6 cv — sans permis requis)
    (3, 2, 'Zodiac N-ZO 550',   'hors_bord', 5.50, 'Yamaha 6cv',  FALSE,  90.00, 5, 2021, 'FR-LRO-022', 'Semi-rigide léger et maniable, parfait pour découvrir les côtes charentaises sans permis.', TRUE, FALSE),
    (2, 1, 'Quicksilver 490',   'hors_bord', 4.90, 'Mercury 6cv', FALSE,  80.00, 4, 2020, 'FR-MRS-023', 'Annexe open idéale pour les balades côtières en famille autour de Marseille, sans permis requis.', TRUE, FALSE),
    (4, 4, 'Brig Eagle 5',      'hors_bord', 5.00, 'Honda 6cv',   FALSE,  85.00, 5, 2022, 'FR-NIC-024', 'Semi-rigide compact au départ de Nice pour explorer les criques de la Côte d''Azur sans permis.', TRUE, FALSE),
    -- Jet-skis (permis côtier requis)
    (2, 1, 'Sea-Doo Spark 2up', 'jet_ski',   3.10, 'Rotax 90cv',        FALSE, 150.00, 2, 2023, 'FR-MRS-025', 'Jet-ski compact et agile, idéal pour les sensations fortes en baie de Marseille.', TRUE, TRUE),
    (4, 4, 'Yamaha EX Sport',   'jet_ski',   3.40, 'TR-1 160cv',        FALSE, 130.00, 2, 2022, 'FR-NIC-026', 'Jet-ski puissant au départ de Nice, parfait pour longer la Côte d''Azur à pleine vitesse.', TRUE, TRUE),
    (5, 5, 'Kawasaki SX-R',     'jet_ski',   3.30, 'Supercharged 160cv',FALSE, 120.00, 1, 2021, 'FR-BDX-027', 'Jet-ski de stand-up pour les riders expérimentés sur les eaux de la Gironde.', TRUE, TRUE),
    -- Gulets (avec skipper — permis requis)
    (4, 1, 'Gulet Méditerranée','gulet',     20.00, 'Diesel 180cv', TRUE,  900.00, 12, 2015, 'FR-MRS-028', 'Gulet traditionnel en bois au départ de Marseille, croisières luxueuses avec skipper en Méditerranée.', TRUE, TRUE),
    (2, 4, 'Gulet Riviera',     'gulet',     18.00, 'Diesel 160cv', TRUE,  800.00, 10, 2012, 'FR-NIC-029', 'Gulet élégant amarré à Nice, idéal pour explorer la Côte d''Azur et les côtes ligures avec skipper.', TRUE, TRUE),
    -- Bateaux à moteur supplémentaires (pour compléter à 3 pour le carrousel)
    (3, 1, 'Cranchi E30 Enduro','moteur',     9.80, 'Diesel 200cv', FALSE, 380.00, 6, 2020, 'FR-MRS-030', 'Bateau à moteur open puissant et confortable, parfait pour les excursions côtières depuis Marseille.', TRUE, TRUE),
    (5, 4, 'Four Winns 310',    'moteur',    10.50, 'Diesel 250cv', FALSE, 450.00, 8, 2019, 'FR-NIC-031', 'Cruiser à moteur élégant au départ de Nice, idéal pour les sorties en famille sur la Côte d''Azur.', TRUE, TRUE),
    -- Hors-bords supplémentaires (petits open électriques/6cv — aucun permis requis)
    (3, 2, 'Open 16 Électrique',  'hors_bord', 4.90, 'Électrique 3kW', FALSE, 70.00, 4, 2022, 'FR-LRO-032', 'Petit bateau électrique silencieux, idéal pour découvrir les côtes de La Rochelle en famille, sans aucun permis.', TRUE, FALSE),
    (2, 1, 'Bayliner Element E16','hors_bord', 4.80, 'Électrique 3kW', FALSE, 65.00, 4, 2021, 'FR-MRS-033', 'Open sans permis au départ de Marseille, parfait pour une balade en calanques avec les enfants.', TRUE, FALSE),
    (4, 4, 'Quicksilver 505 Open','hors_bord', 5.05, 'Honda 6cv',      FALSE, 75.00, 5, 2023, 'FR-NIC-034', 'Bateau open sans permis au départ de Nice pour explorer les criques de la Côte d''Azur en toute liberté.', TRUE, FALSE),
    -- ── Compléments pour atteindre 5 par type (IDs 35-49) ─────────────────────
    -- Moteur (35-36)
    (4, 3, 'Jeanneau Merry Fisher 895', 'moteur',  9.00, 'Diesel 175cv', FALSE, 340.00, 6, 2018, 'FR-BRT-035', 'Vedette de pêche-promenade robuste au départ de Brest, idéale pour explorer la rade et les îles du Finistère.', TRUE, TRUE),
    (5, 2, 'Boston Whaler 270',         'moteur',  8.50, 'Diesel 220cv', FALSE, 410.00, 8, 2020, 'FR-LRO-036', 'Open insubmersible et puissant au départ de La Rochelle, parfait pour les sorties sportives côtières.', TRUE, TRUE),
    -- Péniche (37-38)
    (2, 5, 'Péniche Canal du Midi', 'peniche', 19.00, 'Diesel 48cv', FALSE, 200.00, 7, 2005, 'FR-BDX-037', 'Péniche traditionnelle pour naviguer sur la Garonne et remonter vers le Canal du Midi depuis Bordeaux. Location sans permis (bateau habitable fluvial).', TRUE, FALSE),
    (3, 2, 'Péniche Girondine',     'peniche', 16.00, 'Diesel 40cv', FALSE, 160.00, 6, 2003, 'FR-LRO-038', 'Péniche classique idéale pour une escapade fluviale paisible entre La Rochelle et le Marais poitevin. Aucun permis requis.', TRUE, FALSE),
    -- Trimaran (39-40)
    (4, 1, 'Trimaran Côte d''Azur', 'trimaran', 13.00, 'Diesel 2x28cv', FALSE, 460.00, 7, 2018, 'FR-MRS-039', 'Trimaran performant au départ de Marseille, équilibrant stabilité et vitesse sur la Méditerranée.', TRUE, TRUE),
    (3, 4, 'Trimaran Grand Large',  'trimaran', 15.00, 'Diesel 2x40cv', FALSE, 550.00, 9, 2022, 'ES-BCN-040', 'Grand trimaran luxueux depuis Nice, conçu pour des croisières hauturières rapides le long de la Côte d''Azur.', TRUE, TRUE),
    -- Hors-bord (41-42)
    (5, 3, 'Rib 500 Pro',         'hors_bord', 5.00, 'Yamaha 6cv', FALSE, 85.00, 5, 2022, 'FR-BRT-041', 'Semi-rigide sans permis au départ de Brest pour des balades côtières en famille dans la rade.', TRUE, FALSE),
    (2, 5, 'Capelli Tempest 500', 'hors_bord', 5.20, 'Honda 6cv',  FALSE, 80.00, 5, 2021, 'FR-BDX-042', 'Annexe légère sans permis au départ de Bordeaux, parfaite pour explorer les rives de la Garonne.', TRUE, FALSE),
    -- Jet-ski (43-44)
    (3, 3, 'Sea-Doo GTI 130',   'jet_ski', 3.20, 'Rotax 130cv',  FALSE, 110.00, 2, 2022, 'FR-BRT-043', 'Jet-ski familial et accessible au départ de Brest, idéal pour une première expérience en mer.', TRUE, TRUE),
    (5, 2, 'Yamaha VX Cruiser', 'jet_ski', 3.30, 'TR-1 180cv',   FALSE, 125.00, 3, 2021, 'FR-LRO-044', 'Jet-ski confortable et puissant au départ de La Rochelle, parfait pour longer les côtes charentaises.', TRUE, TRUE),
    -- Gulet (45-47)
    (5, 2, 'Gulet Neptune',     'gulet', 16.00, 'Diesel 140cv', TRUE, 700.00,  8, 2010, 'FR-LRO-045', 'Gulet traditionnel en bois depuis La Rochelle, idéal pour des croisières côtières avec skipper expérimenté.', TRUE, TRUE),
    (3, 3, 'Gulet Bretagne',    'gulet', 17.00, 'Diesel 150cv', TRUE, 750.00, 10, 2013, 'FR-BRT-046', 'Gulet robuste au départ de Brest, conçu pour les eaux bretonnes et les croisières vers les archipels.', TRUE, TRUE),
    (2, 2, 'Gulet Grand Large', 'gulet', 19.00, 'Diesel 170cv', TRUE, 850.00, 12, 2017, 'ES-BCN-047', 'Grand gulet au départ de La Rochelle pour explorer les îles de Ré et d''Oléron avec skipper à bord.', TRUE, TRUE),
    -- Hors-bords (48-49, sans permis)
    (5, 3, 'Zodiac Medline 5.5',  'hors_bord', 5.50, 'Électrique 2kW', FALSE, 60.00, 4, 2023, 'FR-BRT-048', 'Bateau électrique silencieux sans permis au départ de Brest, idéal pour les sorties nature en rade.', TRUE, FALSE),
    (3, 5, 'Plastimo Open 4.5',   'hors_bord', 4.50, 'Honda 6cv',      FALSE, 55.00, 4, 2022, 'FR-BDX-049', 'Open sans permis depuis Bordeaux pour découvrir la Garonne et ses rives viticoles en toute simplicité.', TRUE, FALSE)
    ON CONFLICT (registration) DO NOTHING
  `);

  // Disponibilités pour les nouveaux bateaux
  await prisma.$executeRawUnsafe(`
    INSERT INTO boat_availability (id_boat, start_date, end_date, is_available, price_override, notes) VALUES
    -- Trimarans
    (19, '2026-07-01', '2026-08-31', TRUE, NULL,   'Été sur la Côte d''Azur'),
    (19, '2026-09-01', '2026-10-15', TRUE, 440.00, 'Arrière-saison azuréenne'),
    (20, '2026-07-01', '2026-08-31', TRUE, NULL,   'Saison bretonne'),
    (20, '2026-09-01', '2026-09-30', TRUE, 320.00, 'Septembre en Bretagne'),
    (21, '2026-07-01', '2026-08-31', TRUE, NULL,   'Été atlantique'),
    (21, '2026-09-01', '2026-10-31', TRUE, 480.00, 'Arrière-saison atlantique'),
    -- Hors-bords
    (22, '2026-06-01', '2026-09-30', TRUE, NULL, 'Saison estivale complète'),
    (23, '2026-06-01', '2026-09-30', TRUE, NULL, 'Saison estivale complète'),
    (24, '2026-06-01', '2026-09-30', TRUE, NULL, 'Saison estivale complète'),
    -- Jet-skis
    (25, '2026-06-01', '2026-09-30', TRUE, NULL,   'Saison estivale'),
    (25, '2026-07-01', '2026-08-31', TRUE, 170.00, 'Haute saison'),
    (26, '2026-06-01', '2026-09-30', TRUE, NULL,   'Saison estivale'),
    (26, '2026-07-01', '2026-08-31', TRUE, 150.00, 'Haute saison'),
    (27, '2026-06-01', '2026-09-30', TRUE, NULL,   'Saison estivale'),
    -- Gulets
    (28, '2026-07-01', '2026-07-31', TRUE, NULL,    'Juillet — réservation anticipée conseillée'),
    (28, '2026-08-01', '2026-08-31', TRUE, 1000.00, 'Haute saison premium'),
    (28, '2026-09-01', '2026-10-15', TRUE, NULL,    'Arrière-saison Méditerranée'),
    (29, '2026-07-01', '2026-08-31', TRUE, NULL,    'Été Côte d''Azur'),
    (29, '2026-09-01', '2026-10-15', TRUE, 720.00,  'Septembre-octobre'),
    -- Moteur supplémentaires
    (30, '2026-07-01', '2026-08-31', TRUE, NULL,   'Été méditerranéen'),
    (30, '2026-09-01', '2026-09-30', TRUE, 350.00, 'Septembre'),
    (31, '2026-07-01', '2026-08-31', TRUE, NULL,   'Été Côte d''Azur'),
    (31, '2026-09-01', '2026-09-30', TRUE, 420.00, 'Arrière-saison'),
    -- Bateaux sans permis
    (32, '2026-05-01', '2026-10-31', TRUE, NULL,  'Saison complète — La Rochelle'),
    (33, '2026-05-01', '2026-10-31', TRUE, NULL,  'Saison complète — Marseille'),
    (34, '2026-05-01', '2026-10-31', TRUE, NULL,  'Saison complète — Nice'),
    -- Compléments 35-49
    (35, '2026-07-01', '2026-08-31', TRUE, NULL,   'Été breton'),
    (35, '2026-09-01', '2026-09-30', TRUE, 310.00, 'Septembre en Bretagne'),
    (36, '2026-07-01', '2026-08-31', TRUE, NULL,   'Été atlantique'),
    (36, '2026-09-01', '2026-10-15', TRUE, 380.00, 'Arrière-saison La Rochelle'),
    (37, '2026-07-01', '2026-08-31', TRUE, NULL,   'Croisières estivales'),
    (37, '2026-09-01', '2026-10-31', TRUE, 180.00, 'Vendanges et automne'),
    (38, '2026-07-01', '2026-08-31', TRUE, NULL,   'Saison fluviale'),
    (38, '2026-09-01', '2026-10-31', TRUE, NULL,   'Automne dans le Marais poitevin'),
    (39, '2026-07-01', '2026-08-31', TRUE, NULL,   'Été méditerranéen'),
    (39, '2026-09-01', '2026-10-15', TRUE, 430.00, 'Arrière-saison'),
    (40, '2026-07-01', '2026-08-31', TRUE, NULL,   'Été Côte d''Azur'),
    (40, '2026-09-01', '2026-10-15', TRUE, 510.00, 'Septembre en Méditerranée'),
    (41, '2026-06-01', '2026-09-30', TRUE, NULL,   'Saison Bretagne'),
    (42, '2026-06-01', '2026-09-30', TRUE, NULL,   'Saison Bordeaux'),
    (43, '2026-06-01', '2026-09-30', TRUE, NULL,   'Saison Brest'),
    (44, '2026-06-01', '2026-09-30', TRUE, NULL,   'Saison La Rochelle'),
    (45, '2026-07-01', '2026-08-31', TRUE, NULL,   'Été atlantique'),
    (45, '2026-09-01', '2026-10-15', TRUE, 650.00, 'Arrière-saison'),
    (46, '2026-07-01', '2026-08-31', TRUE, NULL,   'Saison bretonne'),
    (46, '2026-09-01', '2026-09-30', TRUE, 700.00, 'Septembre breton'),
    (47, '2026-07-01', '2026-08-31', TRUE, NULL,   'Été sur la Costa Brava'),
    (47, '2026-09-01', '2026-10-31', TRUE, 800.00, 'Arrière-saison méditerranéenne'),
    (48, '2026-05-01', '2026-10-31', TRUE, NULL,   'Saison complète — Brest'),
    (49, '2026-05-01', '2026-10-31', TRUE, NULL,   'Saison complète — Bordeaux')
    ON CONFLICT DO NOTHING
  `);

  // Équipements pour les nouveaux bateaux
  await prisma.$executeRawUnsafe(`
    INSERT INTO boat_equipment (id_boat, category, name) VALUES
    -- Trimaran Azur (19)
    (19, 'navigation',     'GPS chartplotter tactile'),
    (19, 'navigation',     'VHF radio'),
    (19, 'navigation',     'Pilote automatique'),
    (19, 'navigation',     'AIS'),
    (19, 'sécurité',       'Gilets de sauvetage x8'),
    (19, 'sécurité',       'Radeau de survie 8 personnes'),
    (19, 'sécurité',       'EPIRB'),
    (19, 'confort',        'Douche extérieure'),
    (19, 'cuisine',        'Cuisinière à gaz 2 feux'),
    (19, 'cuisine',        'Réfrigérateur 60L'),
    (19, 'divertissement', 'Masques et tubas x4'),
    -- Trimaran Finistère (20)
    (20, 'navigation',     'GPS chartplotter'),
    (20, 'navigation',     'VHF radio'),
    (20, 'navigation',     'Pilote automatique'),
    (20, 'navigation',     'Sondeur'),
    (20, 'sécurité',       'Gilets de sauvetage x6'),
    (20, 'sécurité',       'Radeau de survie 6 personnes'),
    (20, 'sécurité',       'EPIRB'),
    (20, 'sécurité',       'Combinaisons de survie x2'),
    (20, 'confort',        'Chauffage'),
    (20, 'cuisine',        'Cuisinière à gaz 2 feux'),
    (20, 'cuisine',        'Réfrigérateur 50L'),
    -- Trimaran Atlantique (21)
    (21, 'navigation',     'GPS chartplotter tactile'),
    (21, 'navigation',     'VHF radio'),
    (21, 'navigation',     'Pilote automatique'),
    (21, 'navigation',     'AIS'),
    (21, 'sécurité',       'Gilets de sauvetage x8'),
    (21, 'sécurité',       'Radeau de survie 8 personnes'),
    (21, 'sécurité',       'EPIRB'),
    (21, 'confort',        'Douche extérieure'),
    (21, 'cuisine',        'Cuisinière à gaz 3 feux'),
    (21, 'cuisine',        'Réfrigérateur 70L'),
    (21, 'divertissement', 'Masques et tubas x4'),
    -- Hors-bords (22-24) — équipements minimalistes
    (22, 'navigation', 'GPS portable'),
    (22, 'sécurité',   'Gilets de sauvetage x5'),
    (22, 'sécurité',   'Extincteurs'),
    (22, 'confort',    'Bimini (protection solaire)'),
    (23, 'navigation', 'GPS portable'),
    (23, 'sécurité',   'Gilets de sauvetage x4'),
    (23, 'sécurité',   'Extincteurs'),
    (24, 'navigation', 'GPS portable'),
    (24, 'sécurité',   'Gilets de sauvetage x5'),
    (24, 'sécurité',   'Extincteurs'),
    (24, 'confort',    'Bimini (protection solaire)'),
    -- Jet-skis (25-27)
    (25, 'sécurité',       'Gilets de sauvetage x2'),
    (25, 'sécurité',       'Extincteurs'),
    (25, 'divertissement', 'Caméra GoPro en option'),
    (26, 'sécurité',       'Gilets de sauvetage x2'),
    (26, 'sécurité',       'Extincteurs'),
    (26, 'divertissement', 'Caméra GoPro en option'),
    (27, 'sécurité',       'Gilets de sauvetage x1'),
    (27, 'sécurité',       'Extincteurs'),
    -- Gulet Méditerranée (28)
    (28, 'navigation',     'GPS chartplotter tactile'),
    (28, 'navigation',     'VHF radio'),
    (28, 'navigation',     'Pilote automatique'),
    (28, 'navigation',     'AIS'),
    (28, 'navigation',     'Radar'),
    (28, 'sécurité',       'Gilets de sauvetage x12'),
    (28, 'sécurité',       'Radeau de survie 12 personnes'),
    (28, 'sécurité',       'EPIRB'),
    (28, 'confort',        'Air conditionné'),
    (28, 'confort',        'Salon intérieur'),
    (28, 'confort',        'Terrasse avant'),
    (28, 'cuisine',        'Cuisinière à gaz 4 feux'),
    (28, 'cuisine',        'Réfrigérateur 150L'),
    (28, 'cuisine',        'Four'),
    (28, 'cuisine',        'Micro-ondes'),
    (28, 'divertissement', 'Enceinte Bluetooth'),
    (28, 'divertissement', 'Paddleboard x2'),
    (28, 'divertissement', 'Masques et tubas x6'),
    -- Gulet Riviera (29)
    (29, 'navigation',     'GPS chartplotter tactile'),
    (29, 'navigation',     'VHF radio'),
    (29, 'navigation',     'Pilote automatique'),
    (29, 'navigation',     'AIS'),
    (29, 'sécurité',       'Gilets de sauvetage x10'),
    (29, 'sécurité',       'Radeau de survie 10 personnes'),
    (29, 'sécurité',       'EPIRB'),
    (29, 'confort',        'Air conditionné'),
    (29, 'confort',        'Salon intérieur'),
    (29, 'cuisine',        'Cuisinière à gaz 4 feux'),
    (29, 'cuisine',        'Réfrigérateur 120L'),
    (29, 'cuisine',        'Micro-ondes'),
    (29, 'divertissement', 'Enceinte Bluetooth'),
    (29, 'divertissement', 'Masques et tubas x4'),
    -- Cranchi E30 Enduro (30)
    (30, 'navigation',     'GPS chartplotter'),
    (30, 'navigation',     'VHF radio'),
    (30, 'navigation',     'Sondeur'),
    (30, 'sécurité',       'Gilets de sauvetage x6'),
    (30, 'sécurité',       'Extincteurs'),
    (30, 'sécurité',       'EPIRB'),
    (30, 'confort',        'Bimini (protection solaire)'),
    (30, 'cuisine',        'Réfrigérateur 40L'),
    (30, 'divertissement', 'Enceinte Bluetooth'),
    -- Four Winns 310 (31)
    (31, 'navigation',     'GPS chartplotter tactile'),
    (31, 'navigation',     'VHF radio'),
    (31, 'navigation',     'Sondeur'),
    (31, 'sécurité',       'Gilets de sauvetage x8'),
    (31, 'sécurité',       'Extincteurs'),
    (31, 'sécurité',       'EPIRB'),
    (31, 'confort',        'Bimini (protection solaire)'),
    (31, 'confort',        'Douche de cockpit'),
    (31, 'cuisine',        'Réfrigérateur 50L'),
    (31, 'cuisine',        'Cuisinière à gaz 2 feux'),
    (31, 'divertissement', 'Enceinte Bluetooth'),
    -- Bateaux sans permis (32-34)
    (32, 'navigation', 'GPS portable'),
    (32, 'sécurité',   'Gilets de sauvetage x4'),
    (32, 'sécurité',   'Extincteurs'),
    (32, 'confort',    'Bimini (protection solaire)'),
    (33, 'navigation', 'GPS portable'),
    (33, 'sécurité',   'Gilets de sauvetage x4'),
    (33, 'sécurité',   'Extincteurs'),
    (34, 'navigation', 'GPS portable'),
    (34, 'sécurité',   'Gilets de sauvetage x5'),
    (34, 'sécurité',   'Extincteurs'),
    (34, 'confort',    'Bimini (protection solaire)'),
    -- Compléments pour atteindre 5 par type (35-49)
    -- Moteur (35-36)
    (35, 'navigation', 'GPS chartplotter'),
    (35, 'navigation', 'VHF radio'),
    (35, 'navigation', 'Sondeur'),
    (35, 'sécurité',   'Gilets de sauvetage x6'),
    (35, 'sécurité',   'Extincteurs'),
    (35, 'sécurité',   'EPIRB'),
    (35, 'confort',    'Bimini (protection solaire)'),
    (35, 'cuisine',    'Réfrigérateur 40L'),
    (36, 'navigation', 'GPS chartplotter tactile'),
    (36, 'navigation', 'VHF radio'),
    (36, 'navigation', 'Sondeur'),
    (36, 'sécurité',   'Gilets de sauvetage x8'),
    (36, 'sécurité',   'Extincteurs'),
    (36, 'sécurité',   'EPIRB'),
    (36, 'confort',    'Bimini (protection solaire)'),
    (36, 'confort',    'Douche de cockpit'),
    (36, 'cuisine',    'Réfrigérateur 50L'),
    (36, 'divertissement', 'Enceinte Bluetooth'),
    -- Péniche (37-38)
    (37, 'navigation', 'GPS fluvial'),
    (37, 'navigation', 'VHF fluviale'),
    (37, 'sécurité',   'Gilets de sauvetage x7'),
    (37, 'sécurité',   'Extincteurs'),
    (37, 'confort',    'Chauffage central'),
    (37, 'confort',    'Salon intérieur'),
    (37, 'cuisine',    'Cuisinière à gaz 3 feux'),
    (37, 'cuisine',    'Réfrigérateur 100L'),
    (37, 'cuisine',    'Micro-ondes'),
    (37, 'divertissement', 'TV'),
    (38, 'navigation', 'GPS fluvial'),
    (38, 'navigation', 'VHF fluviale'),
    (38, 'sécurité',   'Gilets de sauvetage x6'),
    (38, 'sécurité',   'Extincteurs'),
    (38, 'confort',    'Salon intérieur'),
    (38, 'confort',    'Terrasse avant'),
    (38, 'cuisine',    'Cuisinière à gaz 2 feux'),
    (38, 'cuisine',    'Réfrigérateur 80L'),
    -- Trimaran (39-40)
    (39, 'navigation',     'GPS chartplotter tactile'),
    (39, 'navigation',     'VHF radio'),
    (39, 'navigation',     'Pilote automatique'),
    (39, 'sécurité',       'Gilets de sauvetage x7'),
    (39, 'sécurité',       'Radeau de survie 7 personnes'),
    (39, 'sécurité',       'EPIRB'),
    (39, 'confort',        'Douche extérieure'),
    (39, 'cuisine',        'Cuisinière à gaz 2 feux'),
    (39, 'cuisine',        'Réfrigérateur 60L'),
    (40, 'navigation',     'GPS chartplotter tactile'),
    (40, 'navigation',     'VHF radio'),
    (40, 'navigation',     'Pilote automatique'),
    (40, 'navigation',     'AIS'),
    (40, 'sécurité',       'Gilets de sauvetage x9'),
    (40, 'sécurité',       'Radeau de survie 9 personnes'),
    (40, 'sécurité',       'EPIRB'),
    (40, 'confort',        'Air conditionné'),
    (40, 'confort',        'Douche extérieure'),
    (40, 'cuisine',        'Cuisinière à gaz 3 feux'),
    (40, 'cuisine',        'Réfrigérateur 80L'),
    (40, 'divertissement', 'Paddleboard x2'),
    -- Hors-bord (41-42)
    (41, 'navigation', 'GPS portable'),
    (41, 'sécurité',   'Gilets de sauvetage x5'),
    (41, 'sécurité',   'Extincteurs'),
    (42, 'navigation', 'GPS portable'),
    (42, 'sécurité',   'Gilets de sauvetage x5'),
    (42, 'sécurité',   'Extincteurs'),
    (42, 'confort',    'Bimini (protection solaire)'),
    -- Jet-ski (43-44)
    (43, 'sécurité', 'Gilets de sauvetage x2'),
    (43, 'sécurité', 'Extincteurs'),
    (44, 'sécurité', 'Gilets de sauvetage x3'),
    (44, 'sécurité', 'Extincteurs'),
    (44, 'divertissement', 'Caméra GoPro en option'),
    -- Gulet (45-47)
    (45, 'navigation',     'GPS chartplotter'),
    (45, 'navigation',     'VHF radio'),
    (45, 'navigation',     'Pilote automatique'),
    (45, 'sécurité',       'Gilets de sauvetage x8'),
    (45, 'sécurité',       'Radeau de survie 8 personnes'),
    (45, 'sécurité',       'EPIRB'),
    (45, 'confort',        'Air conditionné'),
    (45, 'confort',        'Salon intérieur'),
    (45, 'cuisine',        'Cuisinière à gaz 3 feux'),
    (45, 'cuisine',        'Réfrigérateur 100L'),
    (46, 'navigation',     'GPS chartplotter tactile'),
    (46, 'navigation',     'VHF radio'),
    (46, 'navigation',     'Pilote automatique'),
    (46, 'sécurité',       'Gilets de sauvetage x10'),
    (46, 'sécurité',       'Radeau de survie 10 personnes'),
    (46, 'sécurité',       'EPIRB'),
    (46, 'confort',        'Air conditionné'),
    (46, 'confort',        'Salon intérieur'),
    (46, 'cuisine',        'Cuisinière à gaz 4 feux'),
    (46, 'cuisine',        'Réfrigérateur 120L'),
    (46, 'divertissement', 'Enceinte Bluetooth'),
    (47, 'navigation',     'GPS chartplotter tactile'),
    (47, 'navigation',     'VHF radio'),
    (47, 'navigation',     'Pilote automatique'),
    (47, 'navigation',     'AIS'),
    (47, 'sécurité',       'Gilets de sauvetage x12'),
    (47, 'sécurité',       'Radeau de survie 12 personnes'),
    (47, 'sécurité',       'EPIRB'),
    (47, 'confort',        'Air conditionné'),
    (47, 'confort',        'Salon intérieur panoramique'),
    (47, 'confort',        'Terrasse avant'),
    (47, 'cuisine',        'Cuisinière à gaz 4 feux'),
    (47, 'cuisine',        'Réfrigérateur 150L'),
    (47, 'cuisine',        'Four'),
    (47, 'divertissement', 'Enceinte Bluetooth'),
    (47, 'divertissement', 'Paddleboard x2'),
    -- Hors-bords (48-49, sans permis)
    (48, 'navigation', 'GPS portable'),
    (48, 'sécurité',   'Gilets de sauvetage x4'),
    (48, 'sécurité',   'Extincteurs'),
    (48, 'confort',    'Bimini (protection solaire)'),
    (49, 'navigation', 'GPS portable'),
    (49, 'sécurité',   'Gilets de sauvetage x4'),
    (49, 'sécurité',   'Extincteurs')
    ON CONFLICT DO NOTHING
  `);

  // Images de bateaux — 5 à 10 images par type
  await prisma.$executeRawUnsafe(`
    INSERT INTO image (id_boat, id_user, url, type, "order") VALUES
    -- Voiliers (bateaux 1, 3, 5, 7, 9, 12, 13) — Unsplash
    ( 1, NULL, 'https://images.unsplash.com/photo-1716916959700-f4acb6fc049b?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    ( 3, NULL, 'https://images.unsplash.com/photo-1716916959342-03078e60b9a6?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    ( 5, NULL, 'https://images.unsplash.com/photo-1652447385283-817463bd31af?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    ( 7, NULL, 'https://images.unsplash.com/photo-1603275218135-07c03485bba9?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    ( 9, NULL, 'https://images.unsplash.com/photo-1546214755-c5d22447b43b?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    (12, NULL, 'https://images.unsplash.com/photo-1501771924607-209f42a6e7e4?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    (13, NULL, 'https://images.unsplash.com/photo-1534296264129-b318f8140c27?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    -- Catamarans (bateaux 2, 6, 8, 10, 14, 16) — Unsplash + Pexels
    ( 2, NULL, 'https://images.unsplash.com/photo-1414437384035-787b9df782d7?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    ( 6, NULL, 'https://images.unsplash.com/photo-1757263511665-4614e927d455?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    ( 8, NULL, 'https://images.unsplash.com/photo-1567197418083-55c7700ff2eb?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    (10, NULL, 'https://images.unsplash.com/photo-1755707036234-4c68bf8b69a0?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    (14, NULL, 'https://images.unsplash.com/photo-1685720543787-54800296f5e7?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    (16, NULL, 'https://images.pexels.com/photos/570986/pexels-photo-570986.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    ( 2, NULL, 'https://images.pexels.com/photos/4784477/pexels-photo-4784477.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 1),
    -- Bateaux à moteur (bateaux 4, 30, 31, 35, 36) — Unsplash + Pexels
    ( 4, NULL, 'https://images.unsplash.com/photo-1567369244263-8f45293b2178?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    (30, NULL, 'https://images.unsplash.com/photo-1511311855362-67f5492671ab?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    (31, NULL, 'https://images.unsplash.com/photo-1543140313-318677635120?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    (35, NULL, 'https://images.unsplash.com/photo-1538422497454-081f9b0edf0c?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    (36, NULL, 'https://images.unsplash.com/photo-1754934076886-55317e36f1a5?auto=format&fit=crop&w=1280&q=80', 'bateau', 0),
    ( 4, NULL, 'https://images.unsplash.com/photo-1748457440455-27a7597839f7?auto=format&fit=crop&w=1280&q=80', 'bateau', 1),
    (30, NULL, 'https://images.pexels.com/photos/4701633/pexels-photo-4701633.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 1),
    -- Péniches (bateaux 11, 17, 37, 38) — Pexels canal boats / narrowboats
    (11, NULL, 'https://images.pexels.com/photos/33497169/pexels-photo-33497169.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (17, NULL, 'https://images.pexels.com/photos/32037324/pexels-photo-32037324.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (37, NULL, 'https://images.pexels.com/photos/29851002/pexels-photo-29851002.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (38, NULL, 'https://images.pexels.com/photos/29851003/pexels-photo-29851003.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (11, NULL, 'https://images.pexels.com/photos/9174476/pexels-photo-9174476.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 1),
    (17, NULL, 'https://images.pexels.com/photos/17289927/pexels-photo-17289927.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 1),
    (37, NULL, 'https://images.pexels.com/photos/18115341/pexels-photo-18115341.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 1),
    -- Trimarans (bateaux 19, 20, 21, 39, 40) — Pexels multicoques de course
    (19, NULL, 'https://images.pexels.com/photos/4600762/pexels-photo-4600762.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (20, NULL, 'https://images.pexels.com/photos/10581102/pexels-photo-10581102.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (21, NULL, 'https://images.pexels.com/photos/10581101/pexels-photo-10581101.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (39, NULL, 'https://images.pexels.com/photos/10581096/pexels-photo-10581096.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (40, NULL, 'https://images.pexels.com/photos/5215482/pexels-photo-5215482.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (19, NULL, 'https://images.pexels.com/photos/6750217/pexels-photo-6750217.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 1),
    -- Hors-bords (bateaux 22, 23, 24, 41, 42) — Pexels semi-rigides / annexes moteur
    (22, NULL, 'https://images.pexels.com/photos/1732278/pexels-photo-1732278.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (23, NULL, 'https://images.pexels.com/photos/1732279/pexels-photo-1732279.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (24, NULL, 'https://images.pexels.com/photos/13315384/pexels-photo-13315384.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (41, NULL, 'https://images.pexels.com/photos/4484203/pexels-photo-4484203.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (42, NULL, 'https://images.pexels.com/photos/1471724/pexels-photo-1471724.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (22, NULL, 'https://images.pexels.com/photos/8829280/pexels-photo-8829280.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 1),
    -- Jet-skis (bateaux 25, 26, 27, 43, 44) — Pexels PWC / jet ski
    (25, NULL, 'https://images.pexels.com/photos/15414980/pexels-photo-15414980.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (26, NULL, 'https://images.pexels.com/photos/35767037/pexels-photo-35767037.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (27, NULL, 'https://images.pexels.com/photos/18636560/pexels-photo-18636560.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (43, NULL, 'https://images.pexels.com/photos/11877440/pexels-photo-11877440.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (44, NULL, 'https://images.pexels.com/photos/28409024/pexels-photo-28409024.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (25, NULL, 'https://images.pexels.com/photos/18636561/pexels-photo-18636561.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 1),
    (26, NULL, 'https://images.pexels.com/photos/29867681/pexels-photo-29867681.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 1),
    -- Gulets (bateaux 28, 29, 45, 46, 47) — Pexels gulets turcs (léger + négociation WebP auto)
    (28, NULL, 'https://images.pexels.com/photos/4170111/pexels-photo-4170111.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (29, NULL, 'https://images.pexels.com/photos/18192882/pexels-photo-18192882.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (45, NULL, 'https://images.pexels.com/photos/13274525/pexels-photo-13274525.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (46, NULL, 'https://images.pexels.com/photos/17233512/pexels-photo-17233512.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (47, NULL, 'https://images.pexels.com/photos/34787494/pexels-photo-34787494.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (28, NULL, 'https://images.pexels.com/photos/35740501/pexels-photo-35740501.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 1),
    -- Bateaux sans permis (bateaux 32, 33, 34, 48, 49) — Pexels petits bateaux open
    (32, NULL, 'https://images.pexels.com/photos/13581883/pexels-photo-13581883.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (33, NULL, 'https://images.pexels.com/photos/9599914/pexels-photo-9599914.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (34, NULL, 'https://images.pexels.com/photos/6785289/pexels-photo-6785289.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (48, NULL, 'https://images.pexels.com/photos/28170856/pexels-photo-28170856.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0),
    (49, NULL, 'https://images.pexels.com/photos/11686040/pexels-photo-11686040.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 'bateau', 0)
    ON CONFLICT DO NOTHING
  `);

  // ── Avis locataire par bateau (au moins 5 par bateau) ─────────────────────────
  // Les avis codés en dur plus haut ne couvrent qu'une poignée de bateaux et de
  // façon inégale. On garantit ici, pour CHAQUE bateau publié, un lot fixe de 5
  // avis locataire frais (3 bien notés, 1 neutre, 1 critique) — en plus des avis
  // déjà créés au-dessus, jamais à leur place, donc aucun risque de repasser
  // sous le minimum voulu même si ces blocs venaient à changer.
  // Boat 8 (Camargue Spirit) reste exclu naturellement : jamais publié (cas de
  // test modération/signalements), il ne matche pas le filtre is_published.
  // Logique partagée avec prisma/addMissingReviews.js (qui ajoute les mêmes
  // avis à une base déjà peuplée, sans reseed complet).
  const REVIEWER_POOL = [6, 7, 8, 9, 10, 11, 12, 13];
  const reviewedBoats = await prisma.boat.findMany({
    where: { is_published: true },
    orderBy: { id_boat: 'asc' },
  });
  await seedBoatReviews(prisma, reviewedBoats, REVIEWER_POOL);

  // Statuts d'annonce des bateaux : en ligne → publiée, dépubliée → en attente
  // de validation ; plus deux exemples brouillon / refusé pour l'espace propriétaire.
  await prisma.$executeRawUnsafe(`
    INSERT INTO boat (id_user, id_port, name, type, size, engine, with_skipper, daily_price, capacity, build_year, registration, description, is_published, license_required) VALUES
    (3, 2, 'Sloop Horizon',     'voilier', 9.80, 'Diesel 20cv',   FALSE, 240.00, 4, 2010, 'FR-LRO-050', 'Annonce en cours de rédaction : description et photos à compléter avant soumission.', FALSE, TRUE),
    (2, 1, 'Vedette Calanques', 'moteur',  8.50, 'Essence 200cv', FALSE, 380.00, 6, 2019, 'FR-MRS-051', 'Vedette rapide pour explorer les calanques au départ de Marseille.', FALSE, TRUE)
    ON CONFLICT (registration) DO NOTHING
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE boat SET status = CASE WHEN is_published THEN 'published'::boat_status ELSE 'pending'::boat_status END
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE boat SET status = 'draft' WHERE registration = 'FR-LRO-050'
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE boat SET status = 'refused' WHERE registration = 'FR-MRS-051'
  `);

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
