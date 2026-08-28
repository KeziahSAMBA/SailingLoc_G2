import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = { booking: { count: jest.fn(), findMany: jest.fn() } };
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const mockCancelExpired = jest.fn();
const mockExpiredPendingWhere = jest.fn((now, ms) => ({ status: 'pending', now, ms }));
jest.unstable_mockModule('../src/services/bookingService.js', () => ({
  cancelExpiredBookings: mockCancelExpired,
  expiredPendingWhere: mockExpiredPendingWhere,
}));

const { REGISTRY, getJobDefinition, listJobDefinitions, resolveParams } =
  await import('../src/jobs/registry.js');
const { default: bookingsExpire } = await import('../src/jobs/handlers/bookingsExpire.js');

const HOUR_MS = 3600 * 1000;
const NOW = new Date('2026-08-28T12:00:00Z');

beforeEach(() => {
  jest.clearAllMocks();
  db.booking.count.mockResolvedValue(0);
  db.booking.findMany.mockResolvedValue([]);
  mockCancelExpired.mockResolvedValue(0);
});

describe('registre des tâches planifiées', () => {
  it('recense les 11 tâches du catalogue', () => {
    expect(listJobDefinitions()).toHaveLength(11);
    expect(REGISTRY.size).toBe(11);
  });

  it('indexe chaque tâche par sa clé', () => {
    for (const job of listJobDefinitions()) {
      expect(getJobDefinition(job.key)).toBe(job);
    }
  });

  it.each([
    'bookings.expire',
    'tokens.purge',
    'logs.purge',
    'contact.purge',
    'cron.runs.purge',
    'users.purge',
    'users.unverified.purge',
    'users.inactive.purge',
    'users.paused.purge',
    'messages.purge',
    'images.purge',
  ])('expose la tâche « %s »', (key) => {
    expect(getJobDefinition(key)).toBeTruthy();
  });

  it('renvoie null pour une clé inconnue', () => {
    expect(getJobDefinition('tache.inexistante')).toBeNull();
  });

  it('donne à chaque tâche les attributs attendus du planificateur', () => {
    for (const job of listJobDefinitions()) {
      expect(job).toMatchObject({
        key: expect.any(String),
        category: expect.any(String),
        defaultSchedule: expect.any(String),
        run: expect.any(Function),
      });
    }
  });

  it('n’a aucune clé en double', () => {
    const keys = listJobDefinitions().map((j) => j.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('resolveParams', () => {
  const definition = { defaultParams: { retentionDays: 30, notify: true } };

  it('renvoie les valeurs par défaut sans surcharge', () => {
    expect(resolveParams(definition, null)).toEqual({ retentionDays: 30, notify: true });
  });

  it('laisse la base surcharger une valeur par défaut', () => {
    expect(resolveParams(definition, { retentionDays: 60 })).toEqual({
      retentionDays: 60,
      notify: true,
    });
  });

  it.each([
    ['un tableau', [1, 2]],
    ['une chaîne', 'params'],
    ['un nombre', 42],
    ['undefined', undefined],
  ])('ignore une surcharge transmise comme %s', (_label, stored) => {
    expect(resolveParams(definition, stored)).toEqual({ retentionDays: 30, notify: true });
  });

  it('tolère une définition sans paramètres par défaut', () => {
    expect(resolveParams({}, { a: 1 })).toEqual({ a: 1 });
  });
});

describe('tâche bookings.expire', () => {
  it('déclare la configuration attendue', () => {
    expect(bookingsExpire).toMatchObject({
      key: 'bookings.expire',
      category: 'bookings',
      defaultSchedule: '0 * * * *',
      defaultEnabled: true,
      defaultDryRun: false,
      defaultParams: { expiryHours: 72 },
      // Sans plafond, contrairement aux purges : le balayage doit tout traiter.
      maxBatch: null,
    });
  });

  it('compte les demandes périmées sur la fenêtre configurée', async () => {
    db.booking.count.mockResolvedValue(4);

    const total = await bookingsExpire.count({ params: { expiryHours: 24 }, now: NOW });

    expect(mockExpiredPendingWhere).toHaveBeenCalledWith(NOW, 24 * HOUR_MS);
    expect(total).toBe(4);
  });

  it.each([
    ['valeur absente', undefined],
    ['zéro', 0],
    ['négative', -5],
    ['non numérique', 'douze'],
  ])('retombe sur 72 h pour une fenêtre %s', async (_label, expiryHours) => {
    await bookingsExpire.count({ params: { expiryHours }, now: NOW });

    expect(mockExpiredPendingWhere).toHaveBeenCalledWith(NOW, 72 * HOUR_MS);
  });

  it('accepte une fenêtre d’une heure', async () => {
    await bookingsExpire.count({ params: { expiryHours: 1 }, now: NOW });

    expect(mockExpiredPendingWhere).toHaveBeenCalledWith(NOW, HOUR_MS);
  });

  it('ne remonte que des identifiants de réservation, sans donnée personnelle', async () => {
    db.booking.findMany.mockResolvedValue([{ id_booking: 5 }, { id_booking: 6 }]);

    const targets = await bookingsExpire.targets({
      params: { expiryHours: 72 },
      now: NOW,
      take: 10,
    });

    expect(targets).toEqual([5, 6]);
    expect(db.booking.findMany.mock.calls[0][0].select).toEqual({ id_booking: true });
  });

  it('respecte la taille de lot demandée', async () => {
    await bookingsExpire.targets({ params: {}, now: NOW, take: 25 });

    expect(db.booking.findMany.mock.calls[0][0]).toMatchObject({
      take: 25,
      orderBy: { id_booking: 'asc' },
    });
  });

  it('annule les demandes périmées et rend le compte affecté', async () => {
    mockCancelExpired.mockResolvedValue(3);

    const result = await bookingsExpire.run({ params: { expiryHours: 48 } });

    expect(mockCancelExpired).toHaveBeenCalledWith(48 * HOUR_MS);
    expect(result).toEqual({ affected: 3, detail: { bookingsCancelled: 3 } });
  });

  it('rend un compte nul quand rien n’a expiré', async () => {
    const result = await bookingsExpire.run({ params: {} });

    expect(result).toEqual({ affected: 0, detail: { bookingsCancelled: 0 } });
  });
});
