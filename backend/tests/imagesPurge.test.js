import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockReaddir = jest.fn();
const mockStat = jest.fn();
const mockUnlink = jest.fn();
const mockFindMany = jest.fn();

jest.unstable_mockModule('fs', () => ({
  default: { promises: { readdir: mockReaddir, stat: mockStat, unlink: mockUnlink } },
  promises: { readdir: mockReaddir, stat: mockStat, unlink: mockUnlink },
}));

jest.unstable_mockModule('../src/config/db.js', () => ({
  default: { image: { findMany: mockFindMany } },
}));

const { default: imagesPurge, findOrphanFiles } =
  await import('../src/jobs/handlers/imagesPurge.js');

const NOW = new Date('2026-08-04T05:00:00.000Z');
const HOUR_MS = 3600000;
const vieux = { isFile: () => true, mtimeMs: NOW.getTime() - 100 * HOUR_MS };
const recent = { isFile: () => true, mtimeMs: NOW.getTime() - 1 * HOUR_MS };

// Seul « boats » contient des fichiers, sauf indication contraire.
const onlyBoats = (files) => (dir) =>
  dir.endsWith('boats') ? Promise.resolve(files) : Promise.reject(new Error('ENOENT'));

beforeEach(() => {
  jest.clearAllMocks();
  mockFindMany.mockResolvedValue([]);
  mockReaddir.mockImplementation(onlyBoats([]));
  mockStat.mockResolvedValue(vieux);
  mockUnlink.mockResolvedValue(undefined);
});

describe('images.purge — ciblage', () => {
  it('ne retient que les fichiers sans aucune ligne Image', async () => {
    mockFindMany.mockResolvedValue([{ url: 'http://x/uploads/boats/garde.png' }]);
    mockReaddir.mockImplementation(onlyBoats(['garde.png', 'orphelin.png']));

    expect(await findOrphanFiles({}, NOW)).toEqual(['uploads/boats/orphelin.png']);
  });

  it('épargne un fichier référencé même très ancien', async () => {
    // L'ancienneté ne fait entrer personne : une image de 2019 toujours
    // utilisée reste dans la liste blanche.
    mockFindMany.mockResolvedValue([{ url: 'http://x/uploads/boats/veterane.png' }]);
    mockReaddir.mockImplementation(onlyBoats(['veterane.png']));
    mockStat.mockResolvedValue({ isFile: () => true, mtimeMs: 0 });

    expect(await findOrphanFiles({}, NOW)).toEqual([]);
  });

  it('épargne un orphelin trop récent, le temps que sa ligne soit écrite', async () => {
    mockReaddir.mockImplementation(onlyBoats(['televerse-a-l-instant.png']));
    mockStat.mockResolvedValue(recent);

    expect(await findOrphanFiles({}, NOW)).toEqual([]);
  });

  it('ne balaie jamais le dossier des documents', async () => {
    // Ces fichiers vivent dans Document.file_url : les comparer aux lignes
    // Image supprimerait toutes les pièces d'identité.
    mockReaddir.mockResolvedValue(['piece.pdf']);

    const orphans = await findOrphanFiles({}, NOW);

    expect(orphans.some((file) => file.includes('documents'))).toBe(false);
    for (const call of mockReaddir.mock.calls) {
      expect(call[0]).not.toContain('documents');
    }
  });

  it('balaie les trois dossiers d’images', async () => {
    mockReaddir.mockResolvedValue([]);

    await findOrphanFiles({}, NOW);

    expect(mockReaddir.mock.calls.map((call) => call[0])).toEqual([
      'uploads/boats',
      'uploads/disputes',
      'uploads/avatars',
    ]);
  });

  it('ignore un dossier absent sans échouer', async () => {
    mockReaddir.mockRejectedValue(new Error('ENOENT'));

    await expect(findOrphanFiles({}, NOW)).resolves.toEqual([]);
  });

  it('retombe sur 24 h si le seuil est absent ou aberrant', async () => {
    mockReaddir.mockImplementation(onlyBoats(['orphelin.png']));
    mockStat.mockResolvedValue({ isFile: () => true, mtimeMs: NOW.getTime() - 25 * HOUR_MS });

    expect(await findOrphanFiles({}, NOW)).toHaveLength(1);
    expect(await findOrphanFiles({ minAgeHours: 0 }, NOW)).toHaveLength(1);

    mockStat.mockResolvedValue({ isFile: () => true, mtimeMs: NOW.getTime() - 23 * HOUR_MS });
    expect(await findOrphanFiles({}, NOW)).toHaveLength(0);
  });
});

describe('images.purge — exécution', () => {
  it('compte sans rien supprimer', async () => {
    mockReaddir.mockImplementation(onlyBoats(['a.png', 'b.png']));

    expect(await imagesPurge.count({ params: {}, now: NOW })).toBe(2);
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it('supprime les orphelins et rend le détail', async () => {
    mockReaddir.mockImplementation(onlyBoats(['a.png', 'b.png']));

    const outcome = await imagesPurge.run({ params: {}, now: NOW });

    expect(mockUnlink).toHaveBeenCalledTimes(2);
    expect(outcome).toEqual({ affected: 2, detail: { files: 2 } });
  });

  it('n’en compte pas un qui résiste à la suppression', async () => {
    mockReaddir.mockImplementation(onlyBoats(['a.png', 'b.png']));
    mockUnlink.mockRejectedValueOnce(new Error('EACCES'));

    expect((await imagesPurge.run({ params: {}, now: NOW })).affected).toBe(1);
  });

  it('arrive désactivée et en simulation', () => {
    expect(imagesPurge.defaultEnabled).toBe(false);
    expect(imagesPurge.defaultDryRun).toBe(true);
    expect(imagesPurge.defaultParams).toEqual({ minAgeHours: 24 });
  });
});
