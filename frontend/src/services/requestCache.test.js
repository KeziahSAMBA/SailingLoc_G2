import { describe, it, expect, vi, afterEach } from 'vitest';
import { cachedRequest, invalidateCachedRequest } from './requestCache.js';

const TTL_MS = 60000;

// Le cache est un état de module partagé entre tous les tests : sans purge
// explicite, une clé posée par un test ferait passer le suivant sans qu'il
// n'exerce rien.
let compteur = 0;
const cle = () => `test-${(compteur += 1)}`;

afterEach(() => {
  vi.useRealTimers();
});

describe('mise en cache', () => {
  it('n’appelle la requête qu’une fois pour deux demandes', async () => {
    const k = cle();
    const requete = vi.fn(() => Promise.resolve('valeur'));

    await cachedRequest(k, requete);
    await cachedRequest(k, requete);

    expect(requete).toHaveBeenCalledTimes(1);
  });

  it('rend la même valeur aux deux appelants', async () => {
    const k = cle();
    const requete = vi.fn(() => Promise.resolve({ bateaux: 3 }));

    expect(await cachedRequest(k, requete)).toBe(await cachedRequest(k, requete));
  });

  it('sépare les clés distinctes', async () => {
    const requete = vi.fn(() => Promise.resolve('x'));

    await cachedRequest(cle(), requete);
    await cachedRequest(cle(), requete);

    expect(requete).toHaveBeenCalledTimes(2);
  });

  // C'est la raison d'être du cache : SearchBar, Carrousel et la page catégorie
  // se montent ensemble et demandaient chacun le catalogue. Le second appelant
  // doit récupérer la promesse en vol, pas en lancer une seconde.
  it('mutualise une requête encore en cours', async () => {
    const k = cle();
    let resoudre;
    const requete = vi.fn(() => new Promise((r) => (resoudre = r)));

    const a = cachedRequest(k, requete);
    const b = cachedRequest(k, requete);
    resoudre('catalogue');

    expect(requete).toHaveBeenCalledTimes(1);
    expect(await a).toBe('catalogue');
    expect(await b).toBe('catalogue');
  });
});

describe('durée de vie', () => {
  it('sert le cache avant expiration', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-02T10:00:00Z'));
    const k = cle();
    const requete = vi.fn(() => Promise.resolve('x'));

    await cachedRequest(k, requete);
    vi.advanceTimersByTime(TTL_MS - 1000);
    await cachedRequest(k, requete);

    expect(requete).toHaveBeenCalledTimes(1);
  });

  it('redemande passé la minute', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-02T10:00:00Z'));
    const k = cle();
    const requete = vi.fn(() => Promise.resolve('x'));

    await cachedRequest(k, requete);
    vi.advanceTimersByTime(TTL_MS + 1);
    await cachedRequest(k, requete);

    expect(requete).toHaveBeenCalledTimes(2);
  });

  it('redemande à l’instant exact de l’échéance', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-02T10:00:00Z'));
    const k = cle();
    const requete = vi.fn(() => Promise.resolve('x'));

    await cachedRequest(k, requete);
    vi.advanceTimersByTime(TTL_MS);
    await cachedRequest(k, requete);

    expect(requete).toHaveBeenCalledTimes(2);
  });
});

// Un échec réseau conservé en cache rendrait l'écran définitivement cassé
// pendant une minute, sans possibilité de réessayer.
describe('échecs', () => {
  it('propage l’erreur à l’appelant', async () => {
    const requete = vi.fn(() => Promise.reject(new Error('réseau indisponible')));

    await expect(cachedRequest(cle(), requete)).rejects.toThrow('réseau indisponible');
  });

  it('n’empoisonne pas le cache : la demande suivante réessaie', async () => {
    const k = cle();
    const requete = vi
      .fn()
      .mockRejectedValueOnce(new Error('réseau indisponible'))
      .mockResolvedValueOnce('catalogue');

    await expect(cachedRequest(k, requete)).rejects.toThrow();
    expect(await cachedRequest(k, requete)).toBe('catalogue');
    expect(requete).toHaveBeenCalledTimes(2);
  });
});

describe('invalidation explicite', () => {
  // Après publication d'une annonce, le catalogue en cache est périmé : la
  // prochaine lecture doit repartir au serveur.
  it('force une nouvelle requête', async () => {
    const k = cle();
    const requete = vi.fn(() => Promise.resolve('x'));

    await cachedRequest(k, requete);
    invalidateCachedRequest(k);
    await cachedRequest(k, requete);

    expect(requete).toHaveBeenCalledTimes(2);
  });

  it('ne touche pas aux autres clés', async () => {
    const a = cle();
    const b = cle();
    const requete = vi.fn(() => Promise.resolve('x'));

    await cachedRequest(a, requete);
    await cachedRequest(b, requete);
    invalidateCachedRequest(a);
    await cachedRequest(b, requete);

    expect(requete).toHaveBeenCalledTimes(2);
  });

  it('ne se plaint pas d’une clé inconnue', () => {
    expect(() => invalidateCachedRequest('jamais-posée')).not.toThrow();
  });
});
