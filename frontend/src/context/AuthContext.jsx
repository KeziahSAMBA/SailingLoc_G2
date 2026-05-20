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

export function AuthProvider({ children }) {
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Au chargement, tente de récupérer une session via le cookie refresh.
  useEffect(() => {
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
    <AuthContext.Provider value={{ user, loading, login, adminLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
