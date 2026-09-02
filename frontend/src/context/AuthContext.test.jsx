import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { useContext } from 'react';

const authService = {
  login: vi.fn(),
  adminLogin: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
};
vi.mock('../services/authService.js', () => authService);

const client = { setAccessToken: vi.fn(), setOnAuthFailure: vi.fn() };
vi.mock('../services/api.js', () => client);

const showToast = vi.fn();
vi.mock('../hooks/useToast.jsx', () => ({ useToast: () => ({ showToast }) }));

const useIdleLogout = vi.fn();
vi.mock('../hooks/useIdleLogout.jsx', () => ({ useIdleLogout }));

const clearReservationResume = vi.fn();
vi.mock('../utils/reservationResume.js', () => ({ clearReservationResume }));

const { AuthProvider, default: AuthContext } = await import('./AuthContext.jsx');

const SESSION = { accessToken: 'jeton', user: { id_user: 7, role: 'locataire' } };

const monter = () => renderHook(() => useContext(AuthContext), { wrapper: AuthProvider });

// Le mode spectateur ne s'active que dans une iframe : sessionStorage étant
// partagée avec la fenêtre parente, l'activer hors iframe déconnecterait
// l'onglet admin.
function simulerIframe(valeur) {
  Object.defineProperty(window, 'top', { value: {}, configurable: true, writable: true });
  if (valeur) window.sessionStorage.setItem('spectator', valeur);
}

beforeEach(() => {
  vi.clearAllMocks();
  authService.refreshToken.mockResolvedValue(SESSION);
  authService.login.mockResolvedValue(SESSION);
  authService.adminLogin.mockResolvedValue({ ...SESSION, user: { id_user: 1, role: 'admin' } });
  authService.logout.mockResolvedValue(undefined);
});

afterEach(() => {
  Object.defineProperty(window, 'top', { value: window, configurable: true, writable: true });
  window.sessionStorage.clear();
});

describe('reprise de session au chargement', () => {
  it('commence en chargement', async () => {
    let resoudre;
    authService.refreshToken.mockReturnValue(new Promise((r) => (resoudre = r)));
    const { result } = monter();

    expect(result.current.loading).toBe(true);

    // Le verrou anti-double-refresh vit dans le module et n'est libéré que par
    // le .finally() de la promesse. La laisser en suspens ferait hériter tous
    // les tests suivants de cette session qui n'aboutit jamais.
    await act(async () => resoudre(SESSION));
  });

  it('restaure l’utilisateur depuis le cookie de rafraîchissement', async () => {
    const { result } = monter();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(SESSION.user);
    expect(client.setAccessToken).toHaveBeenCalledWith('jeton');
  });

  it('reste visiteur quand aucune session n’est reprise', async () => {
    authService.refreshToken.mockRejectedValue(new Error('pas de cookie'));
    const { result } = monter();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(client.setAccessToken).toHaveBeenCalledWith(null);
  });

  // StrictMode monte deux fois en développement : sans verrou, les deux montages
  // lanceraient chacun un /refresh et le second ferait tourner le jeton une
  // seconde fois côté serveur.
  it('ne lance qu’un seul rafraîchissement pour deux montages simultanés', async () => {
    let resoudre;
    authService.refreshToken.mockReturnValue(new Promise((r) => (resoudre = r)));

    render(<AuthProvider>a</AuthProvider>);
    render(<AuthProvider>b</AuthProvider>);
    await act(async () => resoudre(SESSION));

    expect(authService.refreshToken).toHaveBeenCalledTimes(1);
  });
});

describe('connexion', () => {
  it('enregistre le jeton et l’utilisateur', async () => {
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login({ email: 'a@b.c', password: 'x' });
    });

    expect(client.setAccessToken).toHaveBeenCalledWith('jeton');
    expect(result.current.user).toEqual(SESSION.user);
  });

  it('rend l’utilisateur à l’appelant', async () => {
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    let rendu;
    await act(async () => {
      rendu = await result.current.login({ email: 'a@b.c' });
    });

    expect(rendu).toEqual(SESSION.user);
  });

  // Un compte en pause se réactive à la simple reconnexion : le message doit le
  // dire, sinon l'utilisateur ignore que son compte est de nouveau actif.
  it('signale une réactivation de compte', async () => {
    authService.login.mockResolvedValue({ ...SESSION, reactivated: true });
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login({});
    });

    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('réactivé'), 'success');
  });

  it('annonce simplement la connexion sinon', async () => {
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login({});
    });

    expect(showToast).toHaveBeenCalledWith('Vous êtes connecté.', 'success');
  });

  it('connecte un administrateur par son propre point d’entrée', async () => {
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.adminLogin({ email: 'admin@b.c' });
    });

    expect(authService.adminLogin).toHaveBeenCalled();
    expect(result.current.user.role).toBe('admin');
  });
});

describe('déconnexion', () => {
  it('révoque la session et efface l’utilisateur', async () => {
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(authService.logout).toHaveBeenCalled();
    expect(client.setAccessToken).toHaveBeenLastCalledWith(null);
    expect(result.current.user).toBeNull();
  });

  // Une déconnexion voulue purge le tunnel ; seule l'expiration de session le
  // laisse en place pour permettre la reprise.
  it('abandonne la reprise du tunnel de réservation', async () => {
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(clearReservationResume).toHaveBeenCalled();
  });

  it('reste silencieuse quand on le demande', async () => {
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));
    showToast.mockClear();

    await act(async () => {
      await result.current.logout({ silent: true });
    });

    expect(showToast).not.toHaveBeenCalled();
  });

  // Le serveur peut être injoignable : l'utilisateur doit tout de même se
  // retrouver déconnecté côté navigateur.
  it('déconnecte même si l’appel au serveur échoue', async () => {
    authService.logout.mockRejectedValue(new Error('réseau'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });
});

describe('mise à jour du profil', () => {
  it('fusionne les champs modifiés sans perdre les autres', async () => {
    const { result } = monter();
    await waitFor(() => expect(result.current.user).toEqual(SESSION.user));

    act(() => result.current.updateUser({ first_name: 'Lea' }));

    expect(result.current.user).toEqual({ ...SESSION.user, first_name: 'Lea' });
  });
});

describe('déconnexion automatique', () => {
  it('n’arme la surveillance que pour un utilisateur connecté', async () => {
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(useIdleLogout).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true, timeoutMs: 30 * 60 * 1000 })
    );
  });

  it('reste désarmée pour un visiteur', async () => {
    authService.refreshToken.mockRejectedValue(new Error('pas de cookie'));
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(useIdleLogout).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('déconnecte l’application quand le rafraîchissement échoue côté client', async () => {
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    const surEchec = client.setOnAuthFailure.mock.calls.at(-1)[0];
    act(() => surEchec());

    expect(result.current.user).toBeNull();
  });
});

// Vue admin « spectateur » : le site public est affiché dans une iframe de même
// origine. S'y connecter écraserait le cookie de session de l'onglet admin.
describe('mode spectateur', () => {
  it('reste visiteur sans appeler le serveur', async () => {
    simulerIframe('1');
    const { result } = monter();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(authService.refreshToken).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it.each(['proprietaire', 'locataire'])('présente un compte d’aperçu %s', async (role) => {
    simulerIframe(role);
    const { result } = monter();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toMatchObject({ role, id_user: null });
  });

  it('ignore un rôle d’aperçu inconnu', async () => {
    simulerIframe('pirate');
    const { result } = monter();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('refuse la connexion et explique pourquoi', async () => {
    simulerIframe('1');
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.login({})).rejects.toThrow(/spectateur/);
    expect(authService.login).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('spectateur'), 'warning');
  });

  it('refuse aussi la connexion administrateur', async () => {
    simulerIframe('1');
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.adminLogin({})).rejects.toThrow(/spectateur/);
    expect(authService.adminLogin).not.toHaveBeenCalled();
  });

  // Appeler l'API de déconnexion révoquerait le cookie partagé avec l'onglet
  // parent, qui se retrouverait déconnecté sans l'avoir demandé.
  it('se déconnecte sans toucher à la session réelle', async () => {
    simulerIframe('proprietaire');
    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(authService.logout).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it('ne s’active pas hors iframe, même avec le drapeau posé', async () => {
    window.sessionStorage.setItem('spectator', 'proprietaire');
    const { result } = monter();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(authService.refreshToken).toHaveBeenCalled();
    expect(result.current.user).toEqual(SESSION.user);
  });

  it('retient le rôle passé en paramètre d’URL', async () => {
    Object.defineProperty(window, 'top', { value: {}, configurable: true, writable: true });
    const origine = window.location.search;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?spectator=locataire' },
      configurable: true,
      writable: true,
    });

    const { result } = monter();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toMatchObject({ role: 'locataire' });
    expect(window.sessionStorage.getItem('spectator')).toBe('locataire');

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: origine },
      configurable: true,
      writable: true,
    });
  });
});

describe('valeur par défaut du contexte', () => {
  it('expose un visiteur en chargement sans fournisseur', () => {
    const { result } = renderHook(() => useContext(AuthContext));

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
