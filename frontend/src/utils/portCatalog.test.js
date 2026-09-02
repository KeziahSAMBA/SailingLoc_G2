import { describe, it, expect, vi, afterEach } from 'vitest';
import { CATALOG_URL, parseCatalog, loadPortCatalog } from './portCatalog.js';

const feature = (properties) => ({ properties });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseCatalog — projection', () => {
  it('transpose les clés du GeoJSON vers les nôtres', () => {
    const [port] = parseCatalog([
      feature({
        NomPort: 'Port de Bordeaux',
        LbCommune: 'Bordeaux',
        CdCommune: '33063',
        CoordYPort: 44.84,
        CoordXPort: -0.58,
      }),
    ]);

    expect(port).toEqual({
      name: 'Port de Bordeaux',
      city: 'Bordeaux',
      country: 'France',
      insee: '33063',
      latitude: 44.84,
      longitude: -0.58,
    });
  });

  it('découpe les espaces autour du nom et de la commune', () => {
    const [port] = parseCatalog([feature({ NomPort: '  Sète  ', LbCommune: '  Sète  ' })]);
    expect(port).toMatchObject({ name: 'Sète', city: 'Sète' });
  });

  it('rend une commune vide plutôt qu’absente', () => {
    expect(parseCatalog([feature({ NomPort: 'Sète' })])[0].city).toBe('');
  });

  it('rend un code INSEE nul quand il manque', () => {
    expect(parseCatalog([feature({ NomPort: 'Sète' })])[0].insee).toBeNull();
  });

  // Le catalogue IGN livre parfois des coordonnées en chaîne : les accepter
  // telles quelles produirait des marqueurs invalides sur la carte.
  it('n’accepte que des coordonnées numériques', () => {
    const [port] = parseCatalog([
      feature({ NomPort: 'Sète', CoordYPort: '43.4', CoordXPort: null }),
    ]);

    expect(port.latitude).toBeNull();
    expect(port.longitude).toBeNull();
  });

  it('conserve une coordonnée nulle légitime', () => {
    const [port] = parseCatalog([feature({ NomPort: 'Sète', CoordYPort: 0, CoordXPort: 0 })]);
    expect(port).toMatchObject({ latitude: 0, longitude: 0 });
  });
});

describe('parseCatalog — filtrage', () => {
  it.each([
    ['nom absent', {}],
    ['nom vide', { NomPort: '' }],
    ['nom fait d’espaces', { NomPort: '   ' }],
    ['nom nul', { NomPort: null }],
  ])('écarte un port sans nom exploitable : %s', (_label, props) => {
    expect(parseCatalog([feature(props)])).toEqual([]);
  });

  it('tolère une entrée sans propriétés', () => {
    expect(parseCatalog([{}])).toEqual([]);
  });

  it.each([
    ['liste absente', undefined],
    ['liste nulle', null],
    ['liste vide', []],
  ])('rend une liste vide : %s', (_label, entree) => {
    expect(parseCatalog(entree)).toEqual([]);
  });
});

describe('parseCatalog — déduplication', () => {
  it('ne garde qu’une occurrence par nom', () => {
    const ports = parseCatalog([
      feature({ NomPort: 'Sète', LbCommune: 'Sète' }),
      feature({ NomPort: 'Sète', LbCommune: 'Autre' }),
    ]);

    expect(ports).toHaveLength(1);
    expect(ports[0].city).toBe('Sète');
  });

  // Le catalogue mélange les casses d'une source à l'autre : sans normalisation
  // le même port apparaîtrait deux fois dans le sélecteur.
  it('déduplique sans tenir compte de la casse', () => {
    expect(parseCatalog([feature({ NomPort: 'Sète' }), feature({ NomPort: 'SÈTE' })])).toHaveLength(
      1
    );
  });
});

describe('parseCatalog — tri', () => {
  it('classe par nom', () => {
    const noms = parseCatalog(
      ['Toulon', 'Brest', 'Marseille'].map((n) => feature({ NomPort: n }))
    ).map((p) => p.name);

    expect(noms).toEqual(['Brest', 'Marseille', 'Toulon']);
  });

  // Un tri par code de caractère placerait « Étel » après « Toulon » : le
  // sélecteur deviendrait incompréhensible pour un utilisateur francophone.
  it('classe les accents à leur place en français', () => {
    const noms = parseCatalog(['Étel', 'Fécamp', 'Dieppe'].map((n) => feature({ NomPort: n }))).map(
      (p) => p.name
    );

    expect(noms).toEqual(['Dieppe', 'Étel', 'Fécamp']);
  });
});

describe('loadPortCatalog', () => {
  it('charge le catalogue statique et le projette', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ features: [feature({ NomPort: 'Brest' })] }),
        })
      )
    );

    await expect(loadPortCatalog()).resolves.toEqual([
      expect.objectContaining({ name: 'Brest', country: 'France' }),
    ]);
    expect(fetch).toHaveBeenCalledWith(CATALOG_URL);
  });

  it('signale un catalogue introuvable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 404 }))
    );

    await expect(loadPortCatalog()).rejects.toThrow(
      'Impossible de charger le catalogue des ports.'
    );
  });

  it('tolère un catalogue sans entrées', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
    );

    await expect(loadPortCatalog()).resolves.toEqual([]);
  });
});
