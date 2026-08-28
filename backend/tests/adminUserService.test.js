import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const { listUsers, updateUserByAdmin, deleteUserByAdmin } =
  await import('../src/services/adminUserService.js');

const ADMIN_ID = 9;

const storedUser = (overrides = {}) => ({
  id_user: 3,
  first_name: 'Jean',
  last_name: 'Dupont',
  email: 'jean@example.com',
  role: 'locataire',
  phone: '+33612345678',
  is_active: true,
  created_at: new Date('2026-01-01'),
  deleted_at: null,
  password: 'hash-secret',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  db.user.findMany.mockResolvedValue([]);
  db.user.findUnique.mockResolvedValue(storedUser());
  db.user.update.mockImplementation(async ({ data }) => storedUser(data));
});

describe('listUsers — filtres', () => {
  it('exclut toujours les comptes supprimés', async () => {
    await listUsers();

    expect(db.user.findMany).toHaveBeenCalledWith({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  });

  it.each(['admin', 'proprietaire', 'locataire'])('filtre sur le rôle %s', async (role) => {
    await listUsers({ role });

    expect(db.user.findMany.mock.calls[0][0].where.role).toBe(role);
  });

  it('ignore un rôle inconnu', async () => {
    await listUsers({ role: 'root' });

    expect(db.user.findMany.mock.calls[0][0].where).not.toHaveProperty('role');
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('filtre sur active=%s', async (active, expected) => {
    await listUsers({ active });

    expect(db.user.findMany.mock.calls[0][0].where.is_active).toBe(expected);
  });

  it('ignore une valeur d’activité non reconnue', async () => {
    await listUsers({ active: 'peut-être' });

    expect(db.user.findMany.mock.calls[0][0].where).not.toHaveProperty('is_active');
  });

  it('cherche sur le prénom, le nom et l’email', async () => {
    await listUsers({ search: '  dupont  ' });

    expect(db.user.findMany.mock.calls[0][0].where.OR).toEqual([
      { first_name: { contains: 'dupont', mode: 'insensitive' } },
      { last_name: { contains: 'dupont', mode: 'insensitive' } },
      { email: { contains: 'dupont', mode: 'insensitive' } },
    ]);
  });

  it('ignore une recherche vide', async () => {
    await listUsers({ search: '   ' });

    expect(db.user.findMany.mock.calls[0][0].where).not.toHaveProperty('OR');
  });

  it.each(['created_at', 'last_name', 'first_name', 'email', 'role'])(
    'accepte le tri sur %s',
    async (sort) => {
      await listUsers({ sort });

      expect(db.user.findMany.mock.calls[0][0].orderBy).toEqual({ [sort]: 'desc' });
    }
  );

  it('retombe sur created_at pour un champ de tri non autorisé', async () => {
    await listUsers({ sort: 'password' });

    expect(db.user.findMany.mock.calls[0][0].orderBy).toEqual({ created_at: 'desc' });
  });

  it('accepte l’ordre croissant', async () => {
    await listUsers({ order: 'asc' });

    expect(db.user.findMany.mock.calls[0][0].orderBy).toEqual({ created_at: 'asc' });
  });

  it('n’expose jamais le mot de passe', async () => {
    db.user.findMany.mockResolvedValue([storedUser()]);

    const [user] = await listUsers();

    expect(user).not.toHaveProperty('password');
    expect(user).toMatchObject({ id_user: 3, email: 'jean@example.com' });
  });
});

describe('updateUserByAdmin', () => {
  it.each([
    ['utilisateur inexistant', null],
    ['utilisateur supprimé', storedUser({ deleted_at: new Date() })],
  ])('renvoie 404 pour un %s', async (_label, user) => {
    db.user.findUnique.mockResolvedValue(user);

    await expect(updateUserByAdmin(3, ADMIN_ID, { first_name: 'Marie' })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('met à jour les champs fournis et rogne les espaces', async () => {
    await updateUserByAdmin(3, ADMIN_ID, { first_name: '  Marie  ' });

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id_user: 3 },
      data: { first_name: 'Marie', updated_at: expect.any(Date) },
    });
  });

  it.each([
    ['prénom vide', { first_name: '   ' }],
    ['prénom trop long', { first_name: 'a'.repeat(101) }],
    ['nom vide', { last_name: '' }],
    ['nom trop long', { last_name: 'a'.repeat(101) }],
    ['téléphone invalide', { phone: 'abcdef' }],
    ['rôle inconnu', { role: 'root' }],
    ['email mal formé', { email: 'pas-un-email' }],
    ['email trop long', { email: `${'a'.repeat(250)}@example.com` }],
  ])('refuse un %s', async (_label, payload) => {
    await expect(updateUserByAdmin(3, ADMIN_ID, payload)).rejects.toMatchObject({ status: 400 });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('met à jour le nom de famille', async () => {
    await updateUserByAdmin(3, ADMIN_ID, { last_name: '  Martin  ' });

    expect(db.user.update.mock.calls[0][0].data.last_name).toBe('Martin');
  });

  it('efface le téléphone quand une chaîne vide est envoyée', async () => {
    await updateUserByAdmin(3, ADMIN_ID, { phone: '' });

    expect(db.user.update.mock.calls[0][0].data.phone).toBeNull();
  });

  it('normalise l’email en minuscules', async () => {
    db.user.findUnique.mockResolvedValueOnce(storedUser()).mockResolvedValueOnce(null);

    await updateUserByAdmin(3, ADMIN_ID, { email: '  NOUVEAU@Example.COM  ' });

    expect(db.user.update.mock.calls[0][0].data.email).toBe('nouveau@example.com');
  });

  it('vérifie l’unicité du couple email + rôle avant de changer l’email', async () => {
    db.user.findUnique.mockResolvedValueOnce(storedUser()).mockResolvedValueOnce(null);

    await updateUserByAdmin(3, ADMIN_ID, { email: 'nouveau@example.com' });

    expect(db.user.findUnique).toHaveBeenNthCalledWith(2, {
      where: { email_role: { email: 'nouveau@example.com', role: 'locataire' } },
    });
  });

  it('renvoie 409 quand le couple email + rôle est déjà pris', async () => {
    db.user.findUnique.mockResolvedValueOnce(storedUser()).mockResolvedValueOnce({ id_user: 77 });

    await expect(
      updateUserByAdmin(3, ADMIN_ID, { email: 'pris@example.com' })
    ).rejects.toMatchObject({ status: 409 });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('tolère un conflit qui pointe sur l’utilisateur lui-même', async () => {
    db.user.findUnique.mockResolvedValueOnce(storedUser()).mockResolvedValueOnce({ id_user: 3 });

    await expect(
      updateUserByAdmin(3, ADMIN_ID, { email: 'nouveau@example.com' })
    ).resolves.toBeDefined();
  });

  it('vérifie aussi l’unicité lors d’un simple changement de rôle', async () => {
    db.user.findUnique.mockResolvedValueOnce(storedUser()).mockResolvedValueOnce(null);

    await updateUserByAdmin(3, ADMIN_ID, { role: 'proprietaire' });

    expect(db.user.findUnique).toHaveBeenNthCalledWith(2, {
      where: { email_role: { email: 'jean@example.com', role: 'proprietaire' } },
    });
  });

  it('ne vérifie pas l’unicité quand ni l’email ni le rôle ne changent', async () => {
    await updateUserByAdmin(3, ADMIN_ID, { first_name: 'Marie' });

    expect(db.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it('empêche un admin de se désactiver lui-même', async () => {
    db.user.findUnique.mockResolvedValue(storedUser({ id_user: ADMIN_ID }));

    await expect(updateUserByAdmin(ADMIN_ID, ADMIN_ID, { is_active: false })).rejects.toMatchObject(
      { status: 400 }
    );
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('laisse un admin se réactiver lui-même', async () => {
    db.user.findUnique.mockResolvedValue(storedUser({ id_user: ADMIN_ID }));

    await expect(updateUserByAdmin(ADMIN_ID, ADMIN_ID, { is_active: true })).resolves.toBeDefined();
  });

  it('lève la pause volontaire quand l’admin réactive un compte', async () => {
    await updateUserByAdmin(3, ADMIN_ID, { is_active: true });

    expect(db.user.update.mock.calls[0][0].data).toMatchObject({
      is_active: true,
      deactivated_at: null,
    });
  });

  it('refuse une mise à jour sans aucun champ', async () => {
    await expect(updateUserByAdmin(3, ADMIN_ID, {})).rejects.toMatchObject({
      status: 400,
      message: 'Aucune modification à appliquer.',
    });
  });
});

describe('deleteUserByAdmin', () => {
  it('supprime en douceur pour préserver l’historique', async () => {
    await deleteUserByAdmin(3, ADMIN_ID);

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id_user: 3 },
      data: { is_active: false, deactivated_at: null, deleted_at: expect.any(Date) },
    });
  });

  it('empêche un admin de supprimer son propre compte', async () => {
    await expect(deleteUserByAdmin(ADMIN_ID, ADMIN_ID)).rejects.toMatchObject({ status: 400 });
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['utilisateur inexistant', null],
    ['utilisateur déjà supprimé', storedUser({ deleted_at: new Date() })],
  ])('renvoie 404 pour un %s', async (_label, user) => {
    db.user.findUnique.mockResolvedValue(user);

    await expect(deleteUserByAdmin(3, ADMIN_ID)).rejects.toMatchObject({ status: 404 });
    expect(db.user.update).not.toHaveBeenCalled();
  });
});
