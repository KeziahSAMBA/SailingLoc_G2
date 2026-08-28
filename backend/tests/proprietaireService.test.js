import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  boat: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  booking: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    aggregate: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  payment: { findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  document: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  port: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
  image: { createMany: jest.fn(), deleteMany: jest.fn(), updateMany: jest.fn() },
  boatAvailability: { deleteMany: jest.fn(), createMany: jest.fn() },
};
// Le client transactionnel est le même objet : les assertions portent
// indifféremment sur db.x ou sur le tx reçu par le callback.
db.$transaction = jest.fn((arg) => (typeof arg === 'function' ? arg(db) : Promise.all(arg)));
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

let stripe = null;
const mockCancelIntent = jest.fn().mockResolvedValue(undefined);
jest.unstable_mockModule('../src/config/stripe.js', () => ({
  getStripe: () => stripe,
  isStripeRef: (ref) => typeof ref === 'string' && ref.startsWith('pi_'),
  cancelIntentQuietly: mockCancelIntent,
  refundIntent: jest.fn().mockResolvedValue(null),
}));

jest.unstable_mockModule('../src/config/appConfig.js', () => ({
  initConfig: () => ({ APP_URL: 'https://sailingloc.fr' }),
}));

const mockSendDecisionEmail = jest.fn().mockResolvedValue();
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendBookingDecisionEmail: mockSendDecisionEmail,
}));

jest.unstable_mockModule('../src/services/invoiceService.js', () => ({
  issueBookingInvoices: jest.fn().mockResolvedValue(),
}));

const {
  getDashboardStats,
  listBookings,
  getBookingLocataire,
  listBoats,
  createBoat,
  getBoat,
  updateBoat,
  deleteBoat,
  getStripeAccountStatus,
  createStripeOnboardingLink,
  createStripeLoginLink,
  listPayments,
  setBookingStatus,
} = await import('../src/services/proprietaireService.js');

const OWNER = 10;

const validBoatPayload = (overrides = {}) => ({
  name: 'Pen Duick',
  type: 'voilier',
  registration: 'fr-mrs-042',
  size: '12.5',
  daily_price: '250',
  capacity: '6',
  build_year: '2015',
  id_port: '3',
  ...overrides,
});

const stripeMock = () => ({
  accounts: {
    retrieve: jest.fn(),
    create: jest.fn(),
    createLoginLink: jest.fn(),
  },
  accountLinks: { create: jest.fn() },
});

beforeEach(() => {
  jest.clearAllMocks();
  stripe = null;
  db.booking.findMany.mockResolvedValue([]);
  db.booking.count.mockResolvedValue(0);
  db.booking.aggregate.mockResolvedValue({ _sum: { total_amount: null } });
  db.boat.count.mockResolvedValue(0);
  db.boat.findMany.mockResolvedValue([]);
  db.boat.create.mockResolvedValue({ id_boat: 1, name: 'Pen Duick', status: 'pending' });
  db.boat.update.mockResolvedValue({ id_boat: 1, name: 'Pen Duick', status: 'pending' });
  db.document.count.mockResolvedValue(1);
  db.document.findMany.mockResolvedValue([]);
  db.port.findUnique.mockResolvedValue({ id_port: 3, name: 'Marseille', city: 'Marseille' });
  db.payment.findMany.mockResolvedValue([]);
  db.image.deleteMany.mockResolvedValue({ count: 0 });
  db.boatAvailability.deleteMany.mockResolvedValue({ count: 0 });
});

describe('getDashboardStats', () => {
  beforeEach(() => {
    db.boat.count.mockResolvedValue(3);
    db.booking.count.mockResolvedValue(2);
    db.booking.aggregate.mockResolvedValue({ _sum: { total_amount: '1500.50' } });
    db.booking.findMany.mockResolvedValue([]);
    db.boat.findMany.mockResolvedValue([]);
  });

  it('agrège les compteurs du tableau de bord', async () => {
    const stats = await getDashboardStats(OWNER);

    expect(stats).toMatchObject({ publishedBoats: 3, pendingBookings: 2, monthRevenue: 1500.5 });
  });

  it('renvoie 0 de revenus quand aucune réservation confirmée du mois', async () => {
    db.booking.aggregate.mockResolvedValue({ _sum: { total_amount: null } });

    const stats = await getDashboardStats(OWNER);

    expect(stats.monthRevenue).toBe(0);
  });

  it('convertit les montants décimaux des dernières réservations en nombres', async () => {
    db.booking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id_booking: 1, total_amount: '300.00', status: 'confirmed' }]);

    const stats = await getDashboardStats(OWNER);

    expect(stats.recentBookings[0].total_amount).toBe(300);
  });

  it('expose la première image de chaque bateau en aperçu', async () => {
    db.boat.findMany.mockResolvedValue([
      {
        id_boat: 1,
        name: 'Pen Duick',
        type: 'voilier',
        daily_price: '250',
        port: { name: 'Marseille', city: 'Marseille' },
        images: [{ url: 'http://x/1.png' }],
      },
    ]);

    const stats = await getDashboardStats(OWNER);

    expect(stats.boatsPreview[0]).toMatchObject({ daily_price: 250, image: 'http://x/1.png' });
  });

  it('met l’aperçu d’image à null quand le bateau n’a pas de photo', async () => {
    db.boat.findMany.mockResolvedValue([
      {
        id_boat: 1,
        name: 'Sans photo',
        type: 'voilier',
        daily_price: null,
        port: null,
        images: [],
      },
    ]);

    const stats = await getDashboardStats(OWNER);

    expect(stats.boatsPreview[0]).toMatchObject({ image: null, daily_price: 0 });
  });
});

describe('refuse automatiquement les demandes en attente déjà commencées', () => {
  it('ne fait rien quand aucune demande n’est périmée', async () => {
    db.booking.findMany.mockResolvedValue([]);

    await listBookings(OWNER);

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('refuse les demandes périmées et libère leurs empreintes Stripe', async () => {
    db.booking.findMany
      .mockResolvedValueOnce([
        { id_booking: 5, payments: [{ transaction_ref: 'pi_123' }] },
        { id_booking: 6, payments: [] },
      ])
      .mockResolvedValueOnce([]);

    await listBookings(OWNER);

    expect(mockCancelIntent).toHaveBeenCalledWith('pi_123');
    expect(db.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_booking: { in: [5, 6] } },
        data: expect.objectContaining({ status: 'refused' }),
      })
    );
  });

  it('marque les paiements associés comme remboursés, sans montant', async () => {
    db.booking.findMany
      .mockResolvedValueOnce([{ id_booking: 5, payments: [] }])
      .mockResolvedValueOnce([]);

    await listBookings(OWNER);

    expect(db.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'refunded' }) })
    );
  });
});

describe('listBookings', () => {
  const rawBooking = (overrides = {}) => ({
    id_booking: 5,
    start_date: new Date('2026-07-01'),
    end_date: new Date('2026-07-08'),
    status: 'confirmed',
    total_amount: '700.00',
    booking_date: new Date('2026-06-01'),
    cancellation_reason: null,
    cancellation_date: null,
    payments: [{ status: 'success' }],
    disputes: [],
    user: { first_name: 'Lea', last_name: 'Marin', email: 'lea@example.com' },
    boat: { name: 'Pen Duick', type: 'voilier', port: null, images: [{ url: 'http://x/1.png' }] },
    ...overrides,
  });

  it('met à plat la réservation pour le front', async () => {
    db.booking.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([rawBooking()]);

    const [booking] = await listBookings(OWNER);

    expect(booking).toMatchObject({
      id_booking: 5,
      total_amount: 700,
      payment_status: 'success',
      has_open_dispute: false,
      locataire: { first_name: 'Lea', last_name: 'Marin', email: 'lea@example.com' },
      boat: { name: 'Pen Duick', image: 'http://x/1.png' },
    });
  });

  it('signale un litige ouvert', async () => {
    db.booking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([rawBooking({ disputes: [{ id_dispute: 1 }] })]);

    const [booking] = await listBookings(OWNER);

    expect(booking.has_open_dispute).toBe(true);
  });

  it('renvoie un statut de paiement nul quand la demande n’est pas payée', async () => {
    db.booking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([rawBooking({ payments: [] })]);

    const [booking] = await listBookings(OWNER);

    expect(booking.payment_status).toBeNull();
  });

  it('tolère un locataire ou un bateau manquant', async () => {
    db.booking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([rawBooking({ user: null, boat: null })]);

    const [booking] = await listBookings(OWNER);

    expect(booking.locataire).toBeNull();
    expect(booking.boat).toEqual({
      name: undefined,
      type: undefined,
      port: undefined,
      image: null,
    });
  });
});

describe('getBookingLocataire', () => {
  it('renvoie le profil du locataire et ses documents', async () => {
    db.booking.findFirst.mockResolvedValue({ user: { id_user: 3, first_name: 'Lea' } });
    db.document.findMany.mockResolvedValue([{ id_document: 1, type: 'permis_conduire' }]);

    const result = await getBookingLocataire(OWNER, '5');

    expect(result.locataire).toMatchObject({ id_user: 3 });
    expect(result.documents).toHaveLength(1);
  });

  it('cloisonne la recherche sur les bateaux du propriétaire', async () => {
    db.booking.findFirst.mockResolvedValue({ user: { id_user: 3 } });

    await getBookingLocataire(OWNER, '5');

    expect(db.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id_booking: 5,
          boat: { id_user: OWNER, deleted_at: null },
        }),
      })
    );
  });

  it.each([
    ['réservation inexistante', null],
    ['réservation sans locataire', { user: null }],
  ])('renvoie 404 pour une %s', async (_label, booking) => {
    db.booking.findFirst.mockResolvedValue(booking);

    await expect(getBookingLocataire(OWNER, '5')).rejects.toMatchObject({ status: 404 });
    expect(db.document.findMany).not.toHaveBeenCalled();
  });
});

describe('listBoats', () => {
  it('met à plat les bateaux avec leur nombre de demandes en attente', async () => {
    db.boat.findMany.mockResolvedValue([
      {
        id_boat: 1,
        name: 'Pen Duick',
        type: 'voilier',
        daily_price: '250.00',
        capacity: 6,
        registration: 'FR-MRS-042',
        status: 'published',
        created_at: new Date(),
        port: { name: 'Marseille', city: 'Marseille' },
        images: [{ url: 'http://x/1.png' }],
        _count: { bookings: 2 },
      },
    ]);

    const [boat] = await listBoats(OWNER);

    expect(boat).toMatchObject({ daily_price: 250, image: 'http://x/1.png', pending_bookings: 2 });
  });

  it('accepte un brouillon sans prix ni photo', async () => {
    db.boat.findMany.mockResolvedValue([
      {
        id_boat: 2,
        name: 'Brouillon',
        type: null,
        daily_price: null,
        capacity: null,
        registration: null,
        status: 'draft',
        created_at: new Date(),
        port: null,
        images: [],
        _count: { bookings: 0 },
      },
    ]);

    const [boat] = await listBoats(OWNER);

    expect(boat).toMatchObject({ daily_price: null, image: null });
  });
});

describe('createBoat — validation des caractéristiques', () => {
  it.each([
    ['nom manquant', { name: '' }, 'Le nom du bateau est obligatoire.'],
    ['type inconnu', { type: 'sous_marin' }, 'Type de bateau invalide.'],
    ['immatriculation absente', { registration: '' }, "L'immatriculation est obligatoire."],
    ['taille absente', { size: '' }, 'La taille (en mètres) est obligatoire.'],
    ['prix absent', { daily_price: '' }, 'Le prix par jour est obligatoire.'],
    ['capacité absente', { capacity: '' }, 'La capacité est obligatoire.'],
  ])('refuse un %s', async (_label, patch, message) => {
    await expect(createBoat(OWNER, validBoatPayload(patch))).rejects.toMatchObject({
      status: 400,
      message,
    });
    expect(db.boat.create).not.toHaveBeenCalled();
  });

  it.each([
    ['immatriculation mal formée', { registration: 'FR123' }],
    ['taille négative', { size: '-3' }],
    ['taille non numérique', { size: 'douze' }],
    ['prix nul', { daily_price: '0' }],
    ['capacité à zéro', { capacity: '0' }],
    ['capacité décimale', { capacity: '2.5' }],
    ['année trop ancienne', { build_year: '1850' }],
    ['année dans le futur', { build_year: String(new Date().getFullYear() + 1) }],
  ])('refuse une %s', async (_label, patch) => {
    await expect(createBoat(OWNER, validBoatPayload(patch))).rejects.toMatchObject({ status: 400 });
  });

  it('normalise l’immatriculation en majuscules', async () => {
    await createBoat(OWNER, validBoatPayload({ registration: 'fr-mrs-042' }));

    expect(db.boat.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ registration: 'FR-MRS-042' }) })
    );
  });

  it('interprète with_skipper et license_required depuis des chaînes de formulaire', async () => {
    db.document.count.mockResolvedValue(1);

    await createBoat(OWNER, validBoatPayload({ with_skipper: 'true', license_required: 'false' }));

    expect(db.boat.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ with_skipper: true, license_required: false }),
      })
    );
  });

  it('exige moins de champs pour un brouillon', async () => {
    await expect(
      createBoat(OWNER, { name: 'Brouillon', type: 'voilier', draft: 'true' })
    ).resolves.toMatchObject({ status: 'pending' });
    expect(db.boat.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'draft' }) })
    );
  });
});

describe('createBoat — port d’attache', () => {
  it('réutilise un port existant par identifiant', async () => {
    db.port.findUnique.mockResolvedValue({ id_port: 3, name: 'Marseille', city: 'Marseille' });

    const result = await createBoat(OWNER, validBoatPayload({ id_port: '3' }));

    expect(result.port).toEqual({ id_port: 3, name: 'Marseille', city: 'Marseille' });
  });

  it.each([
    ['port inexistant', null],
    ['port supprimé', { id_port: 3, deleted_at: new Date() }],
  ])('refuse un %s', async (_label, port) => {
    db.port.findUnique.mockResolvedValue(port);

    await expect(createBoat(OWNER, validBoatPayload({ id_port: '3' }))).rejects.toMatchObject({
      status: 400,
    });
  });

  it('réutilise un port trouvé par nom, sans tenir compte de la casse', async () => {
    db.port.findFirst.mockResolvedValue({ id_port: 4, name: 'Marseille', deleted_at: null });

    const result = await createBoat(
      OWNER,
      validBoatPayload({ id_port: undefined, port_name: 'marseille' })
    );

    expect(db.port.findFirst).toHaveBeenCalledWith({
      where: { name: { equals: 'marseille', mode: 'insensitive' } },
    });
    expect(result.port.id_port).toBe(4);
  });

  it('réactive un port qui avait été supprimé', async () => {
    db.port.findFirst.mockResolvedValue({ id_port: 4, deleted_at: new Date() });
    db.port.update.mockResolvedValue({ id_port: 4, name: 'Marseille', city: 'Marseille' });

    await createBoat(OWNER, validBoatPayload({ id_port: undefined, port_name: 'Marseille' }));

    expect(db.port.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deleted_at: null }) })
    );
  });

  it('crée un port inédit, en déduisant département et région du code INSEE', async () => {
    db.port.findFirst.mockResolvedValue(null);
    db.port.create.mockResolvedValue({ id_port: 9, name: 'Sète', city: 'Sète' });

    await createBoat(
      OWNER,
      validBoatPayload({
        id_port: undefined,
        port_name: 'Sète',
        port_city: 'Sète',
        port_insee: '34301',
        port_latitude: '43.4',
        port_longitude: '3.7',
      })
    );

    expect(db.port.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Sète',
          city: 'Sète',
          country: 'France',
          department: '34',
          latitude: 43.4,
          longitude: 3.7,
        }),
      })
    );
  });

  it('refuse un nom de port fait uniquement d’espaces', async () => {
    await expect(
      createBoat(OWNER, validBoatPayload({ id_port: undefined, port_name: '   ' }))
    ).rejects.toMatchObject({ status: 400, message: "Le port d'attache est obligatoire." });
  });

  it('exige une ville pour créer un port inédit', async () => {
    db.port.findFirst.mockResolvedValue(null);

    await expect(
      createBoat(OWNER, validBoatPayload({ id_port: undefined, port_name: 'Sète' }))
    ).rejects.toMatchObject({ status: 400 });
  });

  it('exige un port à la soumission', async () => {
    await expect(createBoat(OWNER, validBoatPayload({ id_port: undefined }))).rejects.toMatchObject(
      { status: 400, message: "Le port d'attache est obligatoire." }
    );
  });

  it('accepte un brouillon sans port', async () => {
    const result = await createBoat(OWNER, {
      name: 'Brouillon',
      type: 'voilier',
      draft: 'true',
    });

    expect(result.port).toBeNull();
  });
});

describe('createBoat — disponibilités', () => {
  it('enregistre les périodes envoyées en JSON', async () => {
    await createBoat(
      OWNER,
      validBoatPayload({
        availabilities: JSON.stringify([
          { start_date: '2026-07-01', end_date: '2026-07-15', price_override: '300', notes: 'Été' },
        ]),
      })
    );

    expect(db.boatAvailability.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          price_override: 300,
          notes: 'Été',
          is_available: true,
          id_boat: 1,
        }),
      ],
    });
  });

  it.each([
    ['JSON illisible', '{pas du json'],
    ['objet au lieu d’un tableau', JSON.stringify({ start_date: '2026-07-01' })],
  ])('refuse des disponibilités en %s', async (_label, availabilities) => {
    await expect(createBoat(OWNER, validBoatPayload({ availabilities }))).rejects.toMatchObject({
      status: 400,
      message: 'Disponibilités invalides.',
    });
  });

  it.each([
    ['fin antérieure au début', { start_date: '2026-07-15', end_date: '2026-07-01' }],
    ['dates identiques', { start_date: '2026-07-01', end_date: '2026-07-01' }],
    ['date illisible', { start_date: 'hier', end_date: '2026-07-01' }],
  ])('refuse une période avec %s', async (_label, period) => {
    await expect(
      createBoat(OWNER, validBoatPayload({ availabilities: JSON.stringify([period]) }))
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refuse un prix spécifique négatif', async () => {
    await expect(
      createBoat(
        OWNER,
        validBoatPayload({
          availabilities: JSON.stringify([
            { start_date: '2026-07-01', end_date: '2026-07-15', price_override: '-50' },
          ]),
        })
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it('n’écrit aucune période quand la liste est absente', async () => {
    await createBoat(OWNER, validBoatPayload());

    expect(db.boatAvailability.createMany).not.toHaveBeenCalled();
  });
});

describe('createBoat — skipper, photos et acte de francisation', () => {
  it('exige un CV marin pour proposer un skipper', async () => {
    db.document.count.mockResolvedValue(0);

    await expect(
      createBoat(OWNER, validBoatPayload({ with_skipper: 'true' }))
    ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/CV marin/) });
  });

  it('ne réclame pas de CV marin sur un brouillon avec skipper', async () => {
    db.document.count.mockResolvedValue(0);

    await expect(
      createBoat(OWNER, { name: 'Brouillon', type: 'voilier', draft: 'true', with_skipper: 'true' })
    ).resolves.toBeDefined();
  });

  it('enregistre les photos dans l’ordre reçu', async () => {
    await createBoat(
      OWNER,
      validBoatPayload(),
      { images: [{ filename: 'a.png' }, { filename: 'b.png' }] },
      'https://api.sailingloc.fr'
    );

    expect(db.image.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ url: 'https://api.sailingloc.fr/uploads/boats/a.png', order: 0 }),
        expect.objectContaining({ url: 'https://api.sailingloc.fr/uploads/boats/b.png', order: 1 }),
      ],
    });
  });

  it('crée un document pour un acte de francisation téléversé', async () => {
    await createBoat(OWNER, validBoatPayload(), {
      acteFrancisation: { originalname: 'acte.pdf', path: 'storage\\documents\\acte.pdf' },
    });

    expect(db.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'acte_francisation',
          file_url: 'storage/documents/acte.pdf',
          status: 'pending',
        }),
      })
    );
  });

  it('rattache un acte de francisation déjà déposé', async () => {
    db.document.findUnique.mockResolvedValue({
      id_document: 8,
      id_user: OWNER,
      id_boat: null,
      type: 'acte_francisation',
    });

    await createBoat(OWNER, validBoatPayload({ acte_francisation_id: '8' }));

    expect(db.document.update).toHaveBeenCalledWith({
      where: { id_document: 8 },
      data: { id_boat: 1 },
    });
  });

  it.each([
    ['document inexistant', null],
    [
      'document d’un autre propriétaire',
      { id_document: 8, id_user: 99, type: 'acte_francisation' },
    ],
    ['document du mauvais type', { id_document: 8, id_user: OWNER, type: 'permis_conduire' }],
  ])('refuse le rattachement d’un %s', async (_label, doc) => {
    db.document.findUnique.mockResolvedValue(doc);

    await expect(
      createBoat(OWNER, validBoatPayload({ acte_francisation_id: '8' }))
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refuse un acte déjà rattaché à un autre bateau', async () => {
    db.document.findUnique.mockResolvedValue({
      id_document: 8,
      id_user: OWNER,
      id_boat: 42,
      type: 'acte_francisation',
    });

    await expect(
      createBoat(OWNER, validBoatPayload({ acte_francisation_id: '8' }))
    ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/déjà rattaché/) });
  });

  it('traduit un conflit d’immatriculation en 409', async () => {
    db.boat.create.mockRejectedValue(
      Object.assign(new Error('Unique constraint'), { code: 'P2002' })
    );

    await expect(createBoat(OWNER, validBoatPayload())).rejects.toMatchObject({
      status: 409,
      message: 'Cette immatriculation est déjà utilisée.',
    });
  });

  it('laisse remonter une panne inattendue', async () => {
    db.boat.create.mockRejectedValue(new Error('Connexion perdue'));

    await expect(createBoat(OWNER, validBoatPayload())).rejects.toThrow('Connexion perdue');
  });
});

describe('getBoat', () => {
  const storedBoat = (overrides = {}) => ({
    id_boat: 1,
    id_user: OWNER,
    deleted_at: null,
    name: 'Pen Duick',
    type: 'voilier',
    size: '12.5',
    engine: 'Yanmar',
    with_skipper: false,
    daily_price: '250',
    capacity: 6,
    build_year: 2015,
    registration: 'FR-MRS-042',
    description: null,
    license_required: true,
    status: 'published',
    port: { id_port: 3, name: 'Marseille', city: 'Marseille' },
    images: [{ id_image: 1, url: 'http://x/1.png' }],
    documents: [],
    availabilities: [],
    ...overrides,
  });

  it('renvoie le détail avec les décimaux convertis', async () => {
    db.boat.findUnique.mockResolvedValue(storedBoat());

    const boat = await getBoat(OWNER, '1');

    expect(boat).toMatchObject({ size: 12.5, daily_price: 250, acte_francisation: null });
  });

  it('convertit les prix spécifiques des périodes', async () => {
    db.boat.findUnique.mockResolvedValue(
      storedBoat({
        availabilities: [
          { start_date: new Date(), end_date: new Date(), price_override: '300', notes: null },
          { start_date: new Date(), end_date: new Date(), price_override: null, notes: 'Hiver' },
        ],
      })
    );

    const boat = await getBoat(OWNER, '1');

    expect(boat.availabilities[0].price_override).toBe(300);
    expect(boat.availabilities[1].price_override).toBeNull();
  });

  it('expose l’acte de francisation le plus récent', async () => {
    db.boat.findUnique.mockResolvedValue(
      storedBoat({ documents: [{ id_document: 8, file_name: 'acte.pdf', status: 'validated' }] })
    );

    const boat = await getBoat(OWNER, '1');

    expect(boat.acte_francisation).toMatchObject({ id_document: 8 });
  });

  it('accepte un brouillon aux champs numériques vides', async () => {
    db.boat.findUnique.mockResolvedValue(storedBoat({ size: null, daily_price: null }));

    const boat = await getBoat(OWNER, '1');

    expect(boat).toMatchObject({ size: null, daily_price: null });
  });

  it.each([
    ['bateau inexistant', null],
    ['bateau supprimé', { id_user: OWNER, deleted_at: new Date() }],
    ['bateau d’un autre propriétaire', { id_user: 99, deleted_at: null }],
  ])('renvoie 404 pour un %s', async (_label, boat) => {
    db.boat.findUnique.mockResolvedValue(boat);

    await expect(getBoat(OWNER, '1')).rejects.toMatchObject({ status: 404 });
  });
});

describe('updateBoat', () => {
  const existingBoat = (overrides = {}) => ({
    id_boat: 1,
    id_user: OWNER,
    deleted_at: null,
    status: 'published',
    name: 'Pen Duick',
    type: 'voilier',
    size: '12.5',
    engine: null,
    with_skipper: false,
    capacity: 6,
    build_year: 2015,
    registration: 'FR-MRS-042',
    description: null,
    license_required: true,
    images: [{ id_image: 1 }],
    ...overrides,
  });

  const unchangedPayload = (overrides = {}) =>
    validBoatPayload({
      size: '12.5',
      capacity: '6',
      build_year: '2015',
      existing_images: JSON.stringify([1]),
      ...overrides,
    });

  it.each([
    ['bateau inexistant', null],
    ['bateau supprimé', { id_user: OWNER, deleted_at: new Date() }],
    ['bateau d’un autre propriétaire', { id_user: 99, deleted_at: null }],
  ])('renvoie 404 pour un %s', async (_label, boat) => {
    db.boat.findUnique.mockResolvedValue(boat);

    await expect(updateBoat(OWNER, '1', validBoatPayload())).rejects.toMatchObject({ status: 404 });
  });

  it('garde une annonce publiée en ligne quand rien de substantiel ne change', async () => {
    db.boat.findUnique.mockResolvedValue(existingBoat());

    await updateBoat(OWNER, '1', unchangedPayload());

    expect(db.boat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'published', is_published: true }),
      })
    );
  });

  it('laisse changer le prix sans repasser en validation', async () => {
    db.boat.findUnique.mockResolvedValue(existingBoat());

    await updateBoat(OWNER, '1', unchangedPayload({ daily_price: '400' }));

    expect(db.boat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'published' }) })
    );
  });

  it.each([
    ['le nom', { name: 'Nouveau nom' }],
    ['le type', { type: 'catamaran' }],
    ['la taille', { size: '15' }],
    ['la capacité', { capacity: '8' }],
    ['l’immatriculation', { registration: 'FR-MRS-999' }],
    ['la description', { description: 'Nouvelle description' }],
    ['le moteur', { engine: 'Volvo' }],
    ['l’année', { build_year: '2016' }],
    ['le permis requis', { license_required: 'false' }],
  ])('renvoie l’annonce en validation quand %s change', async (_label, patch) => {
    db.boat.findUnique.mockResolvedValue(existingBoat());

    await updateBoat(OWNER, '1', unchangedPayload(patch));

    expect(db.boat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending', is_published: false }),
      })
    );
  });

  it('renvoie en validation quand une photo est ajoutée', async () => {
    db.boat.findUnique.mockResolvedValue(existingBoat());

    await updateBoat(OWNER, '1', unchangedPayload(), { images: [{ filename: 'c.png' }] });

    expect(db.boat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'pending' }) })
    );
  });

  it('renvoie en validation quand une photo est retirée', async () => {
    db.boat.findUnique.mockResolvedValue(
      existingBoat({ images: [{ id_image: 1 }, { id_image: 2 }] })
    );

    await updateBoat(OWNER, '1', unchangedPayload({ existing_images: JSON.stringify([1]) }));

    expect(db.boat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'pending' }) })
    );
  });

  it('renvoie une annonce refusée en validation', async () => {
    db.boat.findUnique.mockResolvedValue(existingBoat({ status: 'refused' }));

    await updateBoat(OWNER, '1', unchangedPayload());

    expect(db.boat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'pending' }) })
    );
  });

  it('permet à un brouillon de rester brouillon', async () => {
    db.boat.findUnique.mockResolvedValue(existingBoat({ status: 'draft' }));

    await updateBoat(OWNER, '1', { name: 'Brouillon', type: 'voilier', draft: 'true' });

    expect(db.boat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'draft' }) })
    );
  });

  it('soumet un brouillon quand draft n’est plus demandé', async () => {
    db.boat.findUnique.mockResolvedValue(existingBoat({ status: 'draft' }));

    await updateBoat(OWNER, '1', unchangedPayload());

    expect(db.boat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'pending' }) })
    );
  });

  it('supprime les photos non conservées et ré-ordonne les autres', async () => {
    db.boat.findUnique.mockResolvedValue(
      existingBoat({ images: [{ id_image: 1 }, { id_image: 2 }] })
    );

    await updateBoat(OWNER, '1', unchangedPayload({ existing_images: JSON.stringify([2, 1]) }));

    expect(db.image.deleteMany).toHaveBeenCalledWith({
      where: { id_boat: 1, id_image: { notIn: [2, 1] } },
    });
    expect(db.image.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id_boat: 1, id_image: 2 },
      data: { order: 0 },
    });
  });

  it('ajoute les nouvelles photos à la suite des conservées', async () => {
    db.boat.findUnique.mockResolvedValue(existingBoat());

    await updateBoat(
      OWNER,
      '1',
      unchangedPayload({ existing_images: JSON.stringify([1]) }),
      { images: [{ filename: 'c.png' }] },
      'https://api.sailingloc.fr'
    );

    expect(db.image.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ order: 1 })],
    });
  });

  it('traite une liste de photos conservées illisible comme vide', async () => {
    db.boat.findUnique.mockResolvedValue(existingBoat());

    await updateBoat(OWNER, '1', unchangedPayload({ existing_images: '{cassé' }));

    expect(db.image.deleteMany).toHaveBeenCalledWith({
      where: { id_boat: 1, id_image: { notIn: [] } },
    });
  });

  it('remplace l’acte de francisation par le fichier téléversé', async () => {
    db.boat.findUnique.mockResolvedValue(existingBoat());
    db.document.findMany.mockResolvedValue([{ id_document: 5, file_url: 'storage/ancien.pdf' }]);

    await updateBoat(OWNER, '1', unchangedPayload(), {
      acteFrancisation: { originalname: 'acte.pdf', path: 'storage/acte.pdf' },
    });

    expect(db.document.deleteMany).toHaveBeenCalledWith({
      where: { id_boat: 1, type: 'acte_francisation' },
    });
    expect(db.document.create).toHaveBeenCalled();
  });

  it('remplace toutes les disponibilités', async () => {
    db.boat.findUnique.mockResolvedValue(existingBoat());

    await updateBoat(
      OWNER,
      '1',
      unchangedPayload({
        availabilities: JSON.stringify([{ start_date: '2026-07-01', end_date: '2026-07-15' }]),
      })
    );

    expect(db.boatAvailability.deleteMany).toHaveBeenCalledWith({ where: { id_boat: 1 } });
    expect(db.boatAvailability.createMany).toHaveBeenCalled();
  });

  it('rattache un acte de francisation existant et supprime les anciens', async () => {
    db.boat.findUnique.mockResolvedValue(existingBoat());
    db.document.findMany.mockResolvedValue([{ id_document: 5, file_url: 'storage/ancien.pdf' }]);
    db.document.findUnique.mockResolvedValue({
      id_document: 8,
      id_user: OWNER,
      id_boat: null,
      type: 'acte_francisation',
    });

    await updateBoat(OWNER, '1', unchangedPayload({ acte_francisation_id: '8' }));

    expect(db.document.deleteMany).toHaveBeenCalledWith({
      where: { id_boat: 1, type: 'acte_francisation', id_document: { not: 8 } },
    });
    expect(db.document.update).toHaveBeenCalledWith({
      where: { id_document: 8 },
      data: { id_boat: 1 },
    });
  });

  it('traduit un conflit d’immatriculation en 409', async () => {
    db.boat.findUnique.mockResolvedValue(existingBoat());
    db.boat.update.mockRejectedValue(Object.assign(new Error('Unique'), { code: 'P2002' }));

    await expect(updateBoat(OWNER, '1', unchangedPayload())).rejects.toMatchObject({ status: 409 });
  });

  it('laisse remonter une panne inattendue', async () => {
    db.boat.findUnique.mockResolvedValue(existingBoat());
    db.boat.update.mockRejectedValue(new Error('Connexion perdue'));

    await expect(updateBoat(OWNER, '1', unchangedPayload())).rejects.toThrow('Connexion perdue');
  });
});

describe('setBookingStatus — cas non couverts par le parcours nominal', () => {
  const day = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  };

  const storedBooking = (overrides = {}) => ({
    id_booking: 5,
    id_boat: 2,
    status: 'pending',
    deleted_at: null,
    start_date: day(3),
    end_date: day(6),
    total_amount: '300',
    user: { first_name: 'Lea', email: 'lea@example.com' },
    boat: { id_user: OWNER, name: 'Pen Duick' },
    payments: [
      {
        id_payment: 11,
        status: 'pending',
        amount: '300',
        commission: '30',
        transaction_ref: 'pi_1',
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    db.booking.findUnique.mockResolvedValue(storedBooking());
    db.booking.findFirst.mockResolvedValue(null);
    db.booking.update.mockResolvedValue({ id_booking: 5, status: 'confirmed' });
    db.payment.findMany.mockResolvedValue([]);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it.each(['publish', '', 'delete'])('refuse l’action inconnue « %s »', async (action) => {
    await expect(setBookingStatus(OWNER, '5', action)).rejects.toMatchObject({
      status: 400,
      message: 'Action invalide.',
    });
    expect(db.booking.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['confirm', 'confirmed'],
    ['refuse', 'cancelled'],
    ['cancel', 'refused'],
  ])('refuse l’action %s sur une réservation « %s »', async (action, status) => {
    db.booking.findUnique.mockResolvedValue(storedBooking({ status }));

    await expect(setBookingStatus(OWNER, '5', action)).rejects.toMatchObject({ status: 400 });
  });

  it('refuse de confirmer une demande dont le séjour a déjà commencé', async () => {
    db.booking.findUnique.mockResolvedValue(storedBooking({ start_date: day(-1) }));

    await expect(setBookingStatus(OWNER, '5', 'confirm')).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/déjà passée/),
    });
  });

  it('refuse de confirmer quand un créneau confirmé chevauche déjà', async () => {
    db.booking.findFirst.mockResolvedValue({ id_booking: 9 });

    await expect(setBookingStatus(OWNER, '5', 'confirm')).rejects.toMatchObject({ status: 409 });
  });

  it('refuse de confirmer si la carte du locataire n’a jamais été validée', async () => {
    stripe = { paymentIntents: { retrieve: jest.fn(), capture: jest.fn() } };
    stripe.paymentIntents.retrieve.mockResolvedValue({ status: 'requires_payment_method' });

    await expect(setBookingStatus(OWNER, '5', 'confirm')).rejects.toMatchObject({
      status: 409,
      message: expect.stringMatching(/carte non validée/),
    });
    expect(stripe.paymentIntents.capture).not.toHaveBeenCalled();
    expect(db.booking.update).not.toHaveBeenCalled();
  });

  it('capture le paiement et libère les empreintes concurrentes à la confirmation', async () => {
    stripe = { paymentIntents: { retrieve: jest.fn(), capture: jest.fn() } };
    stripe.paymentIntents.retrieve.mockResolvedValue({ status: 'requires_capture' });
    db.payment.findMany.mockResolvedValue([{ transaction_ref: 'pi_rival' }]);

    await setBookingStatus(OWNER, '5', 'confirm');

    expect(stripe.paymentIntents.capture).toHaveBeenCalledWith('pi_1');
    expect(mockCancelIntent).toHaveBeenCalledWith('pi_rival');
    expect(db.payment.update).toHaveBeenCalledWith({
      where: { id_payment: 11 },
      data: { status: 'success' },
    });
  });

  it('maintient la décision même si la notification par email échoue', async () => {
    mockSendDecisionEmail.mockRejectedValue(new Error('SMTP indisponible'));

    await expect(setBookingStatus(OWNER, '5', 'confirm')).resolves.toMatchObject({
      id_booking: 5,
      status: 'confirmed',
    });
  });
});

describe('deleteBoat', () => {
  it('supprime le bateau et libère son acte de francisation', async () => {
    db.boat.findUnique.mockResolvedValue({ id_user: OWNER, deleted_at: null });
    db.booking.count.mockResolvedValue(0);

    await deleteBoat(OWNER, '1');

    expect(db.boat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ is_published: false }) })
    );
    expect(db.document.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { id_boat: null } })
    );
  });

  it('refuse la suppression tant que des réservations sont en cours ou à venir', async () => {
    db.boat.findUnique.mockResolvedValue({ id_user: OWNER, deleted_at: null });
    db.booking.count.mockResolvedValue(2);

    await expect(deleteBoat(OWNER, '1')).rejects.toMatchObject({ status: 409 });
    expect(db.boat.update).not.toHaveBeenCalled();
  });

  it.each([
    ['bateau inexistant', null],
    ['bateau déjà supprimé', { id_user: OWNER, deleted_at: new Date() }],
    ['bateau d’un autre propriétaire', { id_user: 99, deleted_at: null }],
  ])('renvoie 404 pour un %s', async (_label, boat) => {
    db.boat.findUnique.mockResolvedValue(boat);

    await expect(deleteBoat(OWNER, '1')).rejects.toMatchObject({ status: 404 });
  });
});

describe('compte Stripe Connect', () => {
  it('signale Stripe désactivé quand aucune clé n’est configurée', async () => {
    stripe = null;

    await expect(getStripeAccountStatus(OWNER)).resolves.toEqual({
      enabled: false,
      has_account: false,
      onboarded: false,
    });
  });

  it('signale l’absence de compte Stripe pour le propriétaire', async () => {
    stripe = stripeMock();
    db.user.findUnique.mockResolvedValue({ stripe_account_id: null });

    await expect(getStripeAccountStatus(OWNER)).resolves.toEqual({
      enabled: true,
      has_account: false,
      onboarded: false,
    });
  });

  it.each([
    ['complet', { details_submitted: true, charges_enabled: true }, true],
    ['formulaire incomplet', { details_submitted: false, charges_enabled: true }, false],
    ['paiements non activés', { details_submitted: true, charges_enabled: false }, false],
  ])('rapporte un onboarding %s', async (_label, account, expected) => {
    stripe = stripeMock();
    db.user.findUnique.mockResolvedValue({ stripe_account_id: 'acct_1' });
    stripe.accounts.retrieve.mockResolvedValue(account);

    const status = await getStripeAccountStatus(OWNER);

    expect(status.onboarded).toBe(expected);
  });

  it('refuse l’onboarding quand Stripe n’est pas configuré', async () => {
    stripe = null;

    await expect(createStripeOnboardingLink(OWNER)).rejects.toMatchObject({ status: 503 });
  });

  it('crée le compte Express au premier onboarding et le mémorise', async () => {
    stripe = stripeMock();
    db.user.findUnique.mockResolvedValue({ stripe_account_id: null, email: 'proprio@example.com' });
    stripe.accounts.create.mockResolvedValue({ id: 'acct_new' });
    stripe.accountLinks.create.mockResolvedValue({ url: 'https://connect.stripe.com/setup' });

    const result = await createStripeOnboardingLink(OWNER);

    expect(stripe.accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'express', country: 'FR', email: 'proprio@example.com' })
    );
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stripe_account_id: 'acct_new' }) })
    );
    expect(result).toEqual({ url: 'https://connect.stripe.com/setup' });
  });

  it('réutilise le compte Express existant', async () => {
    stripe = stripeMock();
    db.user.findUnique.mockResolvedValue({ stripe_account_id: 'acct_1' });
    stripe.accountLinks.create.mockResolvedValue({ url: 'https://connect.stripe.com/again' });

    await createStripeOnboardingLink(OWNER);

    expect(stripe.accounts.create).not.toHaveBeenCalled();
    expect(stripe.accountLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'acct_1',
        return_url: 'https://sailingloc.fr/proprietaire/revenus?stripe=done',
      })
    );
  });

  it('refuse le lien de connexion quand Stripe n’est pas configuré', async () => {
    stripe = null;

    await expect(createStripeLoginLink(OWNER)).rejects.toMatchObject({ status: 503 });
  });

  it('refuse le lien de connexion sans compte Stripe', async () => {
    stripe = stripeMock();
    db.user.findUnique.mockResolvedValue({ stripe_account_id: null });

    await expect(createStripeLoginLink(OWNER)).rejects.toMatchObject({ status: 409 });
  });

  it('renvoie le lien vers le dashboard Express', async () => {
    stripe = stripeMock();
    db.user.findUnique.mockResolvedValue({ stripe_account_id: 'acct_1' });
    stripe.accounts.createLoginLink.mockResolvedValue({ url: 'https://dashboard.stripe.com/x' });

    await expect(createStripeLoginLink(OWNER)).resolves.toEqual({
      url: 'https://dashboard.stripe.com/x',
    });
  });
});

describe('listPayments', () => {
  const payment = (overrides = {}) => ({
    id_payment: 1,
    transaction_ref: 'pi_1',
    payment_date: new Date('2026-06-01'),
    payment_method: 'card',
    status: 'success',
    amount: '700',
    commission: '70',
    refunded_amount: null,
    refunded_at: null,
    refund_reason: null,
    booking: {
      id_booking: 5,
      start_date: new Date(),
      end_date: new Date(),
      boat: { name: 'Pen Duick' },
      user: { first_name: 'Lea', last_name: 'Marin' },
    },
    ...overrides,
  });

  it('calcule le net après commission sur chaque ligne', async () => {
    db.payment.findMany.mockResolvedValue([payment()]);

    const { payments } = await listPayments(OWNER);

    expect(payments[0]).toMatchObject({ amount: 700, commission: 70, net: 630 });
  });

  it('n’agrège que les paiements réussis dans les totaux', async () => {
    db.payment.findMany.mockResolvedValue([
      payment(),
      payment({ id_payment: 2, status: 'pending', amount: '500', commission: '50' }),
      payment({ id_payment: 3, status: 'failed', amount: '900', commission: '90' }),
    ]);

    const { totals } = await listPayments(OWNER);

    expect(totals).toEqual({ gross: 700, commission: 70, net: 630, success_count: 1 });
  });

  it('renvoie des totaux à zéro sans paiement', async () => {
    db.payment.findMany.mockResolvedValue([]);

    const { totals } = await listPayments(OWNER);

    expect(totals).toEqual({ gross: 0, commission: 0, net: 0, success_count: 0 });
  });

  it('assemble le nom du locataire', async () => {
    db.payment.findMany.mockResolvedValue([payment()]);

    const { payments } = await listPayments(OWNER);

    expect(payments[0].booking.locataire).toBe('Lea Marin');
  });

  it('expose les informations de remboursement', async () => {
    db.payment.findMany.mockResolvedValue([
      payment({ refunded_amount: '350', refunded_at: new Date(), refund_reason: 'Annulation' }),
    ]);

    const { payments } = await listPayments(OWNER);

    expect(payments[0]).toMatchObject({ refunded_amount: 350, refund_reason: 'Annulation' });
  });

  it('tolère un paiement sans réservation rattachée', async () => {
    db.payment.findMany.mockResolvedValue([payment({ booking: null })]);

    const { payments } = await listPayments(OWNER);

    expect(payments[0].booking).toBeNull();
  });
});
