import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  boat: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  boatReport: { updateMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
};

jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendBoatUnpublishedEmail: jest.fn().mockResolvedValue(undefined),
  sendBoatRepublishedEmail: jest.fn().mockResolvedValue(undefined),
}));

const { listBoats, setBoatPublished } = await import('../src/services/boatAdminService.js');

const OWNER = { id_user: 3, first_name: 'Luc', last_name: 'Martin', email: 'luc@example.test' };

function boatRow(overrides = {}) {
  return {
    id_boat: 12,
    name: 'Le Mistral',
    type: 'voilier',
    daily_price: 350,
    is_published: false,
    status: 'pending',
    registration: 'FR-12',
    created_at: new Date('2026-01-01'),
    owner: OWNER,
    _count: { reports: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  db.boatReport.count.mockResolvedValue(0);
});

describe('validation des annonces côté admin', () => {
  it('expose le statut d’annonce, pour distinguer une annonce en attente d’une annonce refusée', async () => {
    db.boat.findMany.mockResolvedValue([
      boatRow({ id_boat: 12, status: 'pending' }),
      boatRow({ id_boat: 13, status: 'refused' }),
    ]);

    const boats = await listBoats();

    // Les deux ont is_published à false : sans le statut, l'admin ne peut pas
    // savoir laquelle reste à traiter.
    expect(boats.map((b) => b.is_published)).toEqual([false, false]);
    expect(boats.map((b) => b.status)).toEqual(['pending', 'refused']);
  });

  it('renvoie la même projection que la liste, sinon l’interface garde un statut périmé', async () => {
    db.boat.findMany.mockResolvedValue([boatRow()]);
    db.boat.findUnique.mockResolvedValue(boatRow());
    db.boat.update.mockResolvedValue(boatRow({ is_published: true, status: 'published' }));

    const [listed] = await listBoats();
    const decided = await setBoatPublished(12, true);

    // La ligne du tableau est fusionnée avec cette réponse : un champ absent
    // ici resterait figé à sa valeur précédente jusqu'au rechargement.
    expect(Object.keys(decided).sort()).toEqual(Object.keys(listed).sort());
    expect(decided.status).toBe('published');
    expect(decided.is_published).toBe(true);
  });

  it('accepter une annonce la publie et la passe au statut publié', async () => {
    db.boat.findUnique.mockResolvedValue(boatRow());
    db.boat.update.mockResolvedValue(boatRow({ is_published: true, status: 'published' }));

    await setBoatPublished(12, true);

    expect(db.boat.update).toHaveBeenCalledTimes(1);
    expect(db.boat.update.mock.calls[0][0].data).toMatchObject({
      is_published: true,
      status: 'published',
    });
  });

  it('refuser une annonce la dépublie et la passe au statut refusé', async () => {
    db.boat.findUnique.mockResolvedValue(boatRow({ is_published: true, status: 'published' }));
    db.boat.update.mockResolvedValue(boatRow({ is_published: false, status: 'refused' }));
    db.boatReport.updateMany.mockResolvedValue({ count: 0 });

    await setBoatPublished(12, false);

    expect(db.boat.update.mock.calls[0][0].data).toMatchObject({
      is_published: false,
      status: 'refused',
    });
  });

  it('un refus clôt les signalements en attente du bateau', async () => {
    db.boat.findUnique.mockResolvedValue(boatRow({ is_published: true, status: 'published' }));
    db.boat.update.mockResolvedValue(boatRow({ is_published: false, status: 'refused' }));
    db.boatReport.updateMany.mockResolvedValue({ count: 2 });

    await setBoatPublished(12, false);

    expect(db.boatReport.updateMany).toHaveBeenCalledWith({
      where: { id_boat: 12, status: 'pending' },
      data: { status: 'resolved', resolved_at: expect.any(Date) },
    });
  });

  it('une acceptation ne touche pas aux signalements', async () => {
    db.boat.findUnique.mockResolvedValue(boatRow());
    db.boat.update.mockResolvedValue(boatRow({ is_published: true, status: 'published' }));

    await setBoatPublished(12, true);

    expect(db.boatReport.updateMany).not.toHaveBeenCalled();
  });
});
