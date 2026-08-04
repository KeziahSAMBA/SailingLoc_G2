import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockCount = jest.fn();
const mockDeleteMany = jest.fn();

jest.unstable_mockModule('../src/config/db.js', () => ({
  default: { refreshToken: { count: mockCount, deleteMany: mockDeleteMany } },
}));

const { default: tokensPurge, expiredTokensWhere } =
  await import('../src/jobs/handlers/tokensPurge.js');

const DAY_MS = 86400000;
const NOW = new Date('2026-08-04T03:00:00.000Z');

const cutoffOf = (where) => where.expires_at.lt.getTime();

beforeEach(() => {
  jest.clearAllMocks();
  mockCount.mockResolvedValue(0);
  mockDeleteMany.mockResolvedValue({ count: 0 });
});

describe('tokens.purge', () => {
  it('cible les jetons expirés depuis plus longtemps que la rétention', () => {
    const where = expiredTokensWhere({ retentionDays: 30 }, NOW);
    expect(cutoffOf(where)).toBe(NOW.getTime() - 30 * DAY_MS);
  });

  it('n’ancre le filtre que sur expires_at, jamais sur revoked_at', () => {
    // Un jeton révoqué mais non expiré doit survivre : c'est lui qui permet à
    // refreshSession de détecter un rejeu.
    const where = expiredTokensWhere({ retentionDays: 30 }, NOW);
    expect(Object.keys(where)).toEqual(['expires_at']);
    expect(where.revoked_at).toBeUndefined();
  });

  it('retombe sur 30 jours si la rétention est absente ou aberrante', () => {
    const expected = NOW.getTime() - 30 * DAY_MS;
    expect(cutoffOf(expiredTokensWhere({}, NOW))).toBe(expected);
    expect(cutoffOf(expiredTokensWhere({ retentionDays: 0 }, NOW))).toBe(expected);
    expect(cutoffOf(expiredTokensWhere({ retentionDays: 'douze' }, NOW))).toBe(expected);
  });

  it('applique une rétention personnalisée', () => {
    const where = expiredTokensWhere({ retentionDays: 90 }, NOW);
    expect(cutoffOf(where)).toBe(NOW.getTime() - 90 * DAY_MS);
  });

  it('compte sans supprimer', async () => {
    mockCount.mockResolvedValue(42);

    const total = await tokensPurge.count({ params: { retentionDays: 30 }, now: NOW });

    expect(total).toBe(42);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('supprime et rend le détail par entité', async () => {
    mockDeleteMany.mockResolvedValue({ count: 17 });

    const outcome = await tokensPurge.run({ params: { retentionDays: 30 }, now: NOW });

    expect(outcome).toEqual({ affected: 17, detail: { refreshTokens: 17 } });
    expect(cutoffOf(mockDeleteMany.mock.calls[0][0].where)).toBe(NOW.getTime() - 30 * DAY_MS);
  });

  it('arrive en simulation et activée', () => {
    expect(tokensPurge.defaultDryRun).toBe(true);
    expect(tokensPurge.defaultEnabled).toBe(true);
    expect(tokensPurge.defaultSchedule).toBe('0 3 * * *');
  });
});
