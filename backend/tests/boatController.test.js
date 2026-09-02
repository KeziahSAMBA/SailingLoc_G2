import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = { boat: { findMany: jest.fn() }, review: { findMany: jest.fn() } };
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

// Bateau tel que renvoyé par Prisma. Les réservations remontées sont déjà
// filtrées par la base — confirmées et non échues — et réduites à leurs dates ;
// le compte de popularité arrive dans _count.
const rawBoat = (overrides = {}) => ({
  id_boat: 1,
  name: 'Pen Duick',
  type: 'voilier',
  bookings: [],
  _count: { bookings: 0 },
  ...overrides,
});

const range = (start, end) => ({ start_date: new Date(start), end_date: new Date(end) });

// Avis tel que le renvoie la requête dédiée, rattaché à son bateau par la
// réservation dont il dépend.
const reviewOf = (id_boat, rating, comment = null) => ({
  rating,
  comment,
  booking: { id_boat },
});

const bookingsWhere = () => db.boat.findMany.mock.calls[0][0].include.bookings.where;

let res;

beforeEach(() => {
  jest.clearAllMocks();
  res = makeRes();
  db.boat.findMany.mockResolvedValue([]);
  db.review.findMany.mockResolvedValue([]);
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
    db.boat.findMany.mockResolvedValue([rawBoat()]);
    db.review.findMany.mockResolvedValue([
      reviewOf(1, 5, 'Super'),
      reviewOf(1, 4, null),
      reviewOf(1, 4, '  '),
    ]);

    await controller.getBoats(makeReq(), res);

    const [boat] = res.json.mock.calls[0][0];
    expect(boat.avg_rating).toBe(4.3);
    expect(boat.review_count).toBe(3);
  });

  it('ne compte comme commentaires que les avis au texte non vide', async () => {
    db.boat.findMany.mockResolvedValue([rawBoat()]);
    db.review.findMany.mockResolvedValue([
      reviewOf(1, 5, 'Super'),
      reviewOf(1, 4, '   '),
      reviewOf(1, 3, null),
    ]);

    await controller.getBoats(makeReq(), res);

    expect(res.json.mock.calls[0][0][0].comment_count).toBe(1);
  });

  it('renvoie une note nulle en l’absence d’avis', async () => {
    db.boat.findMany.mockResolvedValue([rawBoat()]);

    await controller.getBoats(makeReq(), res);

    expect(res.json.mock.calls[0][0][0]).toMatchObject({ avg_rating: null, review_count: 0 });
  });

  it('rattache chaque avis au bateau dont il dépend', async () => {
    db.boat.findMany.mockResolvedValue([rawBoat({ id_boat: 1 }), rawBoat({ id_boat: 2 })]);
    db.review.findMany.mockResolvedValue([reviewOf(1, 5, 'Top'), reviewOf(2, 3, null)]);

    await controller.getBoats(makeReq(), res);

    const [premier, second] = res.json.mock.calls[0][0];
    expect(premier).toMatchObject({ avg_rating: 5, review_count: 1, comment_count: 1 });
    expect(second).toMatchObject({ avg_rating: 3, review_count: 1, comment_count: 0 });
  });

  it('n’interroge les avis que des annonces listées', async () => {
    db.boat.findMany.mockResolvedValue([rawBoat({ id_boat: 4 }), rawBoat({ id_boat: 9 })]);

    await controller.getBoats(makeReq(), res);

    expect(db.review.findMany.mock.calls[0][0].where).toEqual({
      status: 'validated',
      deleted_at: null,
      booking: { id_boat: { in: [4, 9] } },
    });
  });

  it('n’interroge pas les avis sans annonce à enrichir', async () => {
    await controller.getBoats(makeReq(), res);

    expect(db.review.findMany).not.toHaveBeenCalled();
  });

  it('laisse la base compter les réservations confirmées', async () => {
    db.boat.findMany.mockResolvedValue([rawBoat({ _count: { bookings: 3 } })]);

    await controller.getBoats(makeReq(), res);

    const { _count } = db.boat.findMany.mock.calls[0][0].include;
    expect(_count.select.bookings.where).toEqual({ status: { in: ['confirmed'] } });
    expect(res.json.mock.calls[0][0][0].booking_count).toBe(3);
  });

  it('ne demande que les réservations confirmées non échues', async () => {
    await controller.getBoats(makeReq(), res);

    const where = bookingsWhere();
    expect(where.status).toEqual({ in: ['confirmed'] });
    expect(where.end_date.gte).toBeInstanceOf(Date);
  });

  // Les colonnes de dates sont des DATE, restituées à minuit UTC : une borne
  // prise à minuit local exclurait les réservations s'achevant aujourd'hui sur
  // tout serveur situé à l'ouest de Greenwich.
  it('borne les créneaux à minuit UTC du jour courant', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-01T23:30:00Z'));

    await controller.getBoats(makeReq(), res);

    expect(bookingsWhere().end_date.gte.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    jest.useRealTimers();
  });

  // La borne était figée si l'include restait une constante de module : le
  // serveur aurait gardé la date de son démarrage jusqu'au redéploiement.
  it('recalcule la borne du jour à chaque appel', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-01T12:00:00Z'));
    await controller.getBoats(makeReq(), res);

    jest.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    await controller.getBoats(makeReq(), res);

    const [premier, second] = db.boat.findMany.mock.calls.map(
      (call) => call[0].include.bookings.where.end_date.gte
    );
    expect(premier.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(second.toISOString()).toBe('2026-06-15T00:00:00.000Z');
    jest.useRealTimers();
  });

  it('projette les créneaux renvoyés par la base', async () => {
    db.boat.findMany.mockResolvedValue([
      rawBoat({ bookings: [range('2026-07-01', '2026-07-08')] }),
    ]);

    await controller.getBoats(makeReq(), res);

    expect(res.json.mock.calls[0][0][0].booked_ranges).toEqual([
      { start_date: new Date('2026-07-01'), end_date: new Date('2026-07-08') },
    ]);
  });

  it('retire le détail brut des réservations de la réponse', async () => {
    db.boat.findMany.mockResolvedValue([
      rawBoat({ bookings: [range('2026-07-01', '2026-07-08')], _count: { bookings: 1 } }),
    ]);

    await controller.getBoats(makeReq(), res);

    const [boat] = res.json.mock.calls[0][0];
    expect(boat).not.toHaveProperty('bookings');
    expect(boat).not.toHaveProperty('_count');
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
    db.boat.findMany.mockResolvedValue([rawBoat()]);
    db.review.findMany.mockResolvedValue([reviewOf(1, 5, 'Top')]);

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
