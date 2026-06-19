import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.jsx';
import logo from '../../../assets/image/SL_logo/logo SL.webp';
import logoLong from '../../../assets/image/SL_logo/logo SL long.webp';

const NAV_ITEMS = ['Voir mes bateaux', 'Publier un bateau'];

const USER_MENU_ITEMS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Compte', to: '/account' },
  { label: 'Documents', to: '/documents' },
  { label: 'Réservations', to: '/dashboard' },
  { label: 'Mes transactions', to: '/dashboard' },
  { label: 'Mes bateaux', to: '/dashboard' },
  { label: 'Déconnexion', action: 'logout', danger: true },
];

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';

  function handleLogout() {
    setUserMenuOpen(false);
    logout();
    navigate('/', { replace: true });
  }

  function handleMenuClick(e, item) {
    e.preventDefault();
    setUserMenuOpen(false);
    if (item.action === 'logout') handleLogout();
    else if (item.to) navigate(item.to);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setNavOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 w-full z-50 flex items-center px-12"
      style={{
        height: scrolled ? '60px' : '80px',
        backgroundColor: scrolled ? 'rgba(10, 49, 114, 0.95)' : 'rgba(255, 255, 255, 0.05)',
        borderBottom: '1px solid rgba(90, 180, 236, 0.2)',
        boxShadow: scrolled ? '0 2px 12px rgba(10, 49, 114, 0.08)' : 'none',
        transition: 'height 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease',
      }}
    >
      {/* Gauche — Burger nav + Logo (33%) */}
      <div className="w-1/3 flex items-center gap-4 pl-4">
        <div className="relative" ref={navRef}>
          <button
            onClick={() => setNavOpen((o) => !o)}
            className="flex flex-col justify-center gap-[5px] p-1"
            aria-label="Menu navigation"
          >
            <span
              className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
              style={{ transform: navOpen ? 'translateY(6.5px) rotate(45deg)' : 'none' }}
            />
            <span
              className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
              style={{ opacity: navOpen ? 0 : 1 }}
            />
            <span
              className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
              style={{ transform: navOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none' }}
            />
          </button>

          <div
            className="fixed left-0 overflow-hidden"
            style={{
              top: scrolled ? '60px' : '80px',
              width: '260px',
              height: `calc(100vh - ${scrolled ? '60px' : '80px'})`,
              backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
              transform: navOpen ? 'translateX(0)' : 'translateX(-100%)',
              pointerEvents: navOpen ? 'auto' : 'none',
              transition: 'top 0.3s ease, height 0.3s ease, transform 0.3s ease',
            }}
          >
            <div className="flex flex-col" style={{ height: '28%' }}>
              {NAV_ITEMS.map((item) => (
                <a
                  key={item}
                  href="#"
                  className="flex items-center flex-1 px-5 text-base font-medium transition-colors"
                  style={{ color: scrolled ? '#0A3172' : '#fff' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = scrolled
                      ? 'rgba(10, 49, 114, 0.06)'
                      : 'rgba(255, 255, 255, 0.1)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>

        <a href="/" className="flex items-center">
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
        </a>
      </div>

      {/* Centre — Navigation (33%) */}
      <nav className="w-1/3 flex justify-center">
        <ul className="flex gap-10 list-none m-0 p-0">
          {[
            ['Mes publications', '/'],
            ['Contact', '/contact'],
            ['À propos', '/a-propos'],
          ].map(([label, href]) => (
            <li key={label}>
              <a
                href={href}
                className="font-medium"
                style={{
                  color: '#fff',
                  fontSize: scrolled ? '0.85rem' : '1.05rem',
                  backgroundImage: 'linear-gradient(#fff, #fff)',
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

      {/* Droite — Icône utilisateur + Burger menu utilisateur (33%) */}
      <div className="w-1/3 flex items-center justify-end gap-3 pr-4">
        {/* Nom + Icône utilisateur — lien vers le profil */}
        <a
          href="/account"
          onClick={(e) => {
            e.preventDefault();
            navigate('/account');
          }}
          className="flex items-center gap-3 group"
          style={{ textDecoration: 'none' }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: scrolled ? '0.75rem' : '0.85rem',
              opacity: 0.9,
              fontWeight: 500,
              transition: 'font-size 0.3s ease, background-size 0.35s ease',
              backgroundImage: 'linear-gradient(#fff, #fff)',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '0% 1px',
              backgroundPosition: '0 100%',
              paddingBottom: '3px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundSize = '100% 1px';
              e.currentTarget.style.opacity = '0.75';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundSize = '0% 1px';
              e.currentTarget.style.opacity = '0.9';
            }}
          >
            {displayName}
          </span>
          <div
            className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{
              width: scrolled ? '32px' : '40px',
              height: scrolled ? '32px' : '40px',
              border: '1.5px solid rgba(255, 255, 255, 0.7)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              transition: 'width 0.3s ease, height 0.3s ease, background-color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <svg
                width={scrolled ? '18' : '22'}
                height={scrolled ? '18' : '22'}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            )}
          </div>
        </a>

        {/* Burger menu utilisateur */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex flex-col justify-center gap-[5px] p-1 ml-1"
            aria-label="Menu utilisateur"
          >
            <span
              className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
              style={{ transform: userMenuOpen ? 'translateY(6.5px) rotate(45deg)' : 'none' }}
            />
            <span
              className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
              style={{ opacity: userMenuOpen ? 0 : 1 }}
            />
            <span
              className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
              style={{ transform: userMenuOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none' }}
            />
          </button>

          {/* Dropdown panel côté droit */}
          <div
            className="fixed right-0 overflow-hidden"
            style={{
              top: scrolled ? '60px' : '80px',
              width: '260px',
              height: `calc(100vh - ${scrolled ? '60px' : '80px'})`,
              backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
              transform: userMenuOpen ? 'translateX(0)' : 'translateX(100%)',
              pointerEvents: userMenuOpen ? 'auto' : 'none',
              transition: 'top 0.3s ease, height 0.3s ease, transform 0.3s ease',
            }}
          >
            {/* Items du menu */}
            <div className="flex flex-col" style={{ height: '77%' }}>
              {USER_MENU_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.to || '#'}
                  onClick={(e) => handleMenuClick(e, item)}
                  className="flex items-center flex-1 px-5 text-base font-medium transition-colors"
                  style={{ color: item.danger ? '#e05252' : scrolled ? '#0A3172' : '#fff' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = item.danger
                      ? 'rgba(224, 82, 82, 0.08)'
                      : scrolled
                        ? 'rgba(10, 49, 114, 0.06)'
                        : 'rgba(255, 255, 255, 0.1)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
