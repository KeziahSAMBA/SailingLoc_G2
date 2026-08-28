import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = { boat: { findMany: jest.fn() } };
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const mockCreateBooking = jest.fn();
jest.unstable_mockModule('../src/services/bookingService.js', () => ({
  createBooking: mockCreateBooking,
}));

const proprietaire = {
  createBoat: jest.fn(),
  updateBoat: jest.fn(),
  deleteBoat: jest.fn(),
};
jest.unstable_mockModule('../src/services/proprietaireService.js', () => proprietaire);

const controller = await import('../src/controllers/boatController.js');

function makeRes() {
  const res = { locals: {} };
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function makeReq(overrides = {}) {
  return {
    body: {},
    params: {},
    user: { id_user: 7 },
    protocol: 'https',
    get: () => 'api.sailingloc.fr',
    ...overrides,
  };
}

const httpError = (status, message) => Object.assign(new Error(message), { status });

// Bateau tel que renvoyé par Prisma, avec ses réservations et leurs avis.
const rawBoat = (overrides = {}) => ({
  id_boat: 1,
  name: 'Pen Duick',
  type: 'voilier',
  bookings: [],
  ...overrides,
});

const bookingWith = (status, reviews = [], dates = {}) => ({
  status,
  start_date: dates.start ?? new Date('2026-07-01'),
  end_date: dates.end ?? new Date('2026-07-08'),
  reviews,
});

let res;

beforeEach(() => {
  jest.clearAllMocks();
  res = makeRes();
  db.boat.findMany.mockResolvedValue([]);
  proprietaire.createBoat.mockResolvedValue({ id_boat: 1, name: 'Pen Duick' });
  proprietaire.updateBoat.mockResolvedValue({ id_boat: 1, name: 'Pen Duick' });
  proprietaire.deleteBoat.mockResolvedValue(undefined);
  mockCreateBooking.mockResolvedValue({ id_booking: 5 });
});

describe('getBoats — enrichissement des annonces', () => {
  it('ne liste que les annonces publiées', async () => {
    await controller.getBoats(makeReq(), res);

    expect(db.boat.findMany.mock.calls[0][0].where).toEqual({ is_published: true });
  });

  it('calcule la note moyenne arrondie au dixième', async () => {
    db.boat.findMany.mockResolvedValue([
      rawBoat({
        bookings: [
          bookingWith('confirmed', [
            { rating: 5, comment: 'Super' },
            { rating: 4, comment: null },
          ]),
          bookingWith('confirmed', [{ rating: 4, comment: '  ' }]),
        ],
      }),
    ]);

    await controller.getBoats(makeReq(), res);

    const [boat] = res.json.mock.calls[0][0];
    expect(boat.avg_rating).toBe(4.3);
    expect(boat.review_count).toBe(3);
  });

  it('ne compte comme commentaires que les avis au texte non vide', async () => {
    db.boat.findMany.mockResolvedValue([
      rawBoat({
        bookings: [
          bookingWith('confirmed', [
            { rating: 5, comment: 'Super' },
            { rating: 4, comment: '   ' },
            { rating: 3, comment: null },
          ]),
        ],
      }),
    ]);

    await controller.getBoats(makeReq(), res);

    expect(res.json.mock.calls[0][0][0].comment_count).toBe(1);
  });

  it('renvoie une note nulle en l’absence d’avis', async () => {
    db.boat.findMany.mockResolvedValue([rawBoat({ bookings: [bookingWith('confirmed')] })]);

    await controller.getBoats(makeReq(), res);

    expect(res.json.mock.calls[0][0][0]).toMatchObject({ avg_rating: null, review_count: 0 });
  });

  it('ne compte que les réservations confirmées', async () => {
    db.boat.findMany.mockResolvedValue([
      rawBoat({
        bookings: [
          bookingWith('confirmed'),
          bookingWith('pending'),
          bookingWith('cancelled'),
          bookingWith('refused'),
        ],
      }),
    ]);

    await controller.getBoats(makeReq(), res);

    expect(res.json.mock.calls[0][0][0].booking_count).toBe(1);
  });

  it('ne bloque le calendrier que sur les réservations confirmées', async () => {
    db.boat.findMany.mockResolvedValue([
      rawBoat({
        bookings: [
          bookingWith('confirmed', [], {
            start: new Date('2026-07-01'),
            end: new Date('2026-07-08'),
          }),
          bookingWith('pending', [], {
            start: new Date('2026-08-01'),
            end: new Date('2026-08-08'),
          }),
        ],
      }),
    ]);

    await controller.getBoats(makeReq(), res);

    const [boat] = res.json.mock.calls[0][0];
    expect(boat.booked_ranges).toEqual([
      { start_date: new Date('2026-07-01'), end_date: new Date('2026-07-08') },
    ]);
  });

  it('retire le détail brut des réservations de la réponse', async () => {
    db.boat.findMany.mockResolvedValue([rawBoat({ bookings: [bookingWith('confirmed')] })]);

    await controller.getBoats(makeReq(), res);

    expect(res.json.mock.calls[0][0][0]).not.toHaveProperty('bookings');
  });

  it('renvoie une liste vide sans annonce publiée', async () => {
    await controller.getBoats(makeReq(), res);

    expect(res.json).toHaveBeenCalledWith([]);
  });
});

describe('getBoatsByType', () => {
  it('regroupe par type et plafonne à 3 bateaux par section', async () => {
    db.boat.findMany.mockResolvedValue([
      rawBoat({ id_boat: 1, type: 'voilier' }),
      rawBoat({ id_boat: 2, type: 'voilier' }),
      rawBoat({ id_boat: 3, type: 'voilier' }),
      rawBoat({ id_boat: 4, type: 'voilier' }),
      rawBoat({ id_boat: 5, type: 'catamaran' }),
    ]);

    await controller.getBoatsByType(makeReq(), res);

    const sections = res.json.mock.calls[0][0];
    expect(sections).toHaveLength(2);
    expect(sections.find((s) => s.type === 'voilier').boats).toHaveLength(3);
    expect(sections.find((s) => s.type === 'catamaran').boats).toHaveLength(1);
  });

  it('renvoie une liste vide sans annonce', async () => {
    await controller.getBoatsByType(makeReq(), res);

    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('enrichit aussi les bateaux groupés', async () => {
    db.boat.findMany.mockResolvedValue([
      rawBoat({ bookings: [bookingWith('confirmed', [{ rating: 5, comment: 'Top' }])] }),
    ]);

    await controller.getBoatsByType(makeReq(), res);

    expect(res.json.mock.calls[0][0][0].boats[0]).toMatchObject({ avg_rating: 5 });
  });
});

describe('création et modification d’annonce', () => {
  it('transmet les fichiers séparés et l’origine à la création', async () => {
    const req = makeReq({
      body: { name: 'Pen Duick' },
      files: { images: [{ filename: 'a.png' }], acte_francisation: [{ originalname: 'acte.pdf' }] },
    });

    await controller.uploadBoat(req, res);

    expect(proprietaire.createBoat).toHaveBeenCalledWith(
      7,
      { name: 'Pen Duick' },
      { images: [{ filename: 'a.png' }], acteFrancisation: { originalname: 'acte.pdf' } },
      'https://api.sailingloc.fr'
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('dépose l’identifiant créé pour la trace d’audit', async () => {
    await controller.uploadBoat(makeReq(), res);

    expect(res.locals.auditTargetId).toBe('1');
  });

  it('remplace des fichiers absents par des valeurs vides', async () => {
    await controller.uploadBoat(makeReq(), res);

    expect(proprietaire.createBoat).toHaveBeenCalledWith(
      7,
      {},
      { images: [], acteFrancisation: null },
      'https://api.sailingloc.fr'
    );
  });

  it('relaie un conflit d’immatriculation', async () => {
    proprietaire.createBoat.mockRejectedValue(httpError(409, 'Immatriculation déjà utilisée.'));

    await controller.uploadBoat(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.locals.auditTargetId).toBeUndefined();
  });

  it('transmet l’identifiant du bateau à la mise à jour', async () => {
    const req = makeReq({ params: { id_boat: '1' }, body: { name: 'Nouveau' } });

    await controller.putBoat(req, res);

    expect(proprietaire.updateBoat).toHaveBeenCalledWith(
      7,
      '1',
      { name: 'Nouveau' },
      { images: [], acteFrancisation: null },
      'https://api.sailingloc.fr'
    );
    expect(res.json).toHaveBeenCalledWith({ boat: { id_boat: 1, name: 'Pen Duick' } });
  });

  it('relaie un bateau introuvable à la mise à jour', async () => {
    proprietaire.updateBoat.mockRejectedValue(httpError(404, 'Bateau introuvable.'));

    await controller.putBoat(makeReq({ params: { id_boat: '1' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('confirme la suppression d’une annonce', async () => {
    await controller.removeBoat(makeReq({ params: { id_boat: '1' } }), res);

    expect(proprietaire.deleteBoat).toHaveBeenCalledWith(7, '1');
    expect(res.json).toHaveBeenCalledWith({ deleted: true });
  });

  it('relaie une suppression bloquée par des réservations', async () => {
    proprietaire.deleteBoat.mockRejectedValue(httpError(409, 'Réservations en cours.'));

    await controller.removeBoat(makeReq({ params: { id_boat: '1' } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('création de réservation', () => {
  it('convertit l’identifiant de bateau et répond 201', async () => {
    const req = makeReq({
      params: { id_boat: '4' },
      body: { start_date: '2026-07-01', end_date: '2026-07-08' },
    });

    await controller.createBookingController(req, res);

    expect(mockCreateBooking).toHaveBeenCalledWith({
      id_user: 7,
      id_boat: 4,
      start_date: '2026-07-01',
      end_date: '2026-07-08',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.locals.auditTargetId).toBe('5');
  });

  it('relaie des dates indisponibles', async () => {
    mockCreateBooking.mockRejectedValue(httpError(409, 'Dates indisponibles.'));

    await controller.createBookingController(makeReq({ params: { id_boat: '4' } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.locals.auditTargetId).toBeUndefined();
  });
});

describe('repli sur 500', () => {
  it.each([
    ['uploadBoat', proprietaire, 'createBoat', {}],
    ['putBoat', proprietaire, 'updateBoat', { id_boat: '1' }],
    ['removeBoat', proprietaire, 'deleteBoat', { id_boat: '1' }],
  ])('%s répond 500 sur une erreur sans statut', async (handler, module, fn, params) => {
    module[fn].mockRejectedValue(new Error('Panne inattendue'));

    await controller[handler](makeReq({ params }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Panne inattendue' });
  });

  it('createBookingController répond 500 sur une erreur sans statut', async () => {
    mockCreateBooking.mockRejectedValue(new Error('Panne inattendue'));

    await controller.createBookingController(makeReq({ params: { id_boat: '4' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
