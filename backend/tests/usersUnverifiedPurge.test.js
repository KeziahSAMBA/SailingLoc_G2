import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockCount = jest.fn();
const mockDeleteMany = jest.fn();
const mockFindMany = jest.fn();

jest.unstable_mockModule('../src/config/db.js', () => ({
  default: {
    user: { count: mockCount, deleteMany: mockDeleteMany, findMany: mockFindMany },
  },
}));

const { default: usersUnverifiedPurge, purgeableUnverifiedWhere } =
  await import('../src/jobs/handlers/usersUnverifiedPurge.js');

const DAY_MS = 86400000;
const NOW = new Date('2026-08-04T04:15:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
  mockCount.mockResolvedValue(0);
  mockDeleteMany.mockResolvedValue({ count: 0 });
  mockFindMany.mockResolvedValue([]);
});

describe('users.unverified.purge', () => {
  it('ne vise que les comptes non confirmés créés au-delà du délai', () => {
    const where = purgeableUnverifiedWhere({ retentionDays: 30 }, NOW);

    expect(where.email_verified).toBe(false);
    expect(where.created_at.lt.getTime()).toBe(NOW.getTime() - 30 * DAY_MS);
  });

  it('épargne les comptes déjà anonymisés par users.purge', () => {
    // Ceux-là ont email_verified à false eux aussi : sans deleted_at: null,
    // cette tâche supprimerait des comptes porteurs de réservations.
    expect(purgeableUnverifiedWhere({}, NOW).deleted_at).toBeNull();
  });

  it('exige qu’aucune ligne ne soit rattachée au compte', () => {
    const where = purgeableUnverifiedWhere({}, NOW);

    for (const relation of [
      'boats',
      'bookings',
      'documents',
      'reviews',
      'images',
      'favoriteBoats',
      'sentMessages',
      'receivedMessages',
      'reports',
      'disputes',
    ]) {
      expect(where[relation]).toEqual({ none: {} });
    }
  });

  it('retombe sur 30 jours si le délai est absent ou aberrant', () => {
    const expected = NOW.getTime() - 30 * DAY_MS;
    expect(purgeableUnverifiedWhere({}, NOW).created_at.lt.getTime()).toBe(expected);
    expect(purgeableUnverifiedWhere({ retentionDays: -1 }, NOW).created_at.lt.getTime()).toBe(
      expected
    );
  });

  it('ne relève que les identifiants', async () => {
    mockFindMany.mockResolvedValue([{ id_user: 5 }, { id_user: 6 }]);

    const ids = await usersUnverifiedPurge.targets({ params: {}, now: NOW, take: 500 });

    expect(ids).toEqual([5, 6]);
    expect(mockFindMany.mock.calls[0][0].select).toEqual({ id_user: true });
  });

  it('compte sans supprimer', async () => {
    mockCount.mockResolvedValue(9);

    expect(await usersUnverifiedPurge.count({ params: {}, now: NOW })).toBe(9);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('supprime réellement, sans passer par l’anonymisation', async () => {
    mockDeleteMany.mockResolvedValue({ count: 9 });

    const outcome = await usersUnverifiedPurge.run({ params: {}, now: NOW });

    expect(outcome).toEqual({ affected: 9, detail: { users: 9 } });
    expect(mockDeleteMany.mock.calls[0][0].where.email_verified).toBe(false);
  });

  it('arrive désactivée et en simulation', () => {
    expect(usersUnverifiedPurge.defaultEnabled).toBe(false);
    expect(usersUnverifiedPurge.defaultDryRun).toBe(true);
    expect(usersUnverifiedPurge.defaultParams).toEqual({ retentionDays: 30 });
  });
});
