import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppRouter from './router/AppRouter.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './hooks/useAuth.jsx';
import Header from './components/common/Header/Header.jsx';
import HeaderAdmin from './components/common/Header/HeaderAdmin.jsx';
import HeaderProprio from './components/common/Header/HeaderProprio.jsx';
import HeaderLocataire from './components/common/Header/HeaderLocataire.jsx';
import AuthModal from './components/auth/AuthModal.jsx';
import Footer from './components/common/Footer.jsx';

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

  // Header dédié selon le rôle (les composants de common/Header). Invité ou pendant
  // le chargement de la session : header public générique.
  function renderHeader() {
    switch (user?.role) {
      case 'admin':
        return <HeaderAdmin />;
      case 'proprietaire':
        return <HeaderProprio />;
      case 'locataire':
        return <HeaderLocataire />;
      default:
        return <Header />;
    }
  }

  return (
    <>
      {renderHeader()}
      <div className="bg-slate-50 text-slate-900">
        <AppRouter location={routesLocation} />
      </div>
      {showAuthModal && <AuthModal activeTab={activeAuthTab} onClose={closeAuthModal} />}
      <Footer />
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
