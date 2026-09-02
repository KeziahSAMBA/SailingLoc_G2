import { describe, it, expect } from '@jest/globals';
import { MAX_LIST_ITEMS, invalidInput, parsePagination } from '../src/utils/inputSecurity.js';

describe('invalidInput', () => {
  it('produit une erreur portant son statut HTTP', () => {
    const err = invalidInput('Pagination invalide.');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Pagination invalide.');
    expect(err.status).toBe(400);
  });

  it('accepte un statut explicite', () => {
    expect(invalidInput('Trop long.', 413).status).toBe(413);
  });
});

describe('parsePagination — valeurs par défaut', () => {
  it('renvoie la première page sans paramètre', () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: 25, skip: 0, take: 25 });
  });

  it('se comporte de même sans argument du tout', () => {
    expect(parsePagination()).toEqual({ page: 1, pageSize: 25, skip: 0, take: 25 });
  });

  it('respecte la taille de page proposée par l’appelant', () => {
    expect(parsePagination({}, 10)).toMatchObject({ pageSize: 10, take: 10 });
  });

  // Une chaîne vide arrive dès qu'un « ?page= » traîne dans l'URL : la traiter
  // comme une absence évite de renvoyer un 400 pour un lien mal recopié.
  it('traite une chaîne vide comme une absence de paramètre', () => {
    expect(parsePagination({ page: '', pageSize: '' })).toMatchObject({ page: 1, pageSize: 25 });
  });
});

describe('parsePagination — calcul du décalage', () => {
  it('décale d’une page entière', () => {
    expect(parsePagination({ page: 3, pageSize: 20 })).toEqual({
      page: 3,
      pageSize: 20,
      skip: 40,
      take: 20,
    });
  });

  it('accepte les valeurs transmises sous forme de chaînes', () => {
    expect(parsePagination({ page: '2', pageSize: '15' })).toMatchObject({ skip: 15, take: 15 });
  });

  it('tolère les espaces autour des nombres', () => {
    expect(parsePagination({ page: ' 2 ' })).toMatchObject({ page: 2 });
  });
});

describe('parsePagination — bornes', () => {
  it('plafonne la taille de page demandée', () => {
    expect(parsePagination({ pageSize: 10000 })).toMatchObject({
      pageSize: MAX_LIST_ITEMS,
      take: MAX_LIST_ITEMS,
    });
  });

  it('refuse une page nulle ou négative', () => {
    expect(() => parsePagination({ page: 0 })).toThrow('Pagination invalide.');
    expect(() => parsePagination({ page: -1 })).toThrow('Pagination invalide.');
  });

  it('refuse ce qui n’est pas un entier décimal', () => {
    for (const page of ['abc', '1.5', '1e3', '0x10', '١٢']) {
      expect(() => parsePagination({ page })).toThrow('Pagination invalide.');
    }
  });

  it('refuse les types inattendus', () => {
    for (const page of [{}, [], true, () => {}]) {
      expect(() => parsePagination({ page })).toThrow('Pagination invalide.');
    }
  });

  it('refuse une taille de page invalide', () => {
    expect(() => parsePagination({ pageSize: 'beaucoup' })).toThrow('Pagination invalide.');
  });

  // Une page assez lointaine ferait déborder le calcul du décalage : mieux vaut
  // un 400 franc qu'un skip incohérent transmis à la base.
  it('refuse un décalage qui sortirait des entiers sûrs', () => {
    expect(() => parsePagination({ page: String(Number.MAX_SAFE_INTEGER) })).toThrow(
      'Pagination invalide.'
    );
  });

  it('lève une erreur portant le statut 400', () => {
    expect.assertions(1);
    try {
      parsePagination({ page: 'abc' });
    } catch (err) {
      expect(err.status).toBe(400);
    }
  });
});
