import { useLocation, useNavigate } from 'react-router-dom';
import AppRouter from './router/AppRouter.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import Header from './components/common/Header/Header.jsx';
import AuthModal from './components/auth/AuthModal.jsx';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const backgroundLocation = location.state?.backgroundLocation;
  const routesLocation = backgroundLocation || location;

  const activeAuthTab =
    location.pathname === '/login'
      ? 'login'
      : location.pathname === '/register'
        ? 'register'
        : null;

  function closeAuthModal() {
    if (backgroundLocation) {
      const { pathname, search, hash } = backgroundLocation;
      navigate(`${pathname}${search}${hash}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }

  return (
    <AuthProvider>
      <Header />
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <AppRouter location={routesLocation} />
      </div>
      {activeAuthTab && (
        <AuthModal activeTab={activeAuthTab} onClose={closeAuthModal} />
      )}
    </AuthProvider>
  );
}

export default App;