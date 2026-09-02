import { describe, it, expect, vi } from 'vitest';
import {
  PUBLIC_PAGE_SIZE,
  MAX_PUBLIC_ITEMS,
  MAX_PUBLIC_PAGES,
  fetchBoundedPublicPages,
} from './publicPagination.js';

const bateau = (id) => ({ id_boat: id });

// Sert des pages découpées dans une liste, comme le ferait l'API.
const serveur = (items, { pageSize = PUBLIC_PAGE_SIZE, extra = {} } = {}) =>
  vi.fn(({ page, pageSize: taille }) => {
    const n = taille ?? pageSize;
    return Promise.resolve({
      ...extra,
      data: items.slice((page - 1) * n, page * n),
    });
  });

describe('constantes', () => {
  it('page de 25 et plafond de 500', () => {
    expect(PUBLIC_PAGE_SIZE).toBe(25);
    expect(MAX_PUBLIC_ITEMS).toBe(500);
  });

  it('déduit le nombre de pages du plafond', () => {
    expect(MAX_PUBLIC_PAGES).toBe(20);
  });
});

describe('agrégation des pages', () => {
  it('rassemble plusieurs pages dans l’ordre reçu', async () => {
    const items = Array.from({ length: 60 }, (_, i) => bateau(i + 1));
    const { data } = await fetchBoundedPublicPages(serveur(items));

    expect(data).toHaveLength(60);
    expect(data.map((b) => b.id_boat)).toEqual(items.map((b) => b.id_boat));
  });

  it('s’arrête sur une page incomplète', async () => {
    const requete = serveur(Array.from({ length: 30 }, (_, i) => bateau(i + 1)));
    await fetchBoundedPublicPages(requete);

    // Deux pages suffisent : la seconde, plus courte, marque la fin.
    expect(requete).toHaveBeenCalledTimes(2);
  });

  it('n’appelle qu’une fois pour une première page déjà incomplète', async () => {
    const requete = serveur([bateau(1), bateau(2)]);
    await fetchBoundedPublicPages(requete);

    expect(requete).toHaveBeenCalledTimes(1);
  });

  it('gère une collection vide', async () => {
    const { data } = await fetchBoundedPublicPages(serveur([]));
    expect(data).toEqual([]);
  });

  it('transmet le numéro et la taille de page', async () => {
    const requete = serveur([bateau(1)]);
    await fetchBoundedPublicPages(requete, { pageSize: 10 });

    expect(requete).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
  });

  // L'appelant historique recevait une réponse axios : conserver l'enveloppe
  // évite d'avoir à réécrire les consommateurs.
  it('conserve l’enveloppe de la première réponse', async () => {
    const requete = serveur([bateau(1)], {
      extra: { status: 200, headers: { a: 'b' } },
    });
    const reponse = await fetchBoundedPublicPages(requete);

    expect(reponse).toMatchObject({ status: 200, headers: { a: 'b' } });
  });
});

describe('bornes', () => {
  it('ne dépasse pas le plafond d’éléments', async () => {
    const items = Array.from({ length: 900 }, (_, i) => bateau(i + 1));
    const { data } = await fetchBoundedPublicPages(items && serveur(items));

    expect(data).toHaveLength(MAX_PUBLIC_ITEMS);
  });

  it('respecte un plafond réduit fourni par l’appelant', async () => {
    const items = Array.from({ length: 200 }, (_, i) => bateau(i + 1));
    const { data } = await fetchBoundedPublicPages(serveur(items), {
      maxItems: 30,
    });

    expect(data).toHaveLength(30);
  });

  // Un serveur qui ignorerait la pagination renverrait indéfiniment la même
  // page pleine : la boucle doit s'arrêter d'elle-même.
  it('n’appelle jamais plus de pages que le plafond n’en autorise', async () => {
    const requete = vi.fn(({ page }) =>
      Promise.resolve({
        data: Array.from({ length: 25 }, (_, i) => bateau(page * 100 + i)),
      })
    );

    await fetchBoundedPublicPages(requete);

    expect(requete.mock.calls.length).toBeLessThanOrEqual(MAX_PUBLIC_PAGES);
  });
});

// Trois protections distinctes contre une API défaillante, chacune capable de
// provoquer une boucle sans fin si elle manquait.
describe('protections contre un serveur incohérent', () => {
  it('s’arrête quand la même page revient à l’identique', async () => {
    const page = Array.from({ length: 25 }, (_, i) => bateau(i + 1));
    const requete = vi.fn(() => Promise.resolve({ data: page }));

    const { data } = await fetchBoundedPublicPages(requete);

    expect(requete).toHaveBeenCalledTimes(2);
    expect(data).toHaveLength(25);
  });

  it('ne conserve pas deux fois le même identifiant', async () => {
    const requete = vi.fn(({ page }) =>
      Promise.resolve({
        data:
          page === 1
            ? Array.from({ length: 25 }, (_, i) => bateau(i + 1))
            : [bateau(25), bateau(26)],
      })
    );

    const { data } = await fetchBoundedPublicPages(requete);

    expect(data.map((b) => b.id_boat)).toHaveLength(26);
    expect(new Set(data.map((b) => b.id_boat)).size).toBe(26);
  });

  it('s’arrête si une page pleine n’apporte que des doublons', async () => {
    const premiere = Array.from({ length: 25 }, (_, i) => bateau(i + 1));
    const requete = vi.fn(({ page }) =>
      Promise.resolve({
        data: page === 1 ? premiere : [...premiere].reverse(),
      })
    );

    const { data } = await fetchBoundedPublicPages(requete);

    expect(requete).toHaveBeenCalledTimes(2);
    expect(data).toHaveLength(25);
  });

  it('refuse une réponse sans tableau', async () => {
    await expect(
      fetchBoundedPublicPages(() => Promise.resolve({ data: { bateaux: [] } }))
    ).rejects.toThrow(TypeError);
  });

  it('refuse une réponse absente', async () => {
    await expect(fetchBoundedPublicPages(() => Promise.resolve(null))).rejects.toThrow(TypeError);
  });
});

describe('identification des éléments', () => {
  it('reconnaît d’office un bateau, un avis ou un id générique', async () => {
    const requete = vi.fn(() =>
      Promise.resolve({ data: [{ id_boat: 1 }, { id_review: 2 }, { id: 3 }] })
    );

    const { data } = await fetchBoundedPublicPages(requete);
    expect(data).toHaveLength(3);
  });

  it('accepte un extracteur d’identifiant sur mesure', async () => {
    const requete = vi.fn(({ page }) =>
      Promise.resolve({ data: page === 1 ? [{ ref: 'a' }, { ref: 'b' }] : [] })
    );

    const { data } = await fetchBoundedPublicPages(requete, {
      getItemId: (item) => item.ref,
    });

    expect(data).toHaveLength(2);
  });

  // Sans identifiant exploitable, dédupliquer serait deviner : on conserve
  // alors tout, quitte à garder des lignes semblables.
  it('conserve les éléments dépourvus d’identifiant', async () => {
    const requete = vi.fn(({ page }) =>
      Promise.resolve({ data: page === 1 ? [{ nom: 'x' }, { nom: 'x' }] : [] })
    );

    const { data } = await fetchBoundedPublicPages(requete);
    expect(data).toHaveLength(2);
  });
});

describe('paramètres invalides', () => {
  it.each([
    ['requête absente', undefined, {}],
    ['requête non appelable', 'ceci n’est pas une fonction', {}],
    ['taille de page nulle', () => {}, { pageSize: 0 }],
    ['taille de page décimale', () => {}, { pageSize: 2.5 }],
    ['plafond nul', () => {}, { maxItems: 0 }],
    ['extracteur non appelable', () => {}, { getItemId: 'nope' }],
  ])('refuse : %s', async (_label, requete, options) => {
    // La fonction est asynchrone : elle rejette, elle ne lève pas.
    await expect(fetchBoundedPublicPages(requete, options)).rejects.toThrow(TypeError);
  });
});
