import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const service = {
  getFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
};
vi.mock('../services/locataireService', () => service);

const navigate = vi.fn();
const location = { pathname: '/bateaux' };
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useLocation: () => location,
}));

let utilisateur = { id_user: 7, role: 'locataire' };
vi.mock('./useAuth.jsx', () => ({ useAuth: () => ({ user: utilisateur }) }));

const { useFavorites } = await import('./useFavorites.js');

const favoris = (...ids) => ({ data: { favorites: ids.map((id) => ({ boat: { id_boat: id } })) } });

const monter = (enabled) => renderHook(() => useFavorites(enabled));

beforeEach(() => {
  vi.clearAllMocks();
  utilisateur = { id_user: 7, role: 'locataire' };
  service.getFavorites.mockResolvedValue(favoris());
  service.addFavorite.mockResolvedValue({});
  service.removeFavorite.mockResolvedValue({});
});

describe('chargement initial', () => {
  it('récupère les favoris du locataire', async () => {
    service.getFavorites.mockResolvedValue(favoris(1, 4));
    const { result } = monter();

    await waitFor(() => expect(result.current.favoriteIds.size).toBe(2));
    expect([...result.current.favoriteIds]).toEqual([1, 4]);
  });

  it('part d’une liste vide', () => {
    service.getFavorites.mockReturnValue(new Promise(() => {}));
    expect(monter().result.current.favoriteIds.size).toBe(0);
  });

  it('n’interroge pas le serveur pour un visiteur', async () => {
    utilisateur = null;
    monter();

    await waitFor(() => expect(service.getFavorites).not.toHaveBeenCalled());
  });

  // Un propriétaire ou un administrateur n'a pas de favoris : la ligne est
  // rattachée à un compte locataire.
  it.each(['proprietaire', 'admin'])('n’interroge pas le serveur pour un %s', async (role) => {
    utilisateur = { id_user: 7, role };
    monter();

    await waitFor(() => expect(service.getFavorites).not.toHaveBeenCalled());
  });

  it('ne charge rien quand le suivi est désactivé', async () => {
    monter(false);
    await waitFor(() => expect(service.getFavorites).not.toHaveBeenCalled());
  });

  it('survit à un échec de chargement', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    service.getFavorites.mockRejectedValue(new Error('réseau'));
    const { result } = monter();

    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(result.current.favoriteIds.size).toBe(0);
  });
});

describe('ajout et retrait', () => {
  it('ajoute un bateau', async () => {
    const { result } = monter();
    await waitFor(() => expect(service.getFavorites).toHaveBeenCalled());

    act(() => result.current.toggleFavorite(3));

    expect(result.current.favoriteIds.has(3)).toBe(true);
    expect(service.addFavorite).toHaveBeenCalledWith(3);
  });

  it('retire un bateau déjà favori', async () => {
    service.getFavorites.mockResolvedValue(favoris(3));
    const { result } = monter();
    await waitFor(() => expect(result.current.favoriteIds.has(3)).toBe(true));

    act(() => result.current.toggleFavorite(3));

    expect(result.current.favoriteIds.has(3)).toBe(false);
    expect(service.removeFavorite).toHaveBeenCalledWith(3);
  });

  // L'affichage bascule immédiatement, sans attendre le serveur : le cœur ne
  // doit pas rester inerte le temps d'un aller-retour réseau.
  it('bascule l’affichage avant la réponse du serveur', async () => {
    let resoudre;
    service.addFavorite.mockReturnValue(new Promise((r) => (resoudre = r)));
    const { result } = monter();
    await waitFor(() => expect(service.getFavorites).toHaveBeenCalled());

    act(() => result.current.toggleFavorite(3));
    expect(result.current.favoriteIds.has(3)).toBe(true);

    await act(async () => resoudre({}));
  });

  // Si l'appel échoue, l'affichage doit revenir en arrière, sinon le cœur
  // resterait rempli pour un favori jamais enregistré.
  it('revient en arrière quand l’ajout échoue', async () => {
    service.addFavorite.mockRejectedValue(new Error('réseau'));
    const { result } = monter();
    await waitFor(() => expect(service.getFavorites).toHaveBeenCalled());

    await act(async () => {
      result.current.toggleFavorite(3);
    });

    await waitFor(() => expect(result.current.favoriteIds.has(3)).toBe(false));
  });

  it('revient en arrière quand le retrait échoue', async () => {
    service.getFavorites.mockResolvedValue(favoris(3));
    service.removeFavorite.mockRejectedValue(new Error('réseau'));
    const { result } = monter();
    await waitFor(() => expect(result.current.favoriteIds.has(3)).toBe(true));

    await act(async () => {
      result.current.toggleFavorite(3);
    });

    await waitFor(() => expect(result.current.favoriteIds.has(3)).toBe(true));
  });
});

describe('visiteur non connecté', () => {
  // La popup de connexion s'ouvre par-dessus la page courante : sans cet état,
  // le visiteur perdrait le bateau qu'il consultait.
  it('ouvre la connexion en conservant la page consultée', async () => {
    utilisateur = null;
    const { result } = monter();

    act(() => result.current.toggleFavorite(3));

    expect(navigate).toHaveBeenCalledWith('/login', {
      state: { backgroundLocation: location },
    });
    expect(service.addFavorite).not.toHaveBeenCalled();
  });

  it('ne favorise rien pour un propriétaire', async () => {
    utilisateur = { id_user: 7, role: 'proprietaire' };
    const { result } = monter();

    act(() => result.current.toggleFavorite(3));

    expect(navigate).not.toHaveBeenCalled();
    expect(service.addFavorite).not.toHaveBeenCalled();
    expect(result.current.favoriteIds.size).toBe(0);
  });

  it('ne fait rien quand le suivi est désactivé', () => {
    const { result } = monter(false);

    act(() => result.current.toggleFavorite(3));

    expect(navigate).not.toHaveBeenCalled();
    expect(service.addFavorite).not.toHaveBeenCalled();
  });
});
