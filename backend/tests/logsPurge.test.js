import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockCount = jest.fn();
const mockDeleteMany = jest.fn();
const mockFindMany = jest.fn();

jest.unstable_mockModule('../src/config/db.js', () => ({
  default: {
    activityLog: { count: mockCount, deleteMany: mockDeleteMany, findMany: mockFindMany },
  },
}));

const { default: logsPurge, expiredLogsWhere } = await import('../src/jobs/handlers/logsPurge.js');

const DAY_MS = 86400000;
const NOW = new Date('2026-08-04T03:15:00.000Z');

const cutoffOf = (where) => where.created_at.lt.getTime();

beforeEach(() => {
  jest.clearAllMocks();
  mockCount.mockResolvedValue(0);
  mockDeleteMany.mockResolvedValue({ count: 0 });
  mockFindMany.mockResolvedValue([]);
});

describe('logs.purge', () => {
  it('cible les entrées plus anciennes que la rétention', () => {
    expect(cutoffOf(expiredLogsWhere({ retentionDays: 365 }, NOW))).toBe(
      NOW.getTime() - 365 * DAY_MS
    );
  });

  it('applique la même rétention à tous les niveaux', () => {
    // Pas de traitement de faveur pour les erreurs : chaque ligne porte un
    // actor_email, donc la même règle vaut pour toutes.
    const where = expiredLogsWhere({ retentionDays: 365 }, NOW);
    expect(Object.keys(where)).toEqual(['created_at']);
    expect(where.level).toBeUndefined();
  });

  it('retombe sur 365 jours si la rétention est absente ou aberrante', () => {
    const expected = NOW.getTime() - 365 * DAY_MS;
    expect(cutoffOf(expiredLogsWhere({}, NOW))).toBe(expected);
    expect(cutoffOf(expiredLogsWhere({ retentionDays: 0 }, NOW))).toBe(expected);
    expect(cutoffOf(expiredLogsWhere({ retentionDays: null }, NOW))).toBe(expected);
  });

  it('ne relève que les identifiants, jamais le contenu des entrées', async () => {
    mockFindMany.mockResolvedValue([{ id_log: 4 }, { id_log: 9 }]);

    const ids = await logsPurge.targets({ params: { retentionDays: 365 }, now: NOW, take: 500 });

    expect(ids).toEqual([4, 9]);
    expect(mockFindMany.mock.calls[0][0].select).toEqual({ id_log: true });
    expect(mockFindMany.mock.calls[0][0].take).toBe(500);
  });

  it('compte sans supprimer', async () => {
    mockCount.mockResolvedValue(1204);

    const total = await logsPurge.count({ params: { retentionDays: 365 }, now: NOW });

    expect(total).toBe(1204);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('supprime et rend le détail par entité', async () => {
    mockDeleteMany.mockResolvedValue({ count: 87 });

    const outcome = await logsPurge.run({ params: { retentionDays: 365 }, now: NOW });

    expect(outcome).toEqual({ affected: 87, detail: { activityLogs: 87 } });
    expect(cutoffOf(mockDeleteMany.mock.calls[0][0].where)).toBe(NOW.getTime() - 365 * DAY_MS);
  });

  it('est décalée de tokens.purge et arrive en simulation', () => {
    expect(logsPurge.defaultSchedule).toBe('15 3 * * *');
    expect(logsPurge.defaultDryRun).toBe(true);
    expect(logsPurge.defaultEnabled).toBe(true);
  });
});
