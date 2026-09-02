import { describe, it, expect } from 'vitest';
import { SORT_KEYS, RATING_KEYS, sortReviews, filterAndSortReviews } from './reviewSort.js';

const avis = (id, rating, created_at) => ({ id, rating, created_at });

// Notes et dates volontairement décorrélées : avec un jeu où les notes
// décroissent dans l'ordre des dates, « best » et « oldest » rendent la même
// liste et le test ne distinguerait plus les deux tris.
const liste = [
  avis(1, 3, '2026-03-01'),
  avis(2, 5, '2026-01-01'),
  avis(3, 1, '2026-06-01'),
  avis(4, 5, '2026-04-01'),
];

const ids = (list) => list.map((r) => r.id);

describe('sortReviews', () => {
  it('classe du plus récent au plus ancien par défaut', () => {
    expect(ids(sortReviews(liste, 'recent'))).toEqual([3, 4, 1, 2]);
  });

  it('retombe sur le tri récent pour une clé inconnue', () => {
    expect(ids(sortReviews(liste, 'n’importe quoi'))).toEqual(ids(sortReviews(liste, 'recent')));
  });

  it('classe du plus ancien au plus récent', () => {
    expect(ids(sortReviews(liste, 'oldest'))).toEqual([2, 1, 4, 3]);
  });

  it('classe par meilleure note', () => {
    expect(sortReviews(liste, 'best').map((r) => r.rating)).toEqual([5, 5, 3, 1]);
  });

  it('classe par note la plus sévère', () => {
    expect(sortReviews(liste, 'critical').map((r) => r.rating)).toEqual([1, 3, 5, 5]);
  });

  // La fonction est documentée comme travaillant sur une copie : trier une liste
  // affichée ne doit pas réordonner la source sous les autres composants.
  it('ne modifie pas la liste reçue', () => {
    const source = [...liste];
    sortReviews(source, 'best');
    expect(ids(source)).toEqual([1, 2, 3, 4]);
  });

  it('accepte une liste vide', () => {
    expect(sortReviews([], 'best')).toEqual([]);
  });
});

describe('filterAndSortReviews', () => {
  it('ne filtre rien avec « all »', () => {
    expect(filterAndSortReviews(liste, { rating: 'all' })).toHaveLength(4);
  });

  it('trie par défaut du plus récent sans option', () => {
    expect(ids(filterAndSortReviews(liste))).toEqual([3, 4, 1, 2]);
  });

  // Les valeurs viennent d'un <select> : elles arrivent en chaîne, jamais en
  // nombre. Une comparaison stricte sans conversion ne renverrait jamais rien.
  it('convertit la note reçue en chaîne', () => {
    expect(ids(filterAndSortReviews(liste, { rating: '5' }))).toEqual([4, 2]);
  });

  it('combine filtre et tri', () => {
    expect(ids(filterAndSortReviews(liste, { rating: '5', sort: 'oldest' }))).toEqual([2, 4]);
  });

  it('rend une liste vide quand aucune note ne correspond', () => {
    expect(filterAndSortReviews(liste, { rating: '2' })).toEqual([]);
  });
});

describe('clés exposées', () => {
  it('expose les tris proposés à l’interface', () => {
    expect(SORT_KEYS).toEqual(['recent', 'oldest', 'best', 'critical']);
  });

  it('expose les filtres de note, « all » en tête', () => {
    expect(RATING_KEYS).toEqual(['all', '5', '4', '3', '2', '1']);
  });

  // Chaque clé de tri annoncée doit être réellement traitée, sinon l'écran
  // proposerait une option qui retombe silencieusement sur « recent ».
  it('traite effectivement chaque tri annoncé', () => {
    const parCle = SORT_KEYS.map((cle) => ids(sortReviews(liste, cle)).join());
    expect(new Set(parCle).size).toBe(SORT_KEYS.length);
  });
});
