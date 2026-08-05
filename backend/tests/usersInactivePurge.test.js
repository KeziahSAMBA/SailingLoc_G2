import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockSendNotice = jest.fn();
const mockAnonymize = jest.fn();

const db = {
  user: { count: jest.fn(), findMany: jest.fn(), update: jest.fn() },
};

jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendInactivityNoticeEmail: mockSendNotice,
}));
jest.unstable_mockModule('../src/services/userPurgeService.js', () => ({
  anonymizeUser: mockAnonymize,
}));

const { noticeDueWhere, anonymizationDueWhere, resolveDelays, notifyInactiveUser } =
  await import('../src/services/userInactivityService.js');
const { default: usersInactivePurge } = await import('../src/jobs/handlers/usersInactivePurge.js');

const DAY_MS = 86400000;
const NOW = new Date('2026-08-04T04:30:00.000Z');
const PARAMS = { inactivityDays: 1095, noticeDays: 30 };

const idleCutoff = (where) => where.OR[0].last_login_at.lt.getTime();

beforeEach(() => {
  jest.clearAllMocks();
  mockSendNotice.mockResolvedValue(undefined);
  mockAnonymize.mockResolvedValue({ documents: 0, files: 0 });
  db.user.count.mockResolvedValue(0);
  db.user.findMany.mockResolvedValue([]);
  db.user.update.mockResolvedValue({});
});

describe('users.inactive.purge — délais', () => {
  it('relance un préavis avant l’échéance, pas à l’échéance', () => {
    expect(idleCutoff(noticeDueWhere(PARAMS, NOW))).toBe(NOW.getTime() - 1065 * DAY_MS);
    expect(idleCutoff(anonymizationDueWhere(PARAMS, NOW))).toBe(NOW.getTime() - 1095 * DAY_MS);
  });

  it('empêche un préavis plus long que l’inactivité', () => {
    // Sinon la personne serait prévenue après la suppression.
    expect(resolveDelays({ inactivityDays: 10, noticeDays: 90 })).toEqual({
      inactivity: 10,
      notice: 9,
    });
  });

  it('retombe sur 3 ans et 30 jours par défaut', () => {
    expect(resolveDelays({})).toEqual({ inactivity: 1095, notice: 30 });
    expect(resolveDelays({ inactivityDays: 0, noticeDays: -1 })).toEqual({
      inactivity: 1095,
      notice: 30,
    });
  });

  it('traite « jamais connecté » via la date d’inscription', () => {
    const [byLogin, neverLogged] = noticeDueWhere(PARAMS, NOW).OR;

    expect(byLogin.last_login_at.lt).toBeInstanceOf(Date);
    expect(neverLogged.last_login_at).toBeNull();
    expect(neverLogged.created_at.lt.getTime()).toBe(NOW.getTime() - 1065 * DAY_MS);
  });
});

describe('users.inactive.purge — périmètre', () => {
  it('ne vise que les comptes confirmés, vivants et non anonymisés', () => {
    for (const where of [noticeDueWhere(PARAMS, NOW), anonymizationDueWhere(PARAMS, NOW)]) {
      expect(where.email_verified).toBe(true);
      expect(where.deleted_at).toBeNull();
      expect(where.anonymized_at).toBeNull();
    }
  });

  it('n’anonymise que les comptes déjà relancés', () => {
    const where = anonymizationDueWhere(PARAMS, NOW);
    expect(where.inactivity_notified_at.lt.getTime()).toBe(NOW.getTime() - 30 * DAY_MS);
  });

  it('ne relance pas deux fois le même compte', () => {
    expect(noticeDueWhere(PARAMS, NOW).inactivity_notified_at).toBeNull();
  });
});

describe('users.inactive.purge — relance', () => {
  it('horodate la relance après un envoi réussi', async () => {
    const sent = await notifyInactiveUser(
      { id_user: 4, email: 'a@b.test', first_name: 'Léa' },
      PARAMS,
      NOW
    );

    expect(sent).toBe(true);
    expect(mockSendNotice).toHaveBeenCalledWith('a@b.test', { firstName: 'Léa', days: 30 });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id_user: 4 },
      data: { inactivity_notified_at: NOW },
    });
  });

  it('ne pose pas l’horodatage si l’e-mail échoue', async () => {
    // Sans ça, le compte serait supprimé sans avoir jamais été prévenu.
    mockSendNotice.mockRejectedValue(new Error('SMTP indisponible'));

    const sent = await notifyInactiveUser(
      { id_user: 4, email: 'a@b.test', first_name: 'Léa' },
      PARAMS,
      NOW
    );

    expect(sent).toBe(false);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe('users.inactive.purge — exécution', () => {
  it('additionne les deux phases dans le compte', async () => {
    db.user.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);

    expect(await usersInactivePurge.count({ params: PARAMS, now: NOW })).toBe(7);
  });

  it('anonymise avant de relancer', async () => {
    db.user.findMany
      .mockResolvedValueOnce([{ id_user: 1 }])
      .mockResolvedValueOnce([{ id_user: 2, email: 'x@y.test', first_name: 'Max' }]);
    mockAnonymize.mockResolvedValue({ documents: 2, files: 2 });

    const outcome = await usersInactivePurge.run({ params: PARAMS, now: NOW });

    expect(mockAnonymize).toHaveBeenCalledWith(1, NOW, { markDeleted: true });
    expect(outcome.detail).toEqual({ notified: 1, anonymized: 1, documents: 2, files: 2 });
    expect(outcome.affected).toBe(2);
  });

  it('arrive désactivée et en simulation', () => {
    expect(usersInactivePurge.defaultEnabled).toBe(false);
    expect(usersInactivePurge.defaultDryRun).toBe(true);
    expect(usersInactivePurge.defaultParams).toEqual(PARAMS);
  });
});
