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
  it('keeps the public boat array response while applying bounded pagination', async () => {
    const res = response();
    await getBoats({ query: { page: '2', pageSize: '9999' } }, res);

    const args = db.boat.findMany.mock.calls[0][0];
    expect(args).toEqual(expect.objectContaining({ skip: 500, take: 500 }));
    expect(args.include.bookings).toEqual(expect.objectContaining({ take: 500 }));
    expect(res.json).toHaveBeenCalledWith([]);
    expect(Array.isArray(res.json.mock.calls[0][0])).toBe(true);
  });

  it('bounds the grouped boat endpoint without changing its section response', async () => {
    const res = response();
    await getBoatsByType({ query: {} }, res);

    const args = db.boat.findMany.mock.calls[0][0];
    expect(args).toEqual(expect.objectContaining({ skip: 0, take: 25 }));
    expect(res.json).toHaveBeenCalledWith([]);
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
