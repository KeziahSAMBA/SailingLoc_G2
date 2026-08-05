import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockCount = jest.fn();
const mockDeleteMany = jest.fn();
const mockFindMany = jest.fn();

jest.unstable_mockModule('../src/config/db.js', () => ({
  default: {
    contactRequest: { count: mockCount, deleteMany: mockDeleteMany, findMany: mockFindMany },
  },
}));

const { default: contactPurge, purgeableContactWhere } =
  await import('../src/jobs/handlers/contactPurge.js');

const DAY_MS = 86400000;
const NOW = new Date('2026-08-04T03:30:00.000Z');

const branches = (params) => {
  const [processed, unprocessed] = purgeableContactWhere(params, NOW).OR;
  return { processed, unprocessed };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCount.mockResolvedValue(0);
  mockDeleteMany.mockResolvedValue({ count: 0 });
  mockFindMany.mockResolvedValue([]);
});

describe('contact.purge', () => {
  it('ancre les demandes traitées sur processed_at, pas sur created_at', () => {
    const { processed } = branches({ retentionDays: 90 });

    expect(processed.status).toBe('processed');
    expect(processed.processed_at.lt.getTime()).toBe(NOW.getTime() - 90 * DAY_MS);
    expect(processed.created_at).toBeUndefined();
  });

  it('ancre les demandes en attente sur created_at, avec sa propre rétention', () => {
    const { unprocessed } = branches({ unprocessedRetentionDays: 365 });

    expect(unprocessed.status).toBe('new');
    expect(unprocessed.created_at.lt.getTime()).toBe(NOW.getTime() - 365 * DAY_MS);
  });

  it('épargne une demande en attente plus récente que sa rétention', () => {
    // Une demande créée il y a 5 mois est encore une demande client à traiter :
    // elle ne doit pas tomber dans la branche des traitées.
    const { unprocessed } = branches({ retentionDays: 90, unprocessedRetentionDays: 365 });
    const cinqMois = NOW.getTime() - 150 * DAY_MS;

    expect(cinqMois).toBeGreaterThan(unprocessed.created_at.lt.getTime());
  });

  it('retombe sur 90 et 365 jours si les rétentions sont absentes ou aberrantes', () => {
    const { processed, unprocessed } = branches({ retentionDays: 0, unprocessedRetentionDays: -5 });

    expect(processed.processed_at.lt.getTime()).toBe(NOW.getTime() - 90 * DAY_MS);
    expect(unprocessed.created_at.lt.getTime()).toBe(NOW.getTime() - 365 * DAY_MS);
  });

  it('ne relève que les identifiants, jamais le contenu de la demande', async () => {
    mockFindMany.mockResolvedValue([{ id_request: 3 }, { id_request: 12 }]);

    const ids = await contactPurge.targets({ params: {}, now: NOW, take: 500 });

    expect(ids).toEqual([3, 12]);
    expect(mockFindMany.mock.calls[0][0].select).toEqual({ id_request: true });
  });

  it('compte sans supprimer', async () => {
    mockCount.mockResolvedValue(6);

    expect(await contactPurge.count({ params: {}, now: NOW })).toBe(6);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('supprime et rend le détail par entité', async () => {
    mockDeleteMany.mockResolvedValue({ count: 4 });

    const outcome = await contactPurge.run({ params: {}, now: NOW });

    expect(outcome).toEqual({ affected: 4, detail: { contactRequests: 4 } });
  });

  it('arrive désactivée et en simulation', () => {
    expect(contactPurge.defaultEnabled).toBe(false);
    expect(contactPurge.defaultDryRun).toBe(true);
    expect(contactPurge.maxBatch).toBe(1000);
  });
});
