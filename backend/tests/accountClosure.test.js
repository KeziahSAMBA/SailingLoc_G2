import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  boat: { count: jest.fn(), updateMany: jest.fn() },
  booking: { count: jest.fn() },
  dispute: { count: jest.fn() },
  refreshToken: { updateMany: jest.fn() },
  $transaction: jest.fn((fn) => fn(db)),
};

const mockCompare = jest.fn();

jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));
jest.unstable_mockModule('bcryptjs', () => ({
  default: { compare: mockCompare },
  compare: mockCompare,
}));
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendAccountDeactivatedEmail: jest.fn().mockResolvedValue(undefined),
  sendAccountDeletionEmail: jest.fn().mockResolvedValue(undefined),
  sendPauseNoticeEmail: jest.fn().mockResolvedValue(undefined),
}));

const {
  getClosureStatus,
  deactivateOwnAccount,
  deleteOwnAccount,
  reactivateOwnAccount,
  DELETION_RETENTION_DAYS,
} = await import('../src/services/accountClosureService.js');

const GUEST = {
  id_user: 7,
  role: 'locataire',
  email: 'lea@example.com',
  first_name: 'Léa',
  password: 'hash',
  is_active: true,
  deleted_at: null,
};

const OWNER = { ...GUEST, id_user: 9, role: 'proprietaire', email: 'marc@example.com' };

const userUpdateData = () => db.user.update.mock.calls[0][0].data;
const boatUpdateArgs = () => db.boat.updateMany.mock.calls[0][0];

beforeEach(() => {
  jest.clearAllMocks();
  db.$transaction.mockImplementation((fn) => fn(db));
  db.user.findUnique.mockResolvedValue(GUEST);
  db.user.update.mockResolvedValue({});
  db.boat.count.mockResolvedValue(0);
  db.boat.updateMany.mockResolvedValue({ count: 0 });
  db.booking.count.mockResolvedValue(0);
  db.dispute.count.mockResolvedValue(0);
  db.refreshToken.updateMany.mockResolvedValue({ count: 0 });
  mockCompare.mockResolvedValue(true);
});

describe('getClosureStatus', () => {
  it('autorise la fermeture sans réservation ni litige', async () => {
    const status = await getClosureStatus(7);

    expect(status).toMatchObject({
      role: 'locataire',
      blockers: { activeBookings: 0, openDisputes: 0 },
      canClose: true,
      retentionDays: DELETION_RETENTION_DAYS,
    });
  });

  it('cible les réservations des annonces pour un propriétaire', async () => {
    db.user.findUnique.mockResolvedValue(OWNER);
    db.booking.count.mockResolvedValue(2);

    const status = await getClosureStatus(9);

    expect(db.booking.count.mock.calls[0][0].where.boat).toEqual({ id_user: 9 });
    expect(status.canClose).toBe(false);
    expect(status.blockers.activeBookings).toBe(2);
  });

  it('refuse un compte administrateur', async () => {
    db.user.findUnique.mockResolvedValue({ ...GUEST, role: 'admin' });

    await expect(getClosureStatus(1)).rejects.toMatchObject({ status: 403 });
  });

  it('refuse un compte déjà supprimé', async () => {
    db.user.findUnique.mockResolvedValue({ ...GUEST, deleted_at: new Date() });

    await expect(getClosureStatus(7)).rejects.toMatchObject({ status: 404 });
  });
});

describe('deactivateOwnAccount', () => {
  it('rejette un mot de passe incorrect sans rien écrire', async () => {
    mockCompare.mockResolvedValue(false);

    await expect(deactivateOwnAccount(7, { password: 'faux' })).rejects.toMatchObject({
      status: 400,
    });
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('rejette une réservation en cours', async () => {
    db.booking.count.mockResolvedValue(1);

    await expect(deactivateOwnAccount(7, { password: 'bon' })).rejects.toMatchObject({
      status: 409,
    });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('rejette un litige ouvert', async () => {
    db.dispute.count.mockResolvedValue(1);

    await expect(deactivateOwnAccount(7, { password: 'bon' })).rejects.toMatchObject({
      status: 409,
    });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('dépublie les annonces, révoque les sessions et marque la pause', async () => {
    db.user.findUnique.mockResolvedValue(OWNER);

    await deactivateOwnAccount(9, { password: 'bon' });

    expect(boatUpdateArgs().where).toEqual({ id_user: 9, deleted_at: null, is_published: true });
    expect(boatUpdateArgs().data.is_published).toBe(false);
    expect(boatUpdateArgs().data.deleted_at).toBeUndefined();
    expect(db.refreshToken.updateMany.mock.calls[0][0].where).toEqual({
      id_user: 9,
      revoked_at: null,
    });
    expect(userUpdateData()).toMatchObject({ is_active: false });
    expect(userUpdateData().deactivated_at).toBeInstanceOf(Date);
    expect(userUpdateData().deleted_at).toBeUndefined();
  });
});

describe('deleteOwnAccount', () => {
  it('exige le mot de confirmation avant toute vérification', async () => {
    await expect(
      deleteOwnAccount(7, { password: 'bon', confirmation: 'ok' })
    ).rejects.toMatchObject({ status: 400 });
    expect(mockCompare).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('accepte le mot de confirmation anglais', async () => {
    await deleteOwnAccount(7, { password: 'bon', confirmation: 'delete' });

    expect(userUpdateData().deleted_at).toBeInstanceOf(Date);
  });

  it('ferme le compte et retire les annonces', async () => {
    db.user.findUnique.mockResolvedValue(OWNER);

    await deleteOwnAccount(9, { password: 'bon', confirmation: 'SUPPRIMER' });

    expect(boatUpdateArgs().where).toEqual({ id_user: 9, deleted_at: null });
    expect(boatUpdateArgs().data.is_published).toBe(false);
    expect(boatUpdateArgs().data.deleted_at).toBeInstanceOf(Date);
    expect(db.refreshToken.updateMany).toHaveBeenCalled();
    expect(userUpdateData()).toMatchObject({ is_active: false, deactivated_at: null });
    expect(userUpdateData().deleted_at).toBeInstanceOf(Date);
  });

  it('rejette une réservation en cours', async () => {
    db.booking.count.mockResolvedValue(1);

    await expect(
      deleteOwnAccount(7, { password: 'bon', confirmation: 'SUPPRIMER' })
    ).rejects.toMatchObject({ status: 409 });
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe('reactivateOwnAccount', () => {
  it('republie les annonces publiées avant la pause', async () => {
    const now = new Date('2026-08-05T10:00:00.000Z');

    await reactivateOwnAccount(9, now);

    expect(boatUpdateArgs()).toEqual({
      where: { id_user: 9, deleted_at: null, status: 'published' },
      data: { is_published: true, updated_at: now },
    });
    // pause_notified_at repart à null : une relance déjà envoyée ne doit pas
    // faire fermer le compte au prochain passage du cron.
    expect(userUpdateData()).toEqual({
      is_active: true,
      deactivated_at: null,
      pause_notified_at: null,
      updated_at: now,
    });
  });
});
