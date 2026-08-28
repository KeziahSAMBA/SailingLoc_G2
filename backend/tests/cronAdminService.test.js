import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  cronJob: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  cronRun: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const mockGetJobDefinition = jest.fn();
const mockResolveParams = jest.fn((definition, params) => ({
  ...(definition.defaultParams ?? {}),
  ...(params ?? {}),
}));
jest.unstable_mockModule('../src/jobs/registry.js', () => ({
  getJobDefinition: mockGetJobDefinition,
  resolveParams: mockResolveParams,
}));

const mockRunJob = jest.fn().mockResolvedValue({});
const mockComputeNextRun = jest.fn(() => new Date('2026-09-01T02:00:00Z'));
const mockIsValidSchedule = jest.fn(() => true);
jest.unstable_mockModule('../src/services/cronService.js', () => ({
  runJob: mockRunJob,
  computeNextRun: mockComputeNextRun,
  isValidSchedule: mockIsValidSchedule,
  CRON_TZ: 'Europe/Paris',
}));

const mockReloadScheduler = jest.fn().mockResolvedValue();
jest.unstable_mockModule('../src/scheduler.js', () => ({
  reloadScheduler: mockReloadScheduler,
}));

const { listJobs, updateJob, triggerJob, listRuns } =
  await import('../src/services/cronAdminService.js');

const DEFINITION = {
  category: 'purge',
  defaultSchedule: '0 3 * * *',
  defaultParams: { retentionDays: 30, notify: true, label: 'purge' },
  maxBatch: 500,
};

const storedJob = (overrides = {}) => ({
  id_job: 1,
  key: 'users.purge',
  schedule: '0 3 * * *',
  enabled: true,
  dry_run: false,
  params: null,
  last_run_at: new Date('2026-08-01'),
  last_status: 'success',
  next_run_at: new Date('2026-09-01'),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetJobDefinition.mockReturnValue(DEFINITION);
  mockIsValidSchedule.mockReturnValue(true);
  mockComputeNextRun.mockReturnValue(new Date('2026-09-01T02:00:00Z'));
  mockResolveParams.mockImplementation((definition, params) => ({
    ...(definition.defaultParams ?? {}),
    ...(params ?? {}),
  }));
  db.cronJob.findMany.mockResolvedValue([storedJob()]);
  db.cronJob.findUnique.mockResolvedValue(storedJob());
  db.cronJob.update.mockImplementation(async ({ data }) => storedJob(data));
  db.cronRun.findMany.mockResolvedValue([]);
  db.cronRun.findFirst.mockResolvedValue(null);
  db.cronRun.count.mockResolvedValue(0);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listJobs', () => {
  it('renvoie les tâches avec le fuseau du planificateur', async () => {
    const { jobs, timezone } = await listJobs();

    expect(timezone).toBe('Europe/Paris');
    expect(jobs[0]).toMatchObject({
      key: 'users.purge',
      category: 'purge',
      defaultSchedule: '0 3 * * *',
      maxBatch: 500,
      running: false,
      orphan: false,
    });
  });

  it('signale une tâche en cours d’exécution', async () => {
    db.cronRun.findMany.mockResolvedValue([{ id_job: 1 }]);

    const { jobs } = await listJobs();

    expect(jobs[0].running).toBe(true);
  });

  it('marque orpheline une tâche présente en base mais absente du registre', async () => {
    mockGetJobDefinition.mockReturnValue(undefined);

    const { jobs } = await listJobs();

    expect(jobs[0]).toMatchObject({
      orphan: true,
      category: null,
      defaultSchedule: null,
      maxBatch: null,
      defaultParams: {},
    });
  });
});

describe('updateJob', () => {
  it('met à jour la planification et recalcule la prochaine exécution', async () => {
    await updateJob('users.purge', { schedule: '  0 4 * * *  ' });

    expect(db.cronJob.update).toHaveBeenCalledWith({
      where: { key: 'users.purge' },
      data: expect.objectContaining({ schedule: '0 4 * * *' }),
    });
    expect(mockComputeNextRun).toHaveBeenCalledWith('0 4 * * *', true);
  });

  it('recharge le planificateur pour appliquer le changement immédiatement', async () => {
    await updateJob('users.purge', { enabled: false });

    expect(mockReloadScheduler).toHaveBeenCalledTimes(1);
    expect(mockComputeNextRun).toHaveBeenCalledWith('0 3 * * *', false);
  });

  it('accepte un appel sans charge utile et se contente de recalculer', async () => {
    await updateJob('users.purge');

    expect(db.cronJob.update.mock.calls[0][0].data).toEqual({
      updated_at: expect.any(Date),
      next_run_at: expect.any(Date),
    });
  });

  it('tolère une définition sans paramètres par défaut', async () => {
    mockGetJobDefinition.mockReturnValue({ category: 'purge', defaultSchedule: '0 3 * * *' });

    await updateJob('users.purge', { params: { retentionDays: 30 } });

    expect(db.cronJob.update.mock.calls[0][0].data.params).toBeNull();
  });

  it('refuse une expression cron invalide', async () => {
    mockIsValidSchedule.mockReturnValue(false);

    await expect(updateJob('users.purge', { schedule: 'n’importe quoi' })).rejects.toMatchObject({
      status: 400,
    });
    expect(db.cronJob.update).not.toHaveBeenCalled();
  });

  it.each([
    ['tâche absente du registre', () => mockGetJobDefinition.mockReturnValue(undefined)],
    ['tâche absente de la base', () => db.cronJob.findUnique.mockResolvedValue(null)],
  ])('renvoie 404 pour une %s', async (_label, arrange) => {
    arrange();

    await expect(updateJob('inconnue', {})).rejects.toMatchObject({ status: 404 });
  });

  it('convertit enabled et dry_run en booléens', async () => {
    await updateJob('users.purge', { enabled: 'oui', dry_run: 0 });

    expect(db.cronJob.update.mock.calls[0][0].data).toMatchObject({
      enabled: true,
      dry_run: false,
    });
  });

  it('accepte de vider les paramètres', async () => {
    await updateJob('users.purge', { params: null });

    expect(db.cronJob.update.mock.calls[0][0].data.params).toBeNull();
  });

  it('ne retient que les paramètres déclarés dans le registre', async () => {
    await updateJob('users.purge', { params: { retentionDays: 45, injecte: 'valeur' } });

    expect(db.cronJob.update.mock.calls[0][0].data.params).toEqual({ retentionDays: 45 });
  });

  it('tronque un paramètre numérique décimal', async () => {
    await updateJob('users.purge', { params: { retentionDays: 45.9 } });

    expect(db.cronJob.update.mock.calls[0][0].data.params).toEqual({ retentionDays: 45 });
  });

  it.each([
    ['zéro', 0],
    ['négatif', -5],
    ['au-delà de 10 ans', 3651],
    ['non numérique', 'trente'],
  ])('refuse un paramètre numérique %s', async (_label, retentionDays) => {
    await expect(updateJob('users.purge', { params: { retentionDays } })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('accepte la valeur haute de rétention', async () => {
    await updateJob('users.purge', { params: { retentionDays: 3650 } });

    expect(db.cronJob.update.mock.calls[0][0].data.params).toEqual({ retentionDays: 3650 });
  });

  it('convertit un paramètre booléen', async () => {
    await updateJob('users.purge', { params: { notify: 'oui' } });

    expect(db.cronJob.update.mock.calls[0][0].data.params).toEqual({ notify: true });
  });

  it('tronque un paramètre texte à 200 caractères', async () => {
    await updateJob('users.purge', { params: { label: 'a'.repeat(300) } });

    expect(db.cronJob.update.mock.calls[0][0].data.params.label).toHaveLength(200);
  });

  it.each([
    ['un tableau', [1, 2]],
    ['une chaîne', 'params'],
    ['un nombre', 42],
  ])('refuse des paramètres transmis comme %s', async (_label, params) => {
    await expect(updateJob('users.purge', { params })).rejects.toMatchObject({ status: 400 });
  });

  it('renvoie null quand aucun paramètre reconnu n’est fourni', async () => {
    await updateJob('users.purge', { params: { inconnu: 1 } });

    expect(db.cronJob.update.mock.calls[0][0].data.params).toBeNull();
  });
});

describe('triggerJob', () => {
  it('lance la tâche sans attendre sa fin', async () => {
    const result = await triggerJob('users.purge', { actorId: 9, actorEmail: 'admin@x.fr' });

    expect(mockRunJob).toHaveBeenCalledWith('users.purge', {
      trigger: 'manual',
      actorId: 9,
      actorEmail: 'admin@x.fr',
    });
    expect(result).toEqual({ key: 'users.purge', started: true, dry_run: false });
  });

  it('accepte un déclenchement sans acteur identifié', async () => {
    await triggerJob('users.purge');

    expect(mockRunJob).toHaveBeenCalledWith(
      'users.purge',
      expect.objectContaining({ actorId: null, actorEmail: null })
    );
  });

  it('refuse un second lancement tant que la tâche tourne', async () => {
    db.cronRun.findFirst.mockResolvedValue({ id_run: 3 });

    await expect(triggerJob('users.purge')).rejects.toMatchObject({ status: 409 });
    expect(mockRunJob).not.toHaveBeenCalled();
  });

  it.each([
    ['tâche absente du registre', () => mockGetJobDefinition.mockReturnValue(undefined)],
    ['tâche absente de la base', () => db.cronJob.findUnique.mockResolvedValue(null)],
  ])('renvoie 404 pour une %s', async (_label, arrange) => {
    arrange();

    await expect(triggerJob('inconnue')).rejects.toMatchObject({ status: 404 });
  });

  it('n’échoue pas quand l’exécution lancée part en erreur', async () => {
    mockRunJob.mockRejectedValue(new Error('purge cassée'));

    await expect(triggerJob('users.purge')).resolves.toMatchObject({ started: true });
  });
});

describe('listRuns', () => {
  it('applique une pagination par défaut de 25', async () => {
    await listRuns();

    expect(db.cronRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 25, where: {} })
    );
  });

  it('plafonne la taille de page à 100', async () => {
    const { pageSize } = await listRuns({ pageSize: 5000 });

    expect(pageSize).toBe(100);
  });

  it.each([
    ['page zéro', 0],
    ['page négative', -3],
    ['page non numérique', 'deux'],
  ])('ramène une %s à la première page', async (_label, page) => {
    const result = await listRuns({ page });

    expect(result.page).toBe(1);
    expect(db.cronRun.findMany.mock.calls[0][0].skip).toBe(0);
  });

  it('calcule le décalage à partir de la page demandée', async () => {
    await listRuns({ page: 3, pageSize: 10 });

    expect(db.cronRun.findMany.mock.calls[0][0]).toMatchObject({ skip: 20, take: 10 });
  });

  it('filtre sur la clé de tâche', async () => {
    await listRuns({ key: '  users.purge  ' });

    expect(db.cronRun.findMany.mock.calls[0][0].where).toEqual({ job: { key: 'users.purge' } });
  });

  it('ignore une clé vide', async () => {
    await listRuns({ key: '   ' });

    expect(db.cronRun.findMany.mock.calls[0][0].where).toEqual({});
  });

  it.each(['running', 'success', 'failed', 'skipped'])(
    'filtre sur le statut %s',
    async (status) => {
      await listRuns({ status });

      expect(db.cronRun.findMany.mock.calls[0][0].where.status).toBe(status);
    }
  );

  it('ignore un statut inconnu', async () => {
    await listRuns({ status: 'annulé' });

    expect(db.cronRun.findMany.mock.calls[0][0].where).toEqual({});
  });

  it('remonte la clé de la tâche au premier niveau de chaque exécution', async () => {
    db.cronRun.findMany.mockResolvedValue([
      { id_run: 1, status: 'success', job: { key: 'users.purge' } },
    ]);
    db.cronRun.count.mockResolvedValue(1);

    const { runs, total } = await listRuns();

    expect(runs[0]).toEqual({ id_run: 1, status: 'success', key: 'users.purge' });
    expect(total).toBe(1);
  });
});
