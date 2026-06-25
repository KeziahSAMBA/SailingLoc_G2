import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.jsx';
import logo from '../../../assets/image/SL_logo/logo SL.webp';
import logoLong from '../../../assets/image/SL_logo/logo SL long.webp';

const SKY = '#0ea5e9';
const SKY_BORDER = 'rgba(14, 165, 233, 0.45)';
const SKY_HOVER_BG = 'rgba(14, 165, 233, 0.08)';

const BURGER_ITEMS = [
  { label: 'Chercher une location', anchor: 'hero' },
  { label: 'Tutoriel', anchor: 'tutoriel' },
  { label: 'Nos suggestions', anchor: 'suggestions' },
  { label: 'Avis & commentaires', anchor: 'avis' },
];

const NAV_LINKS = [
  ['Découvrir', '/categorie'],
  ['Contact', '#contact'],
  ['À propos', '/a-propos'],
];

const UserIcon = ({ size, color }) => (
  <span
    className="rounded-full flex items-center justify-center flex-shrink-0"
    style={{
      width: size,
      height: size,
      border: `1px solid ${color === '#fff' ? 'rgba(255,255,255,0.6)' : SKY_BORDER}`,
      transition: 'width 0.3s ease, height 0.3s ease',
    }}
  >
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  </span>
);

const ChevronDown = ({ open, color }) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

function getAuthBtnStyle(scrolled) {
  return {
    color: scrolled ? '#fff' : SKY,
    border: `1px solid ${scrolled ? 'rgba(255,255,255,0.5)' : SKY_BORDER}`,
    backgroundColor: 'transparent',
    fontSize: scrolled ? '0.75rem' : '0.80rem',
    padding: scrolled ? '5px 14px' : '7px 16px',
    transition: 'font-size 0.3s ease, padding 0.3s ease, background-color 0.2s, border-color 0.2s',
  };
}

function makeAuthBtnHover(scrolled) {
  return {
    onMouseEnter: (e) => {
      e.currentTarget.style.backgroundColor = scrolled ? 'rgba(255,255,255,0.15)' : SKY_HOVER_BG;
      e.currentTarget.style.borderColor = scrolled ? '#fff' : SKY;
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.borderColor = scrolled ? 'rgba(255,255,255,0.5)' : SKY_BORDER;
    },
  };
}

function HeaderCategory() {
  const [lang, setLang] = useState('FR');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading: authLoading } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function scrollToAnchor(anchor) {
    setMenuOpen(false);
    const scroll = () => {
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    };
    if (location.pathname === '/') {
      scroll();
    } else {
      navigate('/');
      setTimeout(scroll, 300);
    }
  }

  function handleLogout() {
    setUserMenuOpen(false);
    logout();
    navigate('/', { replace: true });
  }

  const iconSize = scrolled ? '14px' : '16px';
  const textColor = scrolled ? '#fff' : SKY;
  const authHover = makeAuthBtnHover(scrolled);

  return (
    <header
      className="fixed top-0 left-0 w-full z-50 flex items-center px-12"
      style={{
        height: scrolled ? '60px' : '80px',
        backgroundColor: scrolled ? 'rgba(10, 49, 114, 0.95)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: scrolled ? 'none' : 'blur(12px)',
        WebkitBackdropFilter: scrolled ? 'none' : 'blur(12px)',
        boxShadow: scrolled ? '0 2px 12px rgba(0, 0, 0, 0.08)' : '0 4px 20px rgba(0, 0, 0, 0.08)',
        transition: 'height 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease',
      }}
    >
      {/* Gauche — Burger + Logo (33%) */}
      <div className="w-1/3 flex items-center gap-4 pl-4">
        {/* Burger */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex flex-col justify-center gap-[5px] p-1"
            aria-label="Menu"
          >
            <span
              className="block w-5 h-[1.5px] rounded transition-all duration-300"
              style={{
                backgroundColor: textColor,
                transform: menuOpen ? 'translateY(6.5px) rotate(45deg)' : 'none',
              }}
            />
            <span
              className="block w-5 h-[1.5px] rounded transition-all duration-300"
              style={{ backgroundColor: textColor, opacity: menuOpen ? 0 : 1 }}
            />
            <span
              className="block w-5 h-[1.5px] rounded transition-all duration-300"
              style={{
                backgroundColor: textColor,
                transform: menuOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
              }}
            />
          </button>

          {/* Dropdown — panneau latéral gauche — transparent + blur */}
          <div
            className="fixed left-0 overflow-hidden"
            style={{
              top: scrolled ? '60px' : '80px',
              width: '260px',
              height: `calc(100vh - ${scrolled ? '60px' : '80px'})`,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
              transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
              pointerEvents: menuOpen ? 'auto' : 'none',
              transition: 'top 0.3s ease, height 0.3s ease, transform 0.3s ease',
            }}
          >
            <div className="flex flex-col" style={{ height: '55%' }}>
              {BURGER_ITEMS.map(({ label, anchor }) => (
                <button
                  key={label}
                  onClick={() => scrollToAnchor(anchor)}
                  className="flex items-center flex-1 px-5 text-base font-medium transition-colors text-left"
                  style={{ color: '#0A3172' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'rgba(10, 49, 114, 0.06)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Logo */}
        <button
          onClick={() => {
            if (location.pathname === '/') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              navigate('/');
            }
          }}
          className="flex items-center"
        >
          <img
            src={scrolled ? logoLong : logo}
            alt="SailingLoc"
            style={{
              height: scrolled ? '40px' : '54px',
              transition: 'height 0.3s ease',
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </button>
      </div>

      {/* Centre — Navigation (33%) */}
      <nav className="w-1/3 flex justify-center">
        <ul className="flex gap-10 list-none m-0 p-0">
          {NAV_LINKS.map(([label, href]) => (
            <li key={label}>
              <a
                href={href}
                onClick={
                  href === '#contact'
                    ? (e) => {
                        e.preventDefault();
                        scrollToAnchor('contact');
                      }
                    : label === 'Découvrir'
                      ? (e) => {
                          e.preventDefault();
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      : undefined
                }
                className="font-medium"
                style={{
                  color: textColor,
                  fontSize: scrolled ? '0.90rem' : '1.15rem',
                  backgroundImage: `linear-gradient(${textColor}, ${textColor})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '0% 1px',
                  backgroundPosition: '0 100%',
                  transition: 'font-size 0.3s ease, background-size 0.35s ease',
                  paddingBottom: '3px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundSize = '100% 1px';
                  e.currentTarget.style.opacity = '0.75';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundSize = '0% 1px';
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Droite — Langue + Connexion (33%) */}
      <div className="w-1/3 flex items-center justify-end gap-4 pr-4">
        <div className="flex items-center gap-1">
          {['FR', 'EN'].map((l, i) => (
            <span key={l} className="flex items-center gap-1">
              {i === 1 && (
                <span style={{ color: textColor, opacity: 0.4, fontSize: '0.9rem' }}>/</span>
              )}
              <button
                onClick={() => setLang(l)}
                className="px-1 font-medium"
                style={{
                  color: textColor,
                  opacity: lang === l ? 1 : 0.45,
                  fontWeight: lang === l ? 700 : 500,
                  fontSize: scrolled ? '0.7rem' : '0.75rem',
                  backgroundImage: `linear-gradient(${textColor}, ${textColor})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '0% 1px',
                  backgroundPosition: '0 100%',
                  paddingBottom: '2px',
                  transition: 'font-size 0.3s ease, background-size 0.35s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundSize = '100% 1px')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundSize = '0% 1px')}
              >
                {l}
              </button>
            </span>
          ))}
        </div>

        {authLoading ? (
          <div style={{ height: scrolled ? '24px' : '2px', width: '120px' }} aria-hidden="true" />
        ) : user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full transition-all whitespace-nowrap"
              style={getAuthBtnStyle(scrolled)}
              {...authHover}
            >
              <UserIcon size={iconSize} color={textColor} />
              {user.first_name}
              <ChevronDown open={userMenuOpen} color={textColor} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate(user.role === 'admin' ? '/admin' : '/dashboard');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="9" />
                    <rect x="14" y="3" width="7" height="5" />
                    <rect x="14" y="12" width="7" height="9" />
                    <rect x="3" y="16" width="7" height="5" />
                  </svg>
                  Mon dashboard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/account');
                  }}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                  Mon compte
                </button>
                {(user.role === 'locataire' || user.role === 'proprietaire') && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/documents');
                    }}
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Mes documents
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/login', { state: { backgroundLocation: location } })}
            className="flex items-center gap-2 rounded-full transition-all whitespace-nowrap"
            style={getAuthBtnStyle(scrolled)}
            {...authHover}
          >
            <UserIcon size={iconSize} color={textColor} />
            Se connecter / S&apos;inscrire
          </button>
        )}
      </div>
    </header>
  );
}

export default HeaderCategory;
