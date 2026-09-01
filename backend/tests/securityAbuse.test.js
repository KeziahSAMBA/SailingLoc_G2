import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: { updateMany: jest.fn() },
  boat: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  port: { findMany: jest.fn() },
  boatReport: {
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  review: { findMany: jest.fn() },
};
db.$transaction = jest.fn((fn) => fn(db));

jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendBoatUnpublishedEmail: jest.fn().mockResolvedValue(undefined),
  sendBoatRepublishedEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.unstable_mockModule('../src/services/bookingService.js', () => ({
  createBooking: jest.fn(),
}));
jest.unstable_mockModule('../src/services/proprietaireService.js', () => ({
  createBoat: jest.fn(),
  updateBoat: jest.fn(),
  deleteBoat: jest.fn(),
}));

const { updateUserByAdmin, listUsers } = await import('../src/services/adminUserService.js');
const { listBoats, setBoatPublished } = await import('../src/services/boatAdminService.js');
const { getBoats, getBoatsByType } = await import('../src/controllers/boatController.js');
const { getPorts } = await import('../src/controllers/portController.js');
const { getBoatReviews, getPublicReviews } = await import('../src/controllers/reviewController.js');

const USER = {
  id_user: 7,
  first_name: 'Lea',
  last_name: 'Martin',
  email: 'lea@example.com',
  role: 'locataire',
  phone: null,
  is_active: true,
  deleted_at: null,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
};

const BOAT = {
  id_boat: 12,
  name: 'Pen Duick',
  type: 'voilier',
  daily_price: '100',
  is_published: true,
  status: 'published',
  deleted_at: null,
  registration: 'FR-TEST-012',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  owner: {
    id_user: 3,
    first_name: 'Luc',
    last_name: 'Martin',
    email: 'luc@example.com',
  },
};

function response() {
  const res = { locals: {}, statusCode: 200 };
  res.status = jest.fn((status) => {
    res.statusCode = status;
    return res;
  });
  res.json = jest.fn((body) => body);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  db.$transaction.mockImplementation((fn) => fn(db));
  db.user.findUnique.mockResolvedValue(USER);
  db.user.update.mockImplementation(({ data }) => Promise.resolve({ ...USER, ...data }));
  db.refreshToken.updateMany.mockResolvedValue({ count: 1 });
  db.boat.findUnique.mockResolvedValue(BOAT);
  db.boat.update.mockImplementation(({ data }) => Promise.resolve({ ...BOAT, ...data }));
  db.boatReport.updateMany.mockResolvedValue({ count: 0 });
  db.boatReport.count.mockResolvedValue(0);
  db.boat.findMany.mockResolvedValue([]);
  db.port.findMany.mockResolvedValue([]);
  db.review.findMany.mockResolvedValue([]);
});

describe('strict administrative booleans', () => {
  it("interprets the string 'false' as false when changing a user's state", async () => {
    await updateUserByAdmin(7, 1, { is_active: 'false' });

    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ is_active: false }) })
    );
  });

  it('rejects malformed user state values before touching the database', async () => {
    await expect(updateUserByAdmin(7, 1, { is_active: '0' })).rejects.toMatchObject({
      status: 400,
    });
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects malformed publication filters instead of silently ignoring them', async () => {
    await expect(listUsers({ active: 'maybe' })).rejects.toMatchObject({ status: 400 });
    await expect(listBoats({ published: 'maybe' })).rejects.toMatchObject({ status: 400 });
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.boat.findMany).not.toHaveBeenCalled();
  });

  it("interprets the string 'false' as false when unpublishing a boat", async () => {
    await setBoatPublished('12', 'false');

    expect(db.boat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ is_published: false }) })
    );
  });

  it('rejects malformed publication values before looking up the boat', async () => {
    await expect(setBoatPublished(12, 'falsey')).rejects.toMatchObject({ status: 400 });
    expect(db.boat.findUnique).not.toHaveBeenCalled();
  });
});

describe('bounded public boat and review queries', () => {
  it('expose les photos historiques et récentes, sans ouvrir les autres types', async () => {
    const res = response();
    db.boat.findMany.mockResolvedValue([
      {
        ...BOAT,
        bookings: [],
        images: [
          { url: 'https://images.example/historique.jpg' },
          { url: 'http://localhost:4000/uploads/boats/recent.webp' },
        ],
      },
    ]);

    await getBoats({ query: {} }, res);

    const args = db.boat.findMany.mock.calls[0][0];
    expect(args.select.images.where).toEqual({
      deleted_at: null,
      type: { in: ['boat', 'bateau'] },
    });
    expect(res.json.mock.calls[0][0][0].images).toEqual([
      { url: 'https://images.example/historique.jpg' },
      { url: 'http://localhost:4000/uploads/boats/recent.webp' },
    ]);
  });

  it('keeps the public boat array response while applying bounded pagination', async () => {
    const res = response();
    await getBoats({ query: { page: '2', pageSize: '9999' } }, res);

    const args = db.boat.findMany.mock.calls[0][0];
    expect(args).toEqual(expect.objectContaining({ skip: 500, take: 500 }));
    expect(args.select.bookings).toEqual(expect.objectContaining({ take: 500 }));
    expect(res.json).toHaveBeenCalledWith([]);
    expect(Array.isArray(res.json.mock.calls[0][0])).toBe(true);
  });

  it('retire les champs internes de la projection publique des bateaux', async () => {
    const res = response();
    db.boat.findMany.mockResolvedValue([
      {
        ...BOAT,
        id_port: 4,
        bookings: [],
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    await getBoats({ query: {} }, res);

    const args = db.boat.findMany.mock.calls[0][0];
    expect(args.select).not.toHaveProperty('id_user');
    expect(args.select).not.toHaveProperty('registration');
    expect(args.select).not.toHaveProperty('created_at');
    expect(args.select).not.toHaveProperty('updated_at');
    expect(args.select).not.toHaveProperty('deleted_at');
    expect(res.json.mock.calls[0][0][0]).not.toHaveProperty('id_user');
    expect(res.json.mock.calls[0][0][0]).not.toHaveProperty('registration');
    expect(res.json.mock.calls[0][0][0]).not.toHaveProperty('created_at');
    expect(res.json.mock.calls[0][0][0]).not.toHaveProperty('updated_at');
    expect(res.json.mock.calls[0][0][0]).not.toHaveProperty('deleted_at');
  });

  it('regroupe plus de 25 bateaux sans dépasser la borne publique globale', async () => {
    const res = response();
    db.boat.findMany.mockResolvedValue(
      Array.from({ length: 30 }, (_, index) => ({
        ...BOAT,
        id_boat: index + 1,
        type: `type-${index + 1}`,
        bookings: [],
      }))
    );
    await getBoatsByType({ query: {} }, res);

    const args = db.boat.findMany.mock.calls[0][0];
    expect(args).toEqual(expect.objectContaining({ skip: 0, take: 500 }));
    expect(args.select).not.toHaveProperty('id_user');
    expect(args.select).not.toHaveProperty('registration');
    expect(args.select).not.toHaveProperty('created_at');
    expect(args.select).not.toHaveProperty('updated_at');
    expect(args.select).not.toHaveProperty('deleted_at');
    const sections = res.json.mock.calls[0][0];
    expect(sections).toHaveLength(30);
    expect(sections[29]).toEqual(
      expect.objectContaining({
        type: 'type-30',
        boats: [expect.objectContaining({ id_boat: 30 })],
      })
    );
  });

  it('returns 400 for invalid public pagination', async () => {
    const res = response();
    await getBoats({ query: { pageSize: '0' } }, res);

    expect(res.statusCode).toBe(400);
    expect(db.boat.findMany).not.toHaveBeenCalled();
  });

  it('bounds the global public review array and preserves its shape', async () => {
    const res = response();
    await getPublicReviews({ query: { page: '3', pageSize: '50' } }, res);

    const args = db.review.findMany.mock.calls[0][0];
    expect(args).toEqual(expect.objectContaining({ skip: 100, take: 50 }));
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('autorise uniquement les avatars publics historiques et actuels', async () => {
    const res = response();
    db.review.findMany.mockResolvedValue([
      {
        id_review: 3,
        id_user: 7,
        rating: 5,
        comment: 'Très bon séjour.',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        owner_reply: null,
        booking: { id_boat: 12 },
        user: {
          first_name: 'Lea',
          last_name: 'Martin',
          role: 'locataire',
          images: [{ url: 'https://images.example/avatar.webp' }],
        },
      },
    ]);

    await getPublicReviews({ query: {} }, res);

    const imageFilter = db.review.findMany.mock.calls[0][0].select.user.select.images.where;
    expect(imageFilter).toEqual({
      type: { in: ['profil', 'avatar'] },
      deleted_at: null,
    });
    expect(imageFilter.type.in).not.toContain('document');
    expect(res.json.mock.calls[0][0][0].avatar).toBe('https://images.example/avatar.webp');
  });

  it('minimise la projection publique des ports et exclut les ports supprimés', async () => {
    const res = response();
    db.port.findMany.mockResolvedValue([
      {
        id_port: 2,
        name: 'Port test',
        city: 'Marseille',
        country: 'France',
        department: '13',
        region: 'Provence-Alpes-Côte d’Azur',
        latitude: '43.29',
        longitude: '5.36',
        image_url: 'https://images.example/port.webp',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);

    await getPorts({ query: {} }, res);

    const args = db.port.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ deleted_at: null });
    expect(args.select).toEqual({
      id_port: true,
      name: true,
      city: true,
      country: true,
      department: true,
      region: true,
      latitude: true,
      longitude: true,
      image_url: true,
    });
    expect(res.json.mock.calls[0][0][0]).toEqual({
      id_port: 2,
      name: 'Port test',
      city: 'Marseille',
      country: 'France',
      department: '13',
      region: 'Provence-Alpes-Côte d’Azur',
      latitude: '43.29',
      longitude: '5.36',
      image_url: 'https://images.example/port.webp',
    });
  });

  it('bounds per-boat reviews and preserves the { reviews } response', async () => {
    const res = response();
    await getBoatReviews(
      { params: { id_boat: '12' }, query: { pageSize: '900' }, user: null },
      res
    );

    const args = db.review.findMany.mock.calls[0][0];
    expect(args).toEqual(expect.objectContaining({ skip: 0, take: 500 }));
    expect(res.json).toHaveBeenCalledWith({ reviews: [] });
  });

  it('rejects exponent notation for public boat ids', async () => {
    const res = response();
    await getPublicReviews({ query: { id_boat: '1e2' } }, res);

    expect(res.statusCode).toBe(400);
    expect(db.review.findMany).not.toHaveBeenCalled();
  });
});
