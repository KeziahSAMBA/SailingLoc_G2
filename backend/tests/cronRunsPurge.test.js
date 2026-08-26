import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockCount = jest.fn();
const mockDeleteMany = jest.fn();
const mockFindMany = jest.fn();

jest.unstable_mockModule('../src/config/db.js', () => ({
  default: {
    cronRun: { count: mockCount, deleteMany: mockDeleteMany, findMany: mockFindMany },
  },
}));

const { default: cronRunsPurge, expiredRunsWhere } =
  await import('../src/jobs/handlers/cronRunsPurge.js');

const DAY_MS = 86400000;
const NOW = new Date('2026-08-04T03:45:00.000Z');

const cutoffOf = (where) => where.started_at.lt.getTime();

beforeEach(() => {
  jest.clearAllMocks();
  mockCount.mockResolvedValue(0);
  mockDeleteMany.mockResolvedValue({ count: 0 });
  mockFindMany.mockResolvedValue([]);
});

describe('cron.runs.purge', () => {
  it('cible les exécutions plus anciennes que la rétention', () => {
    expect(cutoffOf(expiredRunsWhere({ retentionDays: 90 }, NOW))).toBe(
      NOW.getTime() - 90 * DAY_MS
    );
  });

  it('épargne toujours une exécution en cours', () => {
    // La tâche purge l'historique auquel elle est elle-même en train de
    // s'ajouter : sans ce garde, elle dépendrait de l'horloge pour se survivre.
    expect(expiredRunsWhere({ retentionDays: 90 }, NOW).status).toEqual({ not: 'running' });
  });

  it('ne fait pas de tri entre succès, échecs et exécutions ignorées', () => {
    const where = expiredRunsWhere({ retentionDays: 90 }, NOW);
    expect(Object.keys(where)).toEqual(['status', 'started_at']);
    expect(where.trigger).toBeUndefined();
    expect(where.dry_run).toBeUndefined();
  });

  it('retombe sur 90 jours si la rétention est absente ou aberrante', () => {
    const expected = NOW.getTime() - 90 * DAY_MS;
    expect(cutoffOf(expiredRunsWhere({}, NOW))).toBe(expected);
    expect(cutoffOf(expiredRunsWhere({ retentionDays: 0 }, NOW))).toBe(expected);
    expect(cutoffOf(expiredRunsWhere({ retentionDays: null }, NOW))).toBe(expected);
  });

  it('ne relève que les identifiants, jamais actor_email ni le détail', async () => {
    mockFindMany.mockResolvedValue([{ id_run: 7 }, { id_run: 21 }]);

    const ids = await cronRunsPurge.targets({ params: { retentionDays: 90 }, now: NOW, take: 500 });

    expect(ids).toEqual([7, 21]);
    expect(mockFindMany.mock.calls[0][0].select).toEqual({ id_run: true });
    expect(mockFindMany.mock.calls[0][0].take).toBe(500);
  });

  it('compte sans supprimer', async () => {
    mockCount.mockResolvedValue(842);

    const total = await cronRunsPurge.count({ params: { retentionDays: 90 }, now: NOW });

    expect(total).toBe(842);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('supprime et rend le détail par entité', async () => {
    mockDeleteMany.mockResolvedValue({ count: 312 });

    const outcome = await cronRunsPurge.run({ params: { retentionDays: 90 }, now: NOW });

    expect(outcome).toEqual({ affected: 312, detail: { cronRuns: 312 } });
    expect(cutoffOf(mockDeleteMany.mock.calls[0][0].where)).toBe(NOW.getTime() - 90 * DAY_MS);
    expect(mockDeleteMany.mock.calls[0][0].where.status).toEqual({ not: 'running' });
  });

  it('ferme la série nocturne et arrive en simulation', () => {
    expect(cronRunsPurge.defaultSchedule).toBe('45 3 * * *');
    expect(cronRunsPurge.defaultEnabled).toBe(true);
    expect(cronRunsPurge.defaultDryRun).toBe(true);
    expect(cronRunsPurge.maxBatch).toBe(50000);
  });
});
