import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppRouter from './router/AppRouter.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './hooks/useAuth.jsx';
import Header from './components/common/Header/Header.jsx';
import AuthModal from './components/auth/AuthModal.jsx';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const backgroundLocation = location.state?.backgroundLocation;
  const routesLocation = backgroundLocation || location;

  const activeAuthTab =
    location.pathname === '/login'
      ? 'login'
      : location.pathname === '/register'
        ? 'register'
        : null;

  // Si un utilisateur est déjà connecté, on ne montre pas la popup d'auth.
  useEffect(() => {
    if (!loading && user && activeAuthTab) {
      const target = backgroundLocation
        ? `${backgroundLocation.pathname}${backgroundLocation.search}${backgroundLocation.hash}`
        : '/';
      navigate(target, { replace: true });
    }
  }, [loading, user, activeAuthTab, backgroundLocation, navigate]);

  function closeAuthModal() {
    if (backgroundLocation) {
      const { pathname, search, hash } = backgroundLocation;
      navigate(`${pathname}${search}${hash}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }

  const showAuthModal = activeAuthTab && !user && !loading;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <AppRouter location={routesLocation} />
      </div>
      {showAuthModal && (
        <AuthModal activeTab={activeAuthTab} onClose={closeAuthModal} />
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
