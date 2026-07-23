import { useEffect, useMemo, useState } from 'react';

/**
 * Découpe une liste déjà filtrée en pages.
 * `resetKey` : chaîne décrivant les filtres actifs — un changement ramène en page 1.
 */
function usePagination(items, pageSize, resetKey = '') {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  // Filtrer ou supprimer une ligne peut rendre la page courante inexistante.
  const safePage = Math.min(page, pageCount);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  return { page: safePage, setPage, pageItems, pageCount };
}

export default usePagination;
