import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  image: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
  user: { findUnique: jest.fn() },
};

jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendAccountCreatedEmail: jest.fn(),
}));
jest.unstable_mockModule('../src/services/accountClosureService.js', () => ({
  reactivateOwnAccount: jest.fn(),
}));
jest.unstable_mockModule('../src/services/fileCleanupService.js', () => ({
  asFileReference: jest.fn((id, value) => ({ id, value })),
  removeUnreferencedFiles: jest.fn(),
}));

const { AVATAR_INCLUDE } = await import('../src/repositories/userRepository.js');
const { removeAvatar, updateAvatar } = await import('../src/services/userService.js');

const USER = {
  id_user: 7,
  email: 'lea@example.test',
  role: 'locataire',
  first_name: 'Léa',
  last_name: 'Martin',
  phone: null,
  images: [],
  is_active: true,
  deleted_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  db.image.findMany.mockResolvedValue([]);
  db.image.deleteMany.mockResolvedValue({ count: 0 });
  db.image.create.mockResolvedValue({ id_image: 22 });
  db.user.findUnique.mockResolvedValue(USER);
});

describe('compatibilité des avatars historiques', () => {
  it('ne lit que les avatars actifs des types historiques et actuels', () => {
    expect(AVATAR_INCLUDE.images.where).toEqual({
      type: { in: ['avatar', 'profil'] },
      deleted_at: null,
    });
  });

  it('remplace les lignes profil et avatar sans restreindre le nettoyage aux lignes actives', async () => {
    db.image.findMany
      .mockResolvedValueOnce([
        { id_image: 1, id_user: 7, type: 'profil', url: 'https://old/profil.jpg' },
        { id_image: 2, id_user: 7, type: 'avatar', url: 'https://old/avatar.jpg' },
      ])
      .mockResolvedValueOnce([
        { id_image: 1, type: 'profil', url: 'https://old/profil.jpg' },
        { id_image: 2, type: 'avatar', url: 'https://old/avatar.jpg' },
      ]);

    await updateAvatar(7, { filename: 'new-avatar.webp', detectedMimeType: 'image/webp' });

    expect(db.image.findMany.mock.calls[0][0].where).toEqual({
      id_user: 7,
      type: { in: ['avatar', 'profil'] },
    });
    expect(db.image.findMany.mock.calls[1][0].where).toEqual({
      type: { in: ['avatar', 'profil'] },
    });
    expect(db.image.deleteMany).toHaveBeenCalledWith({
      where: { id_user: 7, type: { in: ['avatar', 'profil'] } },
    });
    expect(db.image.create.mock.calls[0][0].data.type).toBe('avatar');
  });

  it('supprime les deux types d’avatars puis revient au profil généré', async () => {
    db.image.findMany
      .mockResolvedValueOnce([
        { id_image: 3, id_user: 7, type: 'profil', url: 'https://old/profil.jpg' },
      ])
      .mockResolvedValueOnce([{ id_image: 3, type: 'profil', url: 'https://old/profil.jpg' }]);

    const current = await removeAvatar(7);

    expect(db.image.deleteMany).toHaveBeenCalledWith({
      where: { id_user: 7, type: { in: ['avatar', 'profil'] } },
    });
    expect(current).toEqual(expect.objectContaining({ id_user: 7 }));
  });
});
