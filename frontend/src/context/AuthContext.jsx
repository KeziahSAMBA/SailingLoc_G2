import { createContext, useState, useEffect, useCallback } from 'react';
import {
  login as apiLogin,
  adminLogin as apiAdminLogin,
  logout as apiLogout,
  refreshToken,
} from '../services/authService.js';
import { setAccessToken, setOnAuthFailure } from '../services/api.js';
import { useIdleLogout } from '../hooks/useIdleLogout.jsx';
import { useToast } from '../hooks/useToast.jsx';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

// Verrou module-level : si StrictMode (dev) ou tout autre cause monte AuthProvider deux fois,
// les deux mounts partagent la MÊME requête /refresh → pas de double rotation côté serveur.
let initialSessionPromise = null;
function loadInitialSession() {
  if (!initialSessionPromise) {
    initialSessionPromise = refreshToken().finally(() => {
      initialSessionPromise = null;
    });
  }
  return initialSessionPromise;
}

// Mode « spectateur » : utilisé par la page admin /admin/spectateur qui embarque
// le site public dans une iframe. Quand le flag est présent, on saute la requête
// /refresh au boot pour que l'utilisateur apparaisse comme un visiteur non
// connecté, sans toucher au cookie refresh réel (qui reste valide dans son
// onglet d'origine). Le flag se transmet via ?spectator=1 (premier chargement)
// et est persisté en sessionStorage pour survivre aux navigations internes.
//
// /!\ sessionStorage est partagée entre l'iframe et son parent quand ils sont
// sur la même origine. Pour éviter que le flag posé dans l'iframe ne déconnecte
// l'onglet admin parent au prochain reload, on n'active la vérification que si
// on est effectivement dans une iframe (window.self !== window.top).
function isSpectatorMode() {
  try {
    if (window.self === window.top) return false; // Fenêtre principale → jamais spectateur.
    const fromUrl = new URLSearchParams(window.location.search).get('spectator') === '1';
    if (fromUrl) {
      window.sessionStorage.setItem('spectator', '1');
      return true;
    }
    return window.sessionStorage.getItem('spectator') === '1';
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Au chargement, tente de récupérer une session via le cookie refresh.
  // Sauf en mode spectateur : on reste guest sans appeler /refresh.
  useEffect(() => {
    if (isSpectatorMode()) {
      setAccessToken(null);
      setUser(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    loadInitialSession()
      .then((data) => {
        if (cancelled) return;
        setAccessToken(data.accessToken);
        setUser(data.user);
      })
      .catch(() => {
        if (cancelled) return;
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (credentials) => {
      // Garde-fou : un login depuis la vue spectateur écraserait le cookie
      // de session admin du parent (même origine = même cookie). On bloque
      // proprement avec un message explicite pour orienter vers l'onglet privé.
      if (isSpectatorMode()) {
        const msg =
          '🚫 Connexion désactivée dans la vue spectateur. Pour tester un compte locataire / propriétaire, ouvrez un onglet privé de votre navigateur.';
        showToast(msg, 'warning');
        throw new Error(msg);
      }
      const data = await apiLogin(credentials);
      setAccessToken(data.accessToken);
      setUser(data.user);
      showToast('Vous êtes connecté.', 'success');
      return data.user;
    },
    [showToast]
  );

  const adminLogin = useCallback(
    async (credentials) => {
      if (isSpectatorMode()) {
        const msg =
          '🚫 Connexion désactivée dans la vue spectateur. Ouvrez un onglet privé pour vous reconnecter en admin.';
        showToast(msg, 'warning');
        throw new Error(msg);
      }
      const data = await apiAdminLogin(credentials);
      setAccessToken(data.accessToken);
      setUser(data.user);
      showToast('Vous êtes connecté.', 'success');
      return data.user;
    },
    [showToast]
  );

  const logout = useCallback(
    async ({ silent = false } = {}) => {
      try {
        await apiLogout();
      } catch (err) {
        console.warn('[logout]', err.message);
      }
      setAccessToken(null);
      setUser(null);
      if (!silent) {
        showToast('Vous êtes déconnecté.', 'warning');
      }
    },
    [showToast]
  );

  // Met à jour le user en contexte après une édition de profil (fusion partielle).
  const updateUser = useCallback((next) => {
    setUser((prev) => ({ ...prev, ...next }));
  }, []);

  const handleIdleLogout = useCallback(() => {
    logout({ reason: 'idle' });
  }, [logout]);

  // Si l'intercepteur échoue à refresh, on déconnecte côté client.
  useEffect(() => {
    setOnAuthFailure(() => {
      setUser(null);
    });
  }, []);

  // Auto-déconnexion après 30 min sans activité (souris, clavier, scroll, touch).
  // Synchronisé entre onglets via localStorage : activité dans un onglet = tous restent connectés.
  useIdleLogout({
    enabled: Boolean(user),
    timeoutMs: IDLE_TIMEOUT_MS,
    onIdle: handleIdleLogout,
  });

  return (
    <AuthContext.Provider value={{ user, loading, login, adminLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
