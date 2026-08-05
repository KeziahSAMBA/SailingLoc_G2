import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockCount = jest.fn();
const mockDeleteMany = jest.fn();
const mockFindMany = jest.fn();

jest.unstable_mockModule('../src/config/db.js', () => ({
  default: {
    message: { count: mockCount, deleteMany: mockDeleteMany, findMany: mockFindMany },
  },
}));

const { default: messagesPurge, purgeableMessagesWhere } =
  await import('../src/jobs/handlers/messagesPurge.js');

const DAY_MS = 86400000;
const NOW = new Date('2026-08-04T04:45:00.000Z');

const branches = (params) => {
  const [forEveryone, bothSides] = purgeableMessagesWhere(params, NOW).OR;
  return { forEveryone, bothSides: bothSides.AND };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCount.mockResolvedValue(0);
  mockDeleteMany.mockResolvedValue({ count: 0 });
  mockFindMany.mockResolvedValue([]);
});

describe('messages.purge', () => {
  it('vise les messages supprimés pour tout le monde au-delà de la rétention', () => {
    const { forEveryone } = branches({ retentionDays: 90 });
    expect(forEveryone.deleted_at.lt.getTime()).toBe(NOW.getTime() - 90 * DAY_MS);
  });

  it('vise les messages masqués par les deux côtés', () => {
    const { bothSides } = branches({ retentionDays: 90 });
    const cutoff = NOW.getTime() - 90 * DAY_MS;

    expect(bothSides).toHaveLength(2);
    expect(bothSides[0].sender_deleted_at.lt.getTime()).toBe(cutoff);
    expect(bothSides[1].receiver_deleted_at.lt.getTime()).toBe(cutoff);
  });

  it('épargne un message masqué d’un seul côté', () => {
    // « lt » ne matche pas une colonne nulle : si un seul côté a masqué, la
    // branche des deux côtés ne peut pas se refermer, et l'autre le voit encore.
    const { bothSides } = branches({ retentionDays: 90 });

    expect(bothSides[0].sender_deleted_at.lt).toBeInstanceOf(Date);
    expect(bothSides[1].receiver_deleted_at.lt).toBeInstanceOf(Date);
    expect(Object.keys(bothSides[0])).toEqual(['sender_deleted_at']);
    expect(Object.keys(bothSides[1])).toEqual(['receiver_deleted_at']);
  });

  it('ne touche à rien qu’aucune des deux parties n’a supprimé', () => {
    // Aucune rétention globale : effacer une correspondance conservée par les
    // deux parties détruirait leur contenu sans qu'elles l'aient demandé.
    const where = purgeableMessagesWhere({ retentionDays: 90 }, NOW);

    expect(Object.keys(where)).toEqual(['OR']);
    expect(where.OR).toHaveLength(2);
    expect(where.sent_at).toBeUndefined();
    expect(where.created_at).toBeUndefined();
  });

  it('retombe sur 90 jours si la rétention est absente ou aberrante', () => {
    const expected = NOW.getTime() - 90 * DAY_MS;
    expect(branches({}).forEveryone.deleted_at.lt.getTime()).toBe(expected);
    expect(branches({ retentionDays: 0 }).forEveryone.deleted_at.lt.getTime()).toBe(expected);
  });

  it('ne relève que les identifiants, jamais le contenu', async () => {
    mockFindMany.mockResolvedValue([{ id_message: 2 }, { id_message: 14 }]);

    const ids = await messagesPurge.targets({ params: {}, now: NOW, take: 500 });

    expect(ids).toEqual([2, 14]);
    expect(mockFindMany.mock.calls[0][0].select).toEqual({ id_message: true });
  });

  it('compte sans supprimer', async () => {
    mockCount.mockResolvedValue(37);

    expect(await messagesPurge.count({ params: {}, now: NOW })).toBe(37);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('supprime et rend le détail par entité', async () => {
    mockDeleteMany.mockResolvedValue({ count: 37 });

    const outcome = await messagesPurge.run({ params: {}, now: NOW });

    expect(outcome).toEqual({ affected: 37, detail: { messages: 37 } });
  });

  it('arrive désactivée et en simulation', () => {
    expect(messagesPurge.defaultEnabled).toBe(false);
    expect(messagesPurge.defaultDryRun).toBe(true);
    expect(messagesPurge.maxBatch).toBe(10000);
  });
});
