import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginForm from './LoginForm.jsx';
import RegisterForm from './RegisterForm.jsx';

function AuthModal({ activeTab, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const navState = backgroundLocation
    ? { state: { backgroundLocation }, replace: true }
    : { replace: true };
  const goToLogin = () => navigate('/login', navState);
  const goToRegister = () => navigate('/register', navState);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-slate-200"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div
          role="tablist"
          aria-label="Connexion ou inscription"
          className="relative mb-6 mt-2 flex rounded-full bg-slate-100 p-1"
        >
          {/* Indicateur coulissant : glisse entre les deux onglets au changement. */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-[#0A3172] shadow transition-transform duration-300 ease-out ${
              activeTab === 'register' ? 'translate-x-full' : 'translate-x-0'
            }`}
          />
          {[
            { key: 'login', label: 'Connexion', onClick: goToLogin },
            { key: 'register', label: 'Inscription', onClick: goToRegister },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={tab.onClick}
                className={`relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
                  isActive ? 'text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <h2 id="auth-modal-title" className="sr-only">
          {activeTab === 'login' ? 'Connexion à SailingLoc' : 'Inscription à SailingLoc'}
        </h2>

        <div
          role="tabpanel"
          key={activeTab}
          className={activeTab === 'login' ? 'auth-panel-login' : 'auth-panel-register'}
        >
          {activeTab === 'login' ? (
            <LoginForm onSwitchToRegister={goToRegister} />
          ) : (
            <RegisterForm onSwitchToLogin={goToLogin} />
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
