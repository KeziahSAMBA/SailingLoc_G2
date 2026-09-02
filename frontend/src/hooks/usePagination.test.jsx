import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import usePagination from './usePagination.js';

const liste = (n) => Array.from({ length: n }, (_, i) => i + 1);

describe('découpage en pages', () => {
  it('rend la première page au montage', () => {
    const { result } = renderHook(() => usePagination(liste(25), 10));
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('compte les pages, dernière incomplète incluse', () => {
    expect(renderHook(() => usePagination(liste(25), 10)).result.current.pageCount).toBe(3);
  });

  it('rend la tranche demandée', () => {
    const { result } = renderHook(() => usePagination(liste(25), 10));
    act(() => result.current.setPage(3));
    expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25]);
  });

  it('annonce une page unique pour une liste vide', () => {
    const { result } = renderHook(() => usePagination([], 10));
    expect(result.current.pageCount).toBe(1);
    expect(result.current.pageItems).toEqual([]);
  });

  it('tient sur une seule page quand la liste est plus courte', () => {
    const { result } = renderHook(() => usePagination(liste(4), 10));
    expect(result.current.pageCount).toBe(1);
    expect(result.current.pageItems).toHaveLength(4);
  });

  it('ne laisse pas de page vide quand le compte tombe juste', () => {
    expect(renderHook(() => usePagination(liste(20), 10)).result.current.pageCount).toBe(2);
  });
});

// Supprimer une réservation depuis la dernière page ferait disparaître cette
// page : sans garde-fou l'écran afficherait une liste vide sans rien expliquer.
describe('page devenue inexistante', () => {
  it('ramène à la dernière page disponible quand la liste raccourcit', () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items, 10, 'stable'), {
      initialProps: { items: liste(25) },
    });

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    rerender({ items: liste(12) });
    expect(result.current.page).toBe(2);
    expect(result.current.pageItems).toEqual([11, 12]);
  });

  it('retombe sur la page 1 quand la liste se vide', () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items, 10, 'stable'), {
      initialProps: { items: liste(25) },
    });

    act(() => result.current.setPage(3));
    rerender({ items: [] });
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toEqual([]);
  });
});

// Changer un filtre en étant page 4 laisserait l'utilisateur devant un résultat
// vide alors que sa recherche a bien abouti.
describe('remise à zéro sur changement de filtre', () => {
  it('revient en page 1 quand la clé change', () => {
    const { result, rerender } = renderHook(({ cle }) => usePagination(liste(50), 10, cle), {
      initialProps: { cle: 'statut=tous' },
    });

    act(() => result.current.setPage(4));
    expect(result.current.page).toBe(4);

    rerender({ cle: 'statut=confirmé' });
    expect(result.current.page).toBe(1);
  });

  it('conserve la page tant que la clé ne bouge pas', () => {
    const { result, rerender } = renderHook(({ cle }) => usePagination(liste(50), 10, cle), {
      initialProps: { cle: 'statut=tous' },
    });

    act(() => result.current.setPage(4));
    rerender({ cle: 'statut=tous' });
    expect(result.current.page).toBe(4);
  });

  it('fonctionne sans clé fournie', () => {
    const { result } = renderHook(() => usePagination(liste(25), 10));
    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);
  });
});
