import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  activityLog: { create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const { logActivity, listLogs, listLogFilters } = await import('../src/services/logService.js');

const written = () => db.activityLog.create.mock.calls[0][0].data;

beforeEach(() => {
  jest.clearAllMocks();
  db.activityLog.create.mockResolvedValue({ id_log: 1 });
  db.activityLog.count.mockResolvedValue(0);
  db.activityLog.findMany.mockResolvedValue([]);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('logActivity — écriture', () => {
  it('enregistre une entrée complète', async () => {
    await logActivity({
      category: 'user',
      action: 'user.update',
      actorId: 9,
      actorEmail: 'admin@x.fr',
      actorRole: 'admin',
      targetType: 'user',
      targetId: '3',
      ip: '203.0.113.7',
    });

    expect(written()).toMatchObject({
      level: 'info',
      category: 'user',
      action: 'user.update',
      actor_id: 9,
      actor_email: 'admin@x.fr',
      target_id: '3',
      ip: '203.0.113.7',
    });
  });

  it.each([
    ['catégorie manquante', { action: 'user.update' }],
    ['action manquante', { category: 'user' }],
    ['appel sans argument', undefined],
  ])('n’écrit rien pour une %s', async (_label, payload) => {
    await expect(logActivity(payload)).resolves.toBeNull();
    expect(db.activityLog.create).not.toHaveBeenCalled();
  });

  it.each(['info', 'warning', 'error'])('accepte le niveau %s', async (level) => {
    await logActivity({ level, category: 'user', action: 'user.update' });

    expect(written().level).toBe(level);
  });

  it('retombe sur « info » pour un niveau inconnu', async () => {
    await logActivity({ level: 'critique', category: 'user', action: 'user.update' });

    expect(written().level).toBe('info');
  });

  it('n’échoue jamais quand l’écriture du log casse', async () => {
    db.activityLog.create.mockRejectedValue(new Error('Base injoignable'));

    await expect(logActivity({ category: 'user', action: 'user.update' })).resolves.toBeNull();
  });
});

describe('logActivity — normalisation des valeurs', () => {
  it.each([
    ['catégorie', 'category', 'category', 50],
    ['action', 'action', 'action', 100],
    ['message', 'message', 'message', 500],
    ['email', 'actorEmail', 'actor_email', 255],
    ['rôle', 'actorRole', 'actor_role', 20],
    ['type de cible', 'targetType', 'target_type', 50],
    ['identifiant de cible', 'targetId', 'target_id', 50],
    ['adresse IP', 'ip', 'ip', 64],
  ])('tronque la %s à %i caractères', async (_label, field, column, max) => {
    await logActivity({ category: 'user', action: 'user.update', [field]: 'a'.repeat(max + 50) });

    expect(written()[column]).toHaveLength(max);
  });

  it('rogne les espaces autour des valeurs', async () => {
    await logActivity({ category: 'user', action: 'user.update', message: '  trace  ' });

    expect(written().message).toBe('trace');
  });

  it.each([
    ['valeur absente', undefined],
    ['valeur nulle', null],
    ['chaîne vide', ''],
    ['chaîne d’espaces', '   '],
  ])('remplace un message %s par null', async (_label, message) => {
    await logActivity({ category: 'user', action: 'user.update', message });

    expect(written().message).toBeNull();
  });

  it('n’accepte un identifiant d’acteur que s’il est entier', async () => {
    await logActivity({ category: 'user', action: 'user.update', actorId: 9 });
    expect(written().actor_id).toBe(9);
  });

  it.each([
    ['décimal', 9.5],
    ['chaîne', '9'],
    ['absent', undefined],
  ])('met actor_id à null pour un identifiant %s', async (_label, actorId) => {
    await logActivity({ category: 'user', action: 'user.update', actorId });

    expect(written().actor_id).toBeNull();
  });
});

describe('logActivity — assainissement des métadonnées', () => {
  it.each(['password', 'token', 'accessToken', 'refreshToken', 'secret'])(
    'ne stocke jamais la clé « %s »',
    async (key) => {
      await logActivity({
        category: 'user',
        action: 'user.update',
        meta: { [key]: 'valeur-sensible', email: 'jean@x.fr' },
      });

      expect(written().meta).toEqual({ email: 'jean@x.fr' });
      expect(JSON.stringify(written().meta)).not.toContain('valeur-sensible');
    }
  );

  it('écarte les valeurs indéfinies et les fonctions', async () => {
    await logActivity({
      category: 'user',
      action: 'user.update',
      meta: { garde: 1, absent: undefined, fn: () => {} },
    });

    expect(written().meta).toEqual({ garde: 1 });
  });

  it.each([
    ['métadonnées absentes', undefined],
    ['tableau', [1, 2]],
    ['chaîne', 'meta'],
    ['objet vide', {}],
    ['objet ne contenant que des clés sensibles', { password: 'x' }],
  ])('produit un meta nul pour des %s', async (_label, meta) => {
    await logActivity({ category: 'user', action: 'user.update', meta });

    expect(written().meta).toBeNull();
  });
});

describe('listLogs', () => {
  const where = () => db.activityLog.findMany.mock.calls[0][0].where;

  it('ne filtre pas par défaut et pagine à 25', async () => {
    const result = await listLogs();

    expect(where()).toEqual({});
    expect(result).toMatchObject({ page: 1, pageSize: 25 });
  });

  it.each(['info', 'warning', 'error'])('filtre sur le niveau %s', async (level) => {
    await listLogs({ level });

    expect(where().level).toBe(level);
  });

  it('ignore un niveau inconnu', async () => {
    await listLogs({ level: 'critique' });

    expect(where()).not.toHaveProperty('level');
  });

  it.each(['admin', 'proprietaire', 'locataire'])('filtre sur le rôle %s', async (role) => {
    await listLogs({ role });

    expect(where().actor_role).toBe(role);
  });

  it('filtre sur la catégorie et l’action, espaces rognés', async () => {
    await listLogs({ category: '  user  ', action: '  user.update  ' });

    expect(where()).toMatchObject({ category: 'user', action: 'user.update' });
  });

  it.each([
    ['catégorie vide', { category: '   ' }],
    ['action vide', { action: '' }],
  ])('ignore une %s', async (_label, filters) => {
    await listLogs(filters);

    expect(where()).toEqual({});
  });

  it('filtre sur l’identifiant d’acteur', async () => {
    await listLogs({ actor: '9' });

    expect(where().actor_id).toBe(9);
  });

  it.each([
    ['acteur absent', undefined],
    ['acteur vide', ''],
    ['acteur non numérique', 'abc'],
  ])('ignore un %s', async (_label, actor) => {
    await listLogs({ actor });

    expect(where()).not.toHaveProperty('actor_id');
  });

  it('cherche sur l’email, l’action, le message et la cible', async () => {
    await listLogs({ search: '  purge  ' });

    expect(where().OR).toEqual([
      { actor_email: { contains: 'purge', mode: 'insensitive' } },
      { action: { contains: 'purge', mode: 'insensitive' } },
      { message: { contains: 'purge', mode: 'insensitive' } },
      { target_id: { contains: 'purge', mode: 'insensitive' } },
    ]);
  });

  it('borne la période sur les deux dates', async () => {
    await listLogs({ from: '2026-06-01', to: '2026-06-30' });

    expect(where().created_at).toEqual({
      gte: new Date('2026-06-01'),
      lte: new Date('2026-06-30'),
    });
  });

  it.each([
    ['borne basse seule', { from: '2026-06-01' }, 'gte'],
    ['borne haute seule', { to: '2026-06-30' }, 'lte'],
  ])('accepte une %s', async (_label, filters, key) => {
    await listLogs(filters);

    expect(Object.keys(where().created_at)).toEqual([key]);
  });

  it.each([
    ['dates illisibles', { from: 'hier', to: 'demain' }],
    ['dates absentes', {}],
  ])('ignore des %s', async (_label, filters) => {
    await listLogs(filters);

    expect(where()).not.toHaveProperty('created_at');
  });

  it('plafonne la taille de page à 100', async () => {
    const { pageSize } = await listLogs({ pageSize: 5000 });

    expect(pageSize).toBe(100);
  });

  it.each([
    ['page zéro', 0],
    ['page négative', -3],
    ['page non numérique', 'deux'],
  ])('ramène une %s à la première page', async (_label, page) => {
    const result = await listLogs({ page });

    expect(result.page).toBe(1);
  });

  it('calcule le décalage à partir de la page demandée', async () => {
    await listLogs({ page: 4, pageSize: 10 });

    expect(db.activityLog.findMany.mock.calls[0][0]).toMatchObject({ skip: 30, take: 10 });
  });

  it('renvoie le total et les entrées', async () => {
    db.activityLog.count.mockResolvedValue(42);
    db.activityLog.findMany.mockResolvedValue([{ id_log: 1 }]);

    const result = await listLogs();

    expect(result).toMatchObject({ total: 42, logs: [{ id_log: 1 }] });
  });
});

describe('listLogFilters', () => {
  it('renvoie les niveaux et rôles connus, plus les valeurs présentes en base', async () => {
    db.activityLog.findMany
      .mockResolvedValueOnce([{ category: 'user' }, { category: 'boat' }])
      .mockResolvedValueOnce([{ action: 'user.update' }, { action: 'boat.publish' }]);

    const filters = await listLogFilters();

    expect(filters).toEqual({
      levels: ['info', 'warning', 'error'],
      roles: ['admin', 'proprietaire', 'locataire'],
      categories: ['boat', 'user'],
      actions: ['boat.publish', 'user.update'],
    });
  });

  it('tolère une base sans aucun log', async () => {
    const filters = await listLogFilters();

    expect(filters).toMatchObject({ categories: [], actions: [] });
  });
});
