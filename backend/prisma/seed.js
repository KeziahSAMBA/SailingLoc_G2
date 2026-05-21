import { PrismaClient } from '@prisma/client';

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
      booking_document, payment, review, image, user_boat_favorite,
      message, document, booking, boat, port, "user"
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

  // Ports
  await prisma.$executeRawUnsafe(`
    INSERT INTO port (name, city, country, latitude, longitude) VALUES
    ('Port Vieux',           'Antibes',           'France',  43.584100,  7.125300),
    ('Port de la Joliette',  'Marseille',         'France',  43.351900,  5.355300),
    ('Port des Minimes',     'La Rochelle',       'France',  46.146700, -1.174400),
    ('Port de Socoa',        'Saint-Jean-de-Luz', 'France',  43.393900, -1.681600),
    ('Port Camargue',        'Le Grau-du-Roi',    'France',  43.524500,  4.134200),
    ('Port de Cannes',       'Cannes',            'France',  43.547700,  7.017700),
    ('Port de Saint-Tropez', 'Saint-Tropez',      'France',  43.272800,  6.638100),
    ('Port de Brest',        'Brest',             'France',  48.387200, -4.494900)
    ON CONFLICT (name) DO NOTHING
  `);

  // Boats
  await prisma.$executeRawUnsafe(`
    INSERT INTO boat (id_user, id_port, name, type, size, engine, with_skipper, daily_price, capacity, build_year, registration, description, is_published) VALUES
    (2, 1, 'Le Mistral',      'voilier',   12.50, 'Diesel 30cv',   FALSE, 350.00, 6,  2015, 'FR-ANT-001', 'Magnifique voilier idéal pour la Méditerranée. Équipé de tous les instruments modernes.',          TRUE),
    (2, 2, 'Soleil Levant',   'catamaran', 14.00, 'Diesel 2x40cv', TRUE,  680.00, 8,  2018, 'FR-MRS-002', 'Catamaran spacieux avec skipper expérimenté. Parfait pour les familles et groupes.',              TRUE),
    (3, 3, 'Atlantique',      'voilier',   10.00, 'Diesel 25cv',   FALSE, 280.00, 4,  2012, 'FR-LRO-003', 'Voilier sobre et fiable pour naviguer sur l''Atlantique. Idéal pour les amateurs confirmés.',    TRUE),
    (3, 4, 'Euskal Herria',   'moteur',     9.50, 'Essence 150cv', FALSE, 420.00, 5,  2020, 'FR-SJL-004', 'Bateau à moteur rapide et puissant, idéal pour les excursions côtières du Pays Basque.',         TRUE),
    (4, 6, 'Belle de Cannes', 'voilier',   13.00, 'Diesel 35cv',   FALSE, 390.00, 6,  2016, 'FR-CAN-005', 'Voilier élégant amarré à Cannes, parfait pour explorer les îles de Lérins.',                    TRUE),
    (4, 7, 'Côte d''Azur',   'catamaran', 15.50, 'Diesel 2x50cv', TRUE,  750.00, 10, 2021, 'FR-STP-006', 'Grand catamaran de luxe avec skipper, départ Saint-Tropez. Vue imprenable sur la côte.',        TRUE),
    (5, 8, 'Finistère',       'voilier',   11.00, 'Diesel 28cv',   FALSE, 260.00, 5,  2014, 'FR-BRT-007', 'Voilier robuste taillé pour la Bretagne et ses eaux parfois agitées.',                          TRUE),
    (5, 5, 'Camargue Spirit', 'catamaran', 11.00, 'Diesel 2x30cv', FALSE, 500.00, 6,  2017, 'FR-GDR-008', 'Catamaran confortable au départ de Port Camargue, idéal pour explorer la côte languedocienne.', FALSE)
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
    (11, 4, '2025-10-10', '2025-10-13', 'cancelled',  1260.00, '2025-08-15 13:00:00')
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
    (10,  4, 'Bonjour Pierre, est-il possible de louer la Belle de Cannes avec un départ le 20 juillet ?',   '2025-05-30 14:00:00', TRUE,  '2025-05-30 16:00:00'),
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
    INSERT INTO review (id_user, id_booking, rating, comment, status) VALUES
    ( 6,  1, 5, 'Superbe semaine à bord du Mistral, bateau en parfait état et propriétaire très accueillant !',     'validated'),
    ( 7,  2, 4, 'Très beau catamaran, skipper professionnel et sympa. Un peu cher mais ça valait largement.',        'validated'),
    ( 7,  5, 5, 'Deuxième location sur Le Mistral, toujours aussi parfait. Je recommande vivement !',                'validated'),
    (10,  7, 4, 'Belle de Cannes est un voilier magnifique, très bien entretenu. Pierre est un super propriétaire.', 'validated'),
    (11,  8, 5, 'Le Côte d''Azur est exceptionnel ! Skipper au top, luxe et confort au rendez-vous.',               'validated'),
    (12,  9, 3, 'Finistère correct mais quelques petits équipements à revoir. Expérience globalement positive.',     'pending'),
    ( 9, 12, 5, 'Superbe balade avec le Finistère, parfait pour la Bretagne. Je reviendrai !',                       'validated'),
    ( 8, 11, 4, 'Belle de Cannes très agréable pour un week-end. Tout était propre et bien rangé.',                  'pending')
    ON CONFLICT DO NOTHING
  `);

  // Images
  await prisma.$executeRawUnsafe(`
    INSERT INTO image (id_boat, id_user, url, type, "order") VALUES
    (NULL,  1, 'https://randomuser.me/api/portraits/men/1.jpg',    'profil', 0),
    (NULL,  2, 'https://randomuser.me/api/portraits/men/32.jpg',   'profil', 0),
    (NULL,  3, 'https://randomuser.me/api/portraits/women/44.jpg', 'profil', 0),
    (NULL,  4, 'https://randomuser.me/api/portraits/men/55.jpg',   'profil', 0),
    (NULL,  6, 'https://randomuser.me/api/portraits/men/23.jpg',   'profil', 0),
    (NULL,  7, 'https://randomuser.me/api/portraits/women/17.jpg', 'profil', 0),
    (NULL,  9, 'https://randomuser.me/api/portraits/women/62.jpg', 'profil', 0),
    (NULL, 11, 'https://randomuser.me/api/portraits/women/28.jpg', 'profil', 0),
    (NULL, 13, 'https://randomuser.me/api/portraits/women/91.jpg', 'profil', 0),
    (1, NULL, 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=1200', 'principale', 0),
    (1, NULL, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200', 'galerie',    1),
    (1, NULL, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200', 'galerie',    2),
    (2, NULL, 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200', 'principale', 0),
    (2, NULL, 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=1200', 'galerie',    1),
    (2, NULL, 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200', 'galerie',    2),
    (3, NULL, 'https://images.unsplash.com/photo-1559666126-84f389727b9a?w=1200', 'principale', 0),
    (3, NULL, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200', 'galerie',    1),
    (4, NULL, 'https://images.unsplash.com/photo-1591905867018-95bfd08cde8e?w=1200', 'principale', 0),
    (4, NULL, 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1200', 'galerie',    1),
    (5, NULL, 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=1200', 'principale', 0),
    (5, NULL, 'https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=1200', 'galerie',    1),
    (5, NULL, 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=1200', 'galerie',    2),
    (6, NULL, 'https://images.unsplash.com/photo-1533760881669-80db4d7b341d?w=1200', 'principale', 0),
    (6, NULL, 'https://images.unsplash.com/photo-1548515894-b4fabb59e9af?w=1200', 'galerie',    1),
    (6, NULL, 'https://images.unsplash.com/photo-1552083375-1447ce886485?w=1200', 'galerie',    2),
    (7, NULL, 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=1200', 'principale', 0),
    (7, NULL, 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200', 'galerie',    1),
    (8, NULL, 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200', 'principale', 0),
    (8, NULL, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200', 'galerie',    1)
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

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
