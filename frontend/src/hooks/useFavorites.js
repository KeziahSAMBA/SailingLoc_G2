import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFavorites, addFavorite, removeFavorite } from '../services/locataireService';
import { useAuth } from './useAuth.jsx';

// Un visiteur non connecté est renvoyé vers la popup de connexion ; seul un
// locataire connecté peut réellement favoriser (la ligne est rattachée à son
// id_user pour apparaître plus tard dans son dashboard "Favoris").
export function useFavorites(enabled = true) {
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!enabled || user?.role !== 'locataire') {
      setFavoriteIds(new Set());
      return;
    }
    getFavorites()
      .then(({ data }) => setFavoriteIds(new Set(data.favorites.map((f) => f.boat.id_boat))))
      .catch(console.error);
  }, [enabled, user]);

  const toggleFavorite = useCallback(
    (idBoat) => {
      if (!enabled) return;
      if (!user) {
        navigate('/login', { state: { backgroundLocation: location } });
        return;
      }
      if (user.role !== 'locataire') return;

      const wasFavorite = favoriteIds.has(idBoat);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(idBoat);
        else next.add(idBoat);
        return next;
      });
      (wasFavorite ? removeFavorite : addFavorite)(idBoat).catch(() => {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(idBoat);
          else next.delete(idBoat);
          return next;
        });
      });
    },
    [enabled, user, navigate, location, favoriteIds]
  );

  return { favoriteIds, toggleFavorite };
}
