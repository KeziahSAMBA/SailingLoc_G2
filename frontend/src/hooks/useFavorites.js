import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFavorites, addFavorite, removeFavorite } from '../services/locataireService';
import { useAuth } from './useAuth.jsx';

// Un visiteur non connecté est renvoyé vers la popup de connexion ; seul un
// locataire connecté peut réellement favoriser (la ligne est rattachée à son
// id_user pour apparaître plus tard dans son dashboard "Favoris").
export function useFavorites(enabled = true) {
  // Source de vérité : les ids dans l'ordre d'ajout, le plus récent en tête
  // (l'API renvoie déjà `created_at desc`, un ajout optimiste passe devant).
  // `favoriteIds` (Set) en est dérivé pour les tests d'appartenance O(1).
  const [favoriteOrder, setFavoriteOrder] = useState(() => []);
  const favoriteIds = useMemo(() => new Set(favoriteOrder), [favoriteOrder]);
  // Vrai tant que la liste initiale n'est pas connue : évite d'afficher un
  // état « aucun favori » le temps de la requête pour un locataire qui en a.
  // Reste vrai pendant la vérification de session (authLoading) pour ne pas
  // conclure « pas de favoris » avant même de savoir qui est connecté.
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading) return;
    if (!enabled || user?.role !== 'locataire') {
      setFavoriteOrder([]);
      setFavoritesLoading(false);
      return;
    }
    setFavoritesLoading(true);
    getFavorites()
      .then(({ data }) => setFavoriteOrder(data.favorites.map((f) => f.boat.id_boat)))
      .catch(console.error)
      .finally(() => setFavoritesLoading(false));
  }, [enabled, user, authLoading]);

  const toggleFavorite = useCallback(
    (idBoat) => {
      if (!enabled) return;
      if (!user) {
        navigate('/login', { state: { backgroundLocation: location } });
        return;
      }
      if (user.role !== 'locataire') return;

      const wasFavorite = favoriteIds.has(idBoat);
      setFavoriteOrder((prev) =>
        wasFavorite ? prev.filter((id) => id !== idBoat) : [idBoat, ...prev]
      );
      (wasFavorite ? removeFavorite : addFavorite)(idBoat).catch(() => {
        setFavoriteOrder((prev) =>
          wasFavorite
            ? [idBoat, ...prev.filter((id) => id !== idBoat)]
            : prev.filter((id) => id !== idBoat)
        );
      });
    },
    [enabled, user, navigate, location, favoriteIds]
  );

  return { favoriteIds, favoriteOrder, toggleFavorite, favoritesLoading };
}
