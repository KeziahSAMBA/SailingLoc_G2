import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import path from 'path';

const mockUnlink = jest.fn();
const mockRealpath = jest.fn();
const mockStat = jest.fn();

jest.unstable_mockModule('fs', () => ({
  default: { promises: { unlink: mockUnlink, realpath: mockRealpath, stat: mockStat } },
  promises: { unlink: mockUnlink, realpath: mockRealpath, stat: mockStat },
}));

const db = {
  user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
  document: { findMany: jest.fn(), deleteMany: jest.fn() },
  image: { findMany: jest.fn(), deleteMany: jest.fn() },
  boat: { findMany: jest.fn(), updateMany: jest.fn() },
  review: { findMany: jest.fn(), deleteMany: jest.fn(), updateMany: jest.fn() },
  bookingDocument: { deleteMany: jest.fn() },
  refreshToken: { deleteMany: jest.fn() },
  userBoatFavorite: { deleteMany: jest.fn() },
  activityLog: { updateMany: jest.fn() },
  cronRun: { updateMany: jest.fn() },
  $transaction: jest.fn((fn) => fn(db)),
};

jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const { anonymizableUsersWhere, anonymizeUser, anonymizedEmail } =
  await import('../src/services/userPurgeService.js');
const { default: usersPurge } = await import('../src/jobs/handlers/usersPurge.js');

const DAY_MS = 86400000;
const NOW = new Date('2026-08-04T04:00:00.000Z');

const dataOf = (mock) => mock.mock.calls[0][0].data;

beforeEach(() => {
  jest.clearAllMocks();
  mockUnlink.mockResolvedValue(undefined);
  mockRealpath.mockImplementation(async (value) => value);
  mockStat.mockResolvedValue({ isFile: () => true });
  db.$transaction.mockImplementation((fn) => fn(db));
  db.user.findUnique.mockResolvedValue({ id_user: 7, role: 'locataire' });
  db.user.findMany.mockResolvedValue([]);
  db.user.count.mockResolvedValue(0);
  db.user.update.mockResolvedValue({});
  db.document.findMany.mockResolvedValue([]);
  db.image.findMany.mockResolvedValue([]);
  db.boat.findMany.mockResolvedValue([]);
  db.review.findMany.mockResolvedValue([]);
  for (const model of [
    'document',
    'image',
    'review',
    'bookingDocument',
    'refreshToken',
    'userBoatFavorite',
  ]) {
    db[model].deleteMany.mockResolvedValue({ count: 0 });
  }
  for (const model of ['boat', 'review', 'activityLog', 'cronRun']) {
    db[model].updateMany.mockResolvedValue({ count: 0 });
  }
});

describe('users.purge — ciblage', () => {
  it('ne vise que les comptes supprimés au-delà du délai de grâce', () => {
    const where = anonymizableUsersWhere({ retentionDays: 30 }, NOW);
    expect(where.deleted_at.lt.getTime()).toBe(NOW.getTime() - 30 * DAY_MS);
  });

  it('ignore les comptes déjà anonymisés', () => {
    expect(anonymizableUsersWhere({}, NOW).anonymized_at).toBeNull();
  });

  it('retombe sur 30 jours si le délai est absent ou aberrant', () => {
    const expected = NOW.getTime() - 30 * DAY_MS;
    expect(anonymizableUsersWhere({}, NOW).deleted_at.lt.getTime()).toBe(expected);
    expect(anonymizableUsersWhere({ retentionDays: 0 }, NOW).deleted_at.lt.getTime()).toBe(
      expected
    );
  });

  it('ne relève que les identifiants', async () => {
    db.user.findMany.mockResolvedValue([{ id_user: 3 }, { id_user: 8 }]);
    const ids = await usersPurge.targets({ params: {}, now: NOW, take: 500 });
    expect(ids).toEqual([3, 8]);
    expect(db.user.findMany.mock.calls[0][0].select).toEqual({ id_user: true });
  });
});

describe('users.purge — anonymisation', () => {
  it('efface identité, contacts et jetons de réinitialisation', async () => {
    await anonymizeUser(7, NOW);
    const data = dataOf(db.user.update);

    expect(data).toMatchObject({
      first_name: 'Anonyme',
      last_name: 'Anonyme',
      email: 'anonyme.7@supprime.invalid',
      phone: null,
      stripe_account_id: null,
      reset_token: null,
      email_verification_token: null,
      is_active: false,
      anonymized_at: NOW,
    });
  });

  it('ne touche pas deleted_at quand l’admin a déjà supprimé le compte', async () => {
    await anonymizeUser(7, NOW);
    expect(dataOf(db.user.update).deleted_at).toBeUndefined();
  });

  it('pose deleted_at quand aucune suppression ne l’a précédée', async () => {
    // Sinon le compte resterait listé dans le back-office, qui filtre dessus.
    await anonymizeUser(7, NOW, { markDeleted: true });
    expect(dataOf(db.user.update).deleted_at).toBe(NOW);
  });

  it('rend le compte non connectable', async () => {
    await anonymizeUser(7, NOW);
    // Aucun hash bcrypt ne peut valoir cette chaîne.
    expect(dataOf(db.user.update).password).toBe('anonymise');
  });

  it('retire l’adresse des journaux, sans quoi l’effacement serait incomplet', async () => {
    await anonymizeUser(7, NOW);

    expect(db.activityLog.updateMany).toHaveBeenCalledWith({
      where: { actor_id: 7 },
      data: { actor_email: anonymizedEmail(7) },
    });
    expect(db.cronRun.updateMany).toHaveBeenCalledWith({
      where: { actor_id: 7 },
      data: { actor_email: anonymizedEmail(7) },
    });
  });

  it('supprime les documents, leur lien de réservation et le fichier disque', async () => {
    db.document.findMany.mockResolvedValue([
      { id_document: 1, file_url: 'storage/documents/a.pdf' },
      { id_document: 2, file_url: 'storage/documents/b.pdf' },
    ]);
    db.document.deleteMany.mockResolvedValue({ count: 2 });

    const outcome = await anonymizeUser(7, NOW);

    expect(db.bookingDocument.deleteMany).toHaveBeenCalledWith({
      where: { id_document: { in: [1, 2] } },
    });
    expect(mockUnlink).toHaveBeenCalledWith(path.resolve('storage/documents/a.pdf'));
    expect(outcome.files).toBe(2);
  });

  it('supprime l’avatar du disque sous UPLOADS_DIR', async () => {
    db.image.findMany.mockResolvedValue([
      { id_image: 4, url: 'http://localhost:4000/uploads/avatars/moi.png' },
    ]);

    await anonymizeUser(7, NOW);

    expect(mockUnlink).toHaveBeenCalledWith(path.resolve('uploads/avatars/moi.png'));
  });
});

describe('users.purge — avis selon le rôle', () => {
  it('supprime les avis écrits par un locataire', async () => {
    db.review.deleteMany.mockResolvedValue({ count: 3 });

    const outcome = await anonymizeUser(7, NOW);

    expect(db.review.deleteMany).toHaveBeenCalledWith({ where: { id_user: 7 } });
    expect(outcome.reviews).toBe(3);
  });

  it('épargne les avis des tiers et ne retire que la réponse du propriétaire', async () => {
    // La réponse appartient au propriétaire, mais la ligne appartient au
    // locataire qui l'a écrite : la supprimer effacerait le texte d'un tiers.
    db.user.findUnique.mockResolvedValue({ id_user: 9, role: 'proprietaire' });
    db.boat.findMany.mockResolvedValue([{ id_boat: 2 }]);
    db.review.findMany.mockResolvedValue([{ id_review: 11 }]);

    const outcome = await anonymizeUser(9, NOW);

    expect(db.review.deleteMany).not.toHaveBeenCalled();
    expect(db.review.updateMany).toHaveBeenCalledWith({
      where: { id_review: { in: [11] } },
      data: { owner_reply: null, owner_reply_at: null, updated_at: NOW },
    });
    expect(outcome.reviews).toBe(0);
    expect(outcome.ownerReplies).toBe(1);
  });

  it('dépublie les annonces du propriétaire', async () => {
    db.user.findUnique.mockResolvedValue({ id_user: 9, role: 'proprietaire' });
    db.boat.findMany.mockResolvedValue([{ id_boat: 2 }, { id_boat: 5 }]);
    db.boat.updateMany.mockResolvedValue({ count: 2 });

    const outcome = await anonymizeUser(9, NOW);

    expect(db.boat.updateMany).toHaveBeenCalledWith({
      where: { id_boat: { in: [2, 5] } },
      data: { is_published: false, deleted_at: NOW, updated_at: NOW },
    });
    expect(outcome.boats).toBe(2);
  });
});

describe('users.purge — exécution', () => {
  it('compte sans rien modifier', async () => {
    db.user.count.mockResolvedValue(4);

    expect(await usersPurge.count({ params: {}, now: NOW })).toBe(4);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('additionne le détail sur plusieurs comptes', async () => {
    db.user.findMany.mockResolvedValue([{ id_user: 7 }, { id_user: 8 }]);
    db.document.findMany.mockResolvedValue([
      { id_document: 1, file_url: 'storage/documents/a.pdf' },
    ]);
    db.document.deleteMany.mockResolvedValue({ count: 1 });

    const outcome = await usersPurge.run({ params: {}, now: NOW });

    expect(outcome.affected).toBe(2);
    expect(outcome.detail).toMatchObject({ users: 2, documents: 2, files: 2 });
  });

  it('arrive désactivée et en simulation', () => {
    expect(usersPurge.defaultEnabled).toBe(false);
    expect(usersPurge.defaultDryRun).toBe(true);
    expect(usersPurge.defaultParams).toEqual({ retentionDays: 30 });
    expect(usersPurge.maxBatch).toBe(500);
  });
});
