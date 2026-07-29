export const SORT_KEYS = ['recent', 'oldest', 'best', 'critical'];
export const RATING_KEYS = ['all', '5', '4', '3', '2', '1'];

// Tri d'une liste d'avis (copie, sans muter l'original).
export function sortReviews(list, sort) {
  const a = [...list];
  switch (sort) {
    case 'oldest':
      return a.sort((x, y) => new Date(x.created_at) - new Date(y.created_at));
    case 'best':
      return a.sort((x, y) => y.rating - x.rating);
    case 'critical':
      return a.sort((x, y) => x.rating - y.rating);
    case 'recent':
    default:
      return a.sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
  }
}

// Applique le filtre par note ('all' ou une valeur 1..5) puis le tri.
export function filterAndSortReviews(list, { sort = 'recent', rating = 'all' } = {}) {
  const filtered = rating === 'all' ? list : list.filter((r) => r.rating === Number(rating));
  return sortReviews(filtered, sort);
}
