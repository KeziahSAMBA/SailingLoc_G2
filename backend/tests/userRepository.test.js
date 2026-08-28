import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const repo = await import('../src/repositories/userRepository.js');

// L'avatar est joint via la même clause partout : image de type 'avatar' non
// supprimée, la plus récente.
const AVATAR_INCLUDE = {
  images: {
    where: { type: 'avatar', deleted_at: null },
    orderBy: { created_at: 'desc' },
    take: 1,
    select: { url: true },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  db.user.findMany.mockResolvedValue([]);
  db.user.findUnique.mockResolvedValue(null);
  db.user.findFirst.mockResolvedValue(null);
  db.user.create.mockResolvedValue({ id_user: 1 });
  db.user.update.mockResolvedValue({ id_user: 1 });
  db.refreshToken.create.mockResolvedValue({ id_refresh: 10 });
  db.refreshToken.findUnique.mockResolvedValue(null);
  db.refreshToken.update.mockResolvedValue({ id_refresh: 10 });
  db.refreshToken.updateMany.mockResolvedValue({ count: 0 });
});

describe('recherche d’utilisateurs', () => {
  it('cherche tous les comptes partageant un email (un par rôle)', async () => {
    await repo.findUserByEmail('jean@example.com');

    expect(db.user.findMany).toHaveBeenCalledWith({ where: { email: 'jean@example.com' } });
  });

  it('cible le couple email + rôle et joint l’avatar', async () => {
    await repo.findUserByEmailAndRole('jean@example.com', 'locataire');

    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { email_role: { email: 'jean@example.com', role: 'locataire' } },
      include: AVATAR_INCLUDE,
    });
  });

  it('joint aussi l’avatar à la recherche par identifiant', async () => {
    await repo.findUserById(1);

    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { id_user: 1 },
      include: AVATAR_INCLUDE,
    });
  });

  it('cherche par jeton de réinitialisation', async () => {
    await repo.findUserByResetToken('hash-abc');

    expect(db.user.findFirst).toHaveBeenCalledWith({ where: { reset_token: 'hash-abc' } });
  });

  it('cherche par jeton de vérification d’email', async () => {
    await repo.findUserByVerificationToken('jeton-abc');

    expect(db.user.findFirst).toHaveBeenCalledWith({
      where: { email_verification_token: 'jeton-abc' },
    });
  });

  it('renvoie null quand aucun compte ne correspond', async () => {
    await expect(repo.findUserById(404)).resolves.toBeNull();
  });
});

describe('écriture d’utilisateurs', () => {
  it('crée le compte avec les données transmises', async () => {
    const data = { email: 'jean@example.com', role: 'locataire' };

    await repo.createUser(data);

    expect(db.user.create).toHaveBeenCalledWith({ data });
  });

  it('met à jour et renvoie le compte avec son avatar', async () => {
    await repo.updateUser(1, { first_name: 'Marie' });

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id_user: 1 },
      data: { first_name: 'Marie' },
      include: AVATAR_INCLUDE,
    });
  });
});

describe('jetons de rafraîchissement', () => {
  it('enregistre un jeton', async () => {
    const data = { id_user: 1, token_hash: 'hash', expires_at: new Date() };

    await repo.createRefreshToken(data);

    expect(db.refreshToken.create).toHaveBeenCalledWith({ data });
  });

  it('recherche un jeton par son condensat, jamais en clair', async () => {
    await repo.findRefreshTokenByHash('hash-abc');

    expect(db.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { token_hash: 'hash-abc' },
    });
  });

  it('révoque un jeton en l’horodatant', async () => {
    await repo.revokeRefreshToken(10);

    expect(db.refreshToken.update).toHaveBeenCalledWith({
      where: { id_refresh: 10 },
      data: { revoked_at: expect.any(Date) },
    });
  });

  it('ne révoque en masse que les jetons encore actifs', async () => {
    await repo.revokeAllUserRefreshTokens(1);

    expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id_user: 1, revoked_at: null },
      data: { revoked_at: expect.any(Date) },
    });
  });
});
