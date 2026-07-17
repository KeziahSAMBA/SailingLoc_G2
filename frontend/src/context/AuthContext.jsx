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
import { clearReservationResume } from '../utils/reservationResume.js';

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
// connecté (ou un faux compte de démo selon le rôle demandé), sans toucher au
// cookie refresh réel (qui reste valide dans son onglet d'origine). Le flag se
// transmet via ?spectator=<mode> (premier chargement) et est persisté en
// sessionStorage pour survivre aux navigations internes.
//
// /!\ sessionStorage est partagée entre l'iframe et son parent quand ils sont
// sur la même origine. Pour éviter que le flag posé dans l'iframe ne déconnecte
// l'onglet admin parent au prochain reload, on n'active la vérification que si
// on est effectivement dans une iframe (window.self !== window.top).
function getSpectatorParam() {
  try {
    if (window.self === window.top) return null; // Fenêtre principale → jamais spectateur.
    const fromUrl = new URLSearchParams(window.location.search).get('spectator');
    if (fromUrl) {
      window.sessionStorage.setItem('spectator', fromUrl);
      return fromUrl;
    }
    return window.sessionStorage.getItem('spectator');
  } catch {
    return null;
  }
}

function isSpectatorMode() {
  return Boolean(getSpectatorParam());
}

// Faux comptes utilisés uniquement pour l'aperçu visuel dans l'iframe spectateur :
// aucune vraie session/API derrière, juste de quoi afficher le bon header/layout.
const SPECTATOR_USERS = {
  proprietaire: {
    id_user: null,
    email: 'apercu.proprietaire@sailingloc.fr',
    role: 'proprietaire',
    first_name: '',
    last_name: '',
    phone: null,
    avatar: null,
  },
  locataire: {
    id_user: null,
    email: 'apercu.locataire@sailingloc.fr',
    role: 'locataire',
    first_name: '',
    last_name: '',
    phone: null,
    avatar: null,
  },
};

export function AuthProvider({ children }) {
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Au chargement, tente de récupérer une session via le cookie refresh.
  // Sauf en mode spectateur : on reste guest sans appeler /refresh.
  useEffect(() => {
    const spectatorParam = getSpectatorParam();
    if (spectatorParam) {
      setAccessToken(null);
      setUser(spectatorParam === '1' ? null : (SPECTATOR_USERS[spectatorParam] ?? null));
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
      // Déconnexion voulue (ou inactivité) : on ne conserve pas le tunnel de
      // réservation — seule l'expiration de session le laisse en place.
      clearReservationResume();
      // En mode spectateur, le user est un faux compte de démo : pas de vraie
      // session à révoquer, et appeler l'API partagerait le cookie du parent.
      if (isSpectatorMode()) {
        setUser(null);
        return;
      }
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
