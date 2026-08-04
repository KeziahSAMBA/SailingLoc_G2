import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockJobFindUnique = jest.fn();
const mockJobFindMany = jest.fn();
const mockJobCreate = jest.fn();
const mockJobUpdate = jest.fn();
const mockRunCreate = jest.fn();
const mockRunFindFirst = jest.fn();
const mockRunUpdate = jest.fn();
const mockRunUpdateMany = jest.fn();

const db = {
  cronJob: {
    findUnique: mockJobFindUnique,
    findMany: mockJobFindMany,
    create: mockJobCreate,
    update: mockJobUpdate,
  },
  cronRun: {
    create: mockRunCreate,
    findFirst: mockRunFindFirst,
    update: mockRunUpdate,
    updateMany: mockRunUpdateMany,
  },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

jest.unstable_mockModule('../src/services/logService.js', () => ({
  logActivity: jest.fn().mockResolvedValue(null),
}));

// Tâche factice : le moteur est testé pour lui-même, indépendamment du
// catalogue réel.
const definition = {
  key: 'test.job',
  defaultSchedule: '0 3 * * *',
  defaultParams: { retentionDays: 30 },
  maxBatch: 10,
  count: jest.fn(),
  run: jest.fn(),
  targets: jest.fn(),
};
jest.unstable_mockModule('../src/jobs/registry.js', () => ({
  getJobDefinition: (key) => (key === 'test.job' ? definition : null),
  listJobDefinitions: () => [definition],
  resolveParams: (def, stored) => ({ ...def.defaultParams, ...(stored ?? {}) }),
}));

const { runJob, computeNextRun, isValidSchedule } = await import('../src/services/cronService.js');

const job = (overrides = {}) => ({
  id_job: 1,
  key: 'test.job',
  schedule: '0 3 * * *',
  enabled: true,
  dry_run: false,
  params: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockJobFindUnique.mockResolvedValue(job());
  mockRunFindFirst.mockResolvedValue(null);
  mockRunCreate.mockImplementation(({ data }) =>
    Promise.resolve({ id_run: 1, started_at: new Date(), ...data })
  );
  mockRunUpdate.mockImplementation(({ where, data }) =>
    Promise.resolve({ id_run: where.id_run, ...data })
  );
  mockJobUpdate.mockResolvedValue({});
  definition.count.mockResolvedValue(3);
  definition.run.mockResolvedValue({ affected: 3, detail: { deleted: 3 } });
  definition.targets.mockResolvedValue([11, 22, 33]);
});

describe('runJob', () => {
  it('exécute la tâche et trace le résultat', async () => {
    const run = await runJob('test.job');

    expect(definition.run).toHaveBeenCalledTimes(1);
    expect(run.status).toBe('success');
    expect(run.affected).toBe(3);
    expect(run.result).toEqual({ deleted: 3, targets: [11, 22, 33], truncated: false });
    expect(mockJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ last_status: 'success' }) })
    );
  });

  it('en simulation, compte les cibles sans rien modifier', async () => {
    mockJobFindUnique.mockResolvedValue(job({ dry_run: true }));

    const run = await runJob('test.job');

    expect(definition.run).not.toHaveBeenCalled();
    expect(run.status).toBe('success');
    expect(run.affected).toBe(3);
    expect(run.result).toEqual({
      simulated: true,
      targeted: 3,
      targets: [11, 22, 33],
      truncated: false,
    });
  });

  it('relève les identifiants avant l’exécution, pas après', async () => {
    const order = [];
    definition.targets.mockImplementation(async () => {
      order.push('targets');
      return [11, 22, 33];
    });
    definition.run.mockImplementation(async () => {
      order.push('run');
      return { affected: 3, detail: { deleted: 3 } };
    });

    await runJob('test.job');

    // Après suppression les lignes n'existent plus : le relevé doit précéder.
    expect(order).toEqual(['targets', 'run']);
  });

  it('signale une liste d’identifiants tronquée', async () => {
    definition.targets.mockResolvedValue([1, 2]);
    definition.run.mockResolvedValue({ affected: 900, detail: { deleted: 900 } });

    const run = await runJob('test.job');

    expect(run.result.truncated).toBe(true);
    expect(run.result.targets).toEqual([1, 2]);
  });

  it('n’ajoute pas de bloc identifiants si la tâche n’en relève pas', async () => {
    definition.targets.mockResolvedValue(null);

    const run = await runJob('test.job');

    expect(run.result).toEqual({ deleted: 3 });
  });

  it('refuse d’agir au-delà du plafond de sécurité', async () => {
    definition.count.mockResolvedValue(50);

    const run = await runJob('test.job');

    expect(definition.run).not.toHaveBeenCalled();
    expect(run.status).toBe('failed');
    expect(run.error).toMatch(/Plafond de sécurité/);
  });

  it('ignore le déclenchement si la précédente exécution tourne encore', async () => {
    mockRunFindFirst.mockResolvedValue({ id_run: 9, status: 'running' });

    const run = await runJob('test.job');

    expect(definition.count).not.toHaveBeenCalled();
    expect(definition.run).not.toHaveBeenCalled();
    expect(run.status).toBe('skipped');
  });

  it('trace l’échec sans laisser l’exécution en cours', async () => {
    definition.run.mockRejectedValue(new Error('base indisponible'));

    const run = await runJob('test.job');

    expect(run.status).toBe('failed');
    expect(run.error).toBe('base indisponible');
    expect(run.finished_at).toBeInstanceOf(Date);
  });

  it('rejette une tâche absente du registre', async () => {
    await expect(runJob('inconnue')).rejects.toMatchObject({ status: 404 });
  });

  it('applique les paramètres surchargés en base par-dessus ceux du registre', async () => {
    mockJobFindUnique.mockResolvedValue(job({ params: { retentionDays: 90 } }));

    await runJob('test.job');

    expect(definition.run).toHaveBeenCalledWith(
      expect.objectContaining({ params: { retentionDays: 90 } })
    );
  });
});

describe('planning', () => {
  it('valide une expression cron correcte', () => {
    expect(isValidSchedule('0 3 * * *')).toBe(true);
    expect(isValidSchedule('*/15 * * * *')).toBe(true);
  });

  it('rejette une expression invalide ou vide', () => {
    expect(isValidSchedule('tous les jours')).toBe(false);
    expect(isValidSchedule('')).toBe(false);
    expect(isValidSchedule(null)).toBe(false);
  });

  it('ne calcule pas de prochaine exécution pour une tâche désactivée', () => {
    expect(computeNextRun('0 3 * * *', false)).toBeNull();
    expect(computeNextRun('0 3 * * *', true)).toBeInstanceOf(Date);
  });
});
