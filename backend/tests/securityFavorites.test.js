import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockBoatFindFirst = jest.fn();
const mockFavoriteFindMany = jest.fn();
const mockFavoriteCount = jest.fn();
const mockFavoriteDeleteMany = jest.fn();
const mockFavoriteUpsert = jest.fn();
const mockBookingCount = jest.fn();
const mockBookingFindFirst = jest.fn();
const mockBookingFindMany = jest.fn();
const mockMessageCount = jest.fn();
const mockDocumentFindMany = jest.fn();

jest.unstable_mockModule('../src/config/db.js', () => ({
  default: {
    boat: { findFirst: mockBoatFindFirst },
    userBoatFavorite: {
      findMany: mockFavoriteFindMany,
      count: mockFavoriteCount,
      deleteMany: mockFavoriteDeleteMany,
      upsert: mockFavoriteUpsert,
    },
    booking: {
      count: mockBookingCount,
      findFirst: mockBookingFindFirst,
      findMany: mockBookingFindMany,
    },
    message: { count: mockMessageCount },
    document: { findMany: mockDocumentFindMany },
  },
}));

const { getDashboardStats, listFavorites, addFavorite } =
  await import('../src/services/locataireService.js');

const publicBoat = {
  id_boat: 21,
  name: 'Voilier public',
  type: 'voilier',
  daily_price: '125',
  capacity: 6,
  port: { name: 'Vieux-Port', city: 'Marseille' },
  images: [{ url: '/uploads/boats/public.jpg' }],
};

const publicBoatWhere = {
  deleted_at: null,
  is_published: true,
  status: 'published',
  owner: { is_active: true, deleted_at: null, role: 'proprietaire' },
  port: { deleted_at: null },
};

describe('favorite visibility and authorization', () => {
  beforeEach(() => {
    mockBoatFindFirst.mockReset();
    mockFavoriteFindMany.mockReset().mockResolvedValue([]);
    mockFavoriteCount.mockReset().mockResolvedValue(0);
    mockFavoriteDeleteMany.mockReset().mockResolvedValue({ count: 0 });
    mockFavoriteUpsert.mockReset().mockResolvedValue({});
    mockBookingCount.mockReset().mockResolvedValue(0);
    mockBookingFindFirst.mockReset().mockResolvedValue(null);
    mockBookingFindMany.mockReset().mockResolvedValue([]);
    mockMessageCount.mockReset().mockResolvedValue(0);
    mockDocumentFindMany.mockReset().mockResolvedValue([]);
  });

  it.each([
    ['missing', null],
    ['unpublished', { id_boat: 21, is_published: false, status: 'pending', deleted_at: null }],
    [
      'soft-deleted',
      { id_boat: 21, is_published: true, status: 'published', deleted_at: new Date() },
    ],
  ])('rejects a %s boat and never creates a favorite', async (_label, boat) => {
    // Emulate the database applying the visibility predicate. This catches a
    // regression where addFavorite checks only that the id exists.
    mockBoatFindFirst.mockImplementation(async ({ where }) => {
      if (!boat) return null;
      return boat.is_published === where.is_published &&
        boat.status === where.status &&
        boat.deleted_at === where.deleted_at
        ? boat
        : null;
    });

    await expect(addFavorite(7, 21)).rejects.toMatchObject({ status: 404 });
    expect(mockFavoriteUpsert).not.toHaveBeenCalled();
    expect(mockBoatFindFirst).toHaveBeenCalledWith({
      where: { id_boat: 21, ...publicBoatWhere },
      select: { id_boat: true },
    });
  });

  it('adds a favorite only for a currently public boat', async () => {
    mockBoatFindFirst.mockResolvedValue({ id_boat: 21 });

    await expect(addFavorite(7, 21)).resolves.toBeUndefined();
    expect(mockFavoriteUpsert).toHaveBeenCalledWith({
      where: { id_user_id_boat: { id_user: 7, id_boat: 21 } },
      create: { id_user: 7, id_boat: 21 },
      update: {},
    });
  });

  it('filters favorites to public boats and purges stale rows', async () => {
    mockFavoriteFindMany.mockResolvedValue([
      { id_favorite: 1, boat: publicBoat },
      // A broken relation must not make the API expose a partial favorite.
      { id_favorite: 2, boat: null },
    ]);

    await expect(listFavorites(7)).resolves.toEqual([
      {
        id_favorite: 1,
        boat: {
          id_boat: 21,
          name: 'Voilier public',
          type: 'voilier',
          daily_price: 125,
          capacity: 6,
          port: { name: 'Vieux-Port', city: 'Marseille' },
          image: '/uploads/boats/public.jpg',
        },
      },
    ]);
    expect(mockFavoriteDeleteMany).toHaveBeenCalledWith({
      where: { id_user: 7, NOT: { boat: publicBoatWhere } },
    });
    expect(mockFavoriteFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_user: 7, boat: publicBoatWhere } })
    );
    const favoriteQuery = mockFavoriteFindMany.mock.calls[0][0];
    expect(favoriteQuery.select.boat.select.images.where).toEqual({
      deleted_at: null,
      type: { in: ['boat', 'bateau'] },
    });
  });

  it('keeps dashboard counts and previews limited to public boats', async () => {
    mockFavoriteFindMany.mockResolvedValue([{ id_favorite: 1, boat: publicBoat }]);
    mockFavoriteCount.mockResolvedValue(1);

    const stats = await getDashboardStats(7);

    expect(stats.favorites).toBe(1);
    expect(stats.favoriteBoatsPreview).toHaveLength(1);
    expect(stats.favoriteBoatsPreview[0].boat).toMatchObject({
      id_boat: 21,
      daily_price: 125,
      image: '/uploads/boats/public.jpg',
    });
    expect(mockFavoriteCount).toHaveBeenCalledWith({
      where: { id_user: 7, boat: publicBoatWhere },
    });
    expect(mockFavoriteFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_user: 7, boat: publicBoatWhere } })
    );
    const previewQuery = mockFavoriteFindMany.mock.calls[0][0];
    expect(previewQuery.select.boat.select.images.where).toEqual({
      deleted_at: null,
      type: { in: ['boat', 'bateau'] },
    });
  });
});
