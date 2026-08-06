import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockSendNotice = jest.fn();

const db = {
  user: { count: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  boat: { updateMany: jest.fn() },
  refreshToken: { updateMany: jest.fn() },
  $transaction: jest.fn(),
};

jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendAccountDeactivatedEmail: jest.fn(),
  sendAccountDeletionEmail: jest.fn(),
  sendPauseNoticeEmail: mockSendNotice,
}));

const {
  pauseNoticeDueWhere,
  pauseClosureDueWhere,
  resolvePauseDelays,
  notifyPausedUser,
  closePausedAccount,
} = await import('../src/services/accountClosureService.js');
const { default: usersPausedPurge } = await import('../src/jobs/handlers/usersPausedPurge.js');

const DAY_MS = 86400000;
const NOW = new Date('2026-08-06T03:45:00.000Z');
const PARAMS = { pauseDays: 30, noticeDays: 7 };

beforeEach(() => {
  jest.clearAllMocks();
  mockSendNotice.mockResolvedValue(undefined);
  db.user.count.mockResolvedValue(0);
  db.user.findMany.mockResolvedValue([]);
  db.user.update.mockResolvedValue({});
  db.boat.updateMany.mockResolvedValue({ count: 0 });
  db.refreshToken.updateMany.mockResolvedValue({ count: 0 });
  db.$transaction.mockImplementation((fn) => fn(db));
});

describe('users.paused.purge — délais', () => {
  it('relance avant l’échéance, ferme à l’échéance', () => {
    expect(pauseNoticeDueWhere(PARAMS, NOW).deactivated_at.lt.getTime()).toBe(
      NOW.getTime() - 23 * DAY_MS
    );
    expect(pauseClosureDueWhere(PARAMS, NOW).deactivated_at.lt.getTime()).toBe(
      NOW.getTime() - 30 * DAY_MS
    );
  });

  it('n’attend la fermeture que si la relance est partie depuis le préavis', () => {
    expect(pauseClosureDueWhere(PARAMS, NOW).pause_notified_at.lt.getTime()).toBe(
      NOW.getTime() - 7 * DAY_MS
    );
    expect(pauseNoticeDueWhere(PARAMS, NOW).pause_notified_at).toBeNull();
  });

  it('empêche un préavis plus long que la pause', () => {
    expect(resolvePauseDelays({ pauseDays: 5, noticeDays: 90 })).toEqual({ pause: 5, notice: 4 });
  });

  it('retombe sur 30 et 7 jours par défaut', () => {
    expect(resolvePauseDelays({})).toEqual({ pause: 30, notice: 7 });
    expect(resolvePauseDelays({ pauseDays: 0, noticeDays: -1 })).toEqual({ pause: 30, notice: 7 });
  });
});

describe('users.paused.purge — périmètre', () => {
  it('épargne les blocages administrateur', () => {
    // deactivated_at reste à null sur un bannissement : un `lt` ne peut pas le
    // sélectionner, le compte banni ne devient jamais un compte supprimé.
    for (const where of [pauseNoticeDueWhere(PARAMS, NOW), pauseClosureDueWhere(PARAMS, NOW)]) {
      expect(where.deactivated_at).toEqual({ lt: expect.any(Date) });
      expect(where.deleted_at).toBeNull();
      expect(where.anonymized_at).toBeNull();
    }
  });

  it('épargne un compte visé par un litige ouvert', () => {
    for (const where of [pauseNoticeDueWhere(PARAMS, NOW), pauseClosureDueWhere(PARAMS, NOW)]) {
      expect(where.disputes).toEqual({ none: { status: 'open' } });
      expect(where.bookings).toEqual({ none: { disputes: { some: { status: 'open' } } } });
      expect(where.boats).toEqual({
        none: { bookings: { some: { disputes: { some: { status: 'open' } } } } },
      });
    }
  });

  it('ne relève que des identifiants techniques', async () => {
    db.user.findMany.mockResolvedValue([{ id_user: 7 }]);
    await usersPausedPurge.targets({ params: PARAMS, now: NOW, take: 500 });
    for (const call of db.user.findMany.mock.calls) {
      expect(call[0].select).toEqual({ id_user: true });
    }
  });
});

describe('users.paused.purge — exécution', () => {
  it('ferme le compte comme une suppression, sans anonymiser', async () => {
    await closePausedAccount(42, NOW);

    expect(db.boat.updateMany).toHaveBeenCalledWith({
      where: { id_user: 42, deleted_at: null },
      data: { is_published: false, deleted_at: NOW, updated_at: NOW },
    });
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id_user: 42, revoked_at: null },
      data: { revoked_at: NOW },
    });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id_user: 42 },
      data: { is_active: false, deactivated_at: null, deleted_at: NOW, updated_at: NOW },
    });
  });

  it('ferme avant de relancer, sans relancer un compte fermé la même nuit', async () => {
    db.user.findMany.mockImplementation(({ where }) =>
      Promise.resolve(where.pause_notified_at === null ? [] : [{ id_user: 9 }])
    );

    const { affected, detail } = await usersPausedPurge.run({ params: PARAMS, now: NOW });

    expect(detail).toEqual({ notified: 0, closed: 1 });
    expect(affected).toBe(1);
    expect(mockSendNotice).not.toHaveBeenCalled();
  });

  it('n’horodate pas la relance si l’e-mail échoue', async () => {
    mockSendNotice.mockRejectedValue(new Error('SMTP down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const sent = await notifyPausedUser(
      { id_user: 3, email: 'a@b.c', first_name: 'Léa' },
      PARAMS,
      NOW
    );

    expect(sent).toBe(false);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('horodate la relance envoyée, avec le préavis restant', async () => {
    const sent = await notifyPausedUser(
      { id_user: 3, email: 'a@b.c', first_name: 'Léa' },
      PARAMS,
      NOW
    );

    expect(sent).toBe(true);
    expect(mockSendNotice).toHaveBeenCalledWith('a@b.c', { firstName: 'Léa', days: 7 });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id_user: 3 },
      data: { pause_notified_at: NOW },
    });
  });

  it('reste en simulation et désactivée par défaut', () => {
    expect(usersPausedPurge.defaultEnabled).toBe(false);
    expect(usersPausedPurge.defaultDryRun).toBe(true);
    expect(usersPausedPurge.defaultParams).toEqual({ pauseDays: 30, noticeDays: 7 });
  });
});
