import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  port: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));
jest.unstable_mockModule('../src/utils/frenchRegions.js', () => ({
  departmentFromInsee: jest.fn(() => '13'),
  regionFromInsee: jest.fn(() => 'Provence-Alpes-Côte d’Azur'),
}));

const { createPort, listPorts } = await import('../src/services/portAdminService.js');

const PHOTO_URL =
  'https://images.unsplash.com/photo-1496309838698-63bfac391248?auto=format&fit=crop&w=800&q=80';

beforeEach(() => {
  jest.clearAllMocks();
  db.port.findMany.mockResolvedValue([]);
  db.port.findUnique.mockResolvedValue(null);
  db.port.create.mockImplementation(({ data }) =>
    Promise.resolve({ id_port: 9, ...data, _count: { boats: 0 } })
  );
  db.port.update.mockImplementation(({ data }) =>
    Promise.resolve({ id_port: 9, ...data, _count: { boats: 0 } })
  );
});

describe('photos publiques des ports', () => {
  it('persiste et restitue une URL de photo valide', async () => {
    const created = await createPort({
      name: 'Port test',
      city: 'Marseille',
      image_url: `  ${PHOTO_URL}  `,
    });

    expect(db.port.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ image_url: PHOTO_URL }),
      })
    );
    expect(created).toEqual(expect.objectContaining({ image_url: PHOTO_URL }));
  });

  it('normalise une photo absente ou vide en null', async () => {
    await createPort({ name: 'Port sans photo', city: 'Brest' });
    expect(db.port.create.mock.calls[0][0].data.image_url).toBeNull();

    await createPort({ name: 'Port photo vide', city: 'Brest', image_url: '   ' });
    expect(db.port.create.mock.calls[1][0].data.image_url).toBeNull();
  });

  it('rejette les schémas actifs, les fragments et les URL locales déployées', async () => {
    await expect(
      createPort({ name: 'Port invalide', city: 'Brest', image_url: 'javascript:alert(1)' })
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('URL') });
    await expect(
      createPort({ name: 'Port fragment', city: 'Brest', image_url: `${PHOTO_URL}#part` })
    ).rejects.toMatchObject({ message: expect.stringContaining('URL') });
  });

  it('conserve l’ancienne photo lors de la réactivation sans champ image_url', async () => {
    db.port.findUnique.mockResolvedValue({
      id_port: 4,
      name: 'Port archivé',
      image_url: PHOTO_URL,
      deleted_at: new Date('2026-01-01T00:00:00.000Z'),
    });

    await createPort({ name: 'Port archivé', city: 'Brest' });

    expect(db.port.update.mock.calls[0][0].data.image_url).toBe(PHOTO_URL);
    expect(db.port.update.mock.calls[0][0].data.deleted_at).toBeNull();
  });

  it('permet de supprimer explicitement l’ancienne photo à la réactivation', async () => {
    db.port.findUnique.mockResolvedValue({
      id_port: 4,
      name: 'Port archivé',
      image_url: PHOTO_URL,
      deleted_at: new Date('2026-01-01T00:00:00.000Z'),
    });

    await createPort({ name: 'Port archivé', city: 'Brest', image_url: '' });

    expect(db.port.update.mock.calls[0][0].data.image_url).toBeNull();
  });

  it('inclut la photo dans la projection de liste sans exposer de valeur vide', async () => {
    db.port.findMany.mockResolvedValue([
      {
        id_port: 2,
        name: 'Port photo',
        city: 'Nice',
        country: 'France',
        image_url: PHOTO_URL,
        _count: { boats: 1 },
      },
      {
        id_port: 3,
        name: 'Port sans photo',
        city: 'Brest',
        country: 'France',
        image_url: null,
        _count: { boats: 0 },
      },
    ]);

    const ports = await listPorts();

    expect(ports).toEqual([
      expect.objectContaining({ id_port: 2, image_url: PHOTO_URL }),
      expect.objectContaining({ id_port: 3, image_url: null }),
    ]);
  });
});
