import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.jsx';
import logo from '../../../assets/image/SL_logo/logo SL.webp';
import logoLong from '../../../assets/image/SL_logo/logo SL long.webp';

// Rubriques locataire
const NAV_LOCATAIRE = [
  'Chercher une location',
  'Tutoriel',
  'Nos suggestions',
  'Avis & commentaires',
];

// Rubriques proprio
const NAV_PROPRIO = ['Voir mes bateaux', 'Publier un bateau'];

// Liens centre — navigation admin
const CENTER_NAV = [
  { label: 'Vue spectateur', to: '/admin/spectateur' },
  { label: 'Dashboard admin', to: '/admin' },
  { label: 'Utilisateurs', to: '/admin/users' },
];

// Menu burger droit — administration
const ADMIN_MENU_ITEMS = [
  { label: 'Liste utilisateurs', to: '/admin/users' },
  { label: 'Commentaires', to: '/admin/comments' },
  { label: 'Publications', to: '/admin/publications' },
  { label: 'Documents', to: '/admin/documents' },
  { label: 'Réservations', to: '/admin/bookings' },
  { label: 'Port', to: '/admin/ports' },
  { label: 'Transactions / Commissions', to: '/admin/transactions' },
  { label: 'Déconnexion', action: 'logout', danger: true },
];

function HeaderAdmin() {
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const navRef = useRef(null);
  const adminMenuRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';

  function handleLogout() {
    setAdminMenuOpen(false);
    logout();
    navigate('/', { replace: true });
  }

  function handleMenuClick(e, item) {
    e.preventDefault();
    setAdminMenuOpen(false);
    setNavOpen(false);
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
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target)) setAdminMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const panelBg = scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.25)';
  const textColor = scrolled ? '#0A3172' : '#fff';
  const hoverBg = scrolled ? 'rgba(10, 49, 114, 0.06)' : 'rgba(255, 255, 255, 0.1)';
  const panelTop = scrolled ? '60px' : '80px';

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
      {/* Gauche — Burger nav (locataire + proprio) + Logo */}
      <div className="w-1/3 flex items-center gap-4 pl-4">
        <div className="relative" ref={navRef}>
          <button
            onClick={() => setNavOpen((o) => !o)}
            className="flex flex-col justify-center gap-[5px] p-1"
            aria-label="Menu navigation"
          >
            {[
              navOpen ? 'translateY(6.5px) rotate(45deg)' : 'none',
              null,
              navOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
            ].map((transform, i) => (
              <span
                key={i}
                className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
                style={transform === null ? { opacity: navOpen ? 0 : 1 } : { transform }}
              />
            ))}
          </button>

          {/* Panel gauche */}
          <div
            className="fixed left-0 overflow-hidden"
            style={{
              top: panelTop,
              width: '260px',
              height: `calc(100vh - ${panelTop})`,
              backgroundColor: panelBg,
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
              transform: navOpen ? 'translateX(0)' : 'translateX(-100%)',
              pointerEvents: navOpen ? 'auto' : 'none',
              transition: 'top 0.3s ease, height 0.3s ease, transform 0.3s ease',
            }}
          >
            {/* Section locataire */}
            <div className="flex flex-col">
              {NAV_LOCATAIRE.map((item) => (
                <a
                  key={item}
                  href="#"
                  className="flex items-center px-6 py-3 text-base font-medium transition-colors"
                  style={{ color: textColor }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {item}
                </a>
              ))}
            </div>

            {/* Séparateur discret */}
            <div
              style={{
                margin: '6px 16px',
                height: '1px',
                backgroundColor: scrolled ? 'rgba(10, 49, 114, 0.15)' : 'rgba(255, 255, 255, 0.2)',
              }}
            />

            {/* Section proprio */}
            <div className="flex flex-col">
              {NAV_PROPRIO.map((item) => (
                <a
                  key={item}
                  href="#"
                  className="flex items-center px-6 py-3 text-base font-medium transition-colors"
                  style={{ color: textColor }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
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

      {/* Centre — Vue locataire / Dashboard admin / Vue propriétaire */}
      <nav className="w-1/3 flex justify-center">
        <ul className="flex gap-20 list-none m-0 p-0" style={{ whiteSpace: 'nowrap' }}>
          {CENTER_NAV.map(({ label, to }) => (
            <li key={label} style={{ whiteSpace: 'nowrap' }}>
              <a
                href={to}
                onClick={(e) => handleMenuClick(e, { to })}
                className="font-medium"
                style={{
                  color: '#fff',
                  fontSize: scrolled ? '0.85rem' : '1rem',
                  whiteSpace: 'nowrap',
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

      {/* Droite — Icône utilisateur + Burger admin */}
      <div className="w-1/3 flex items-center justify-end gap-3 pr-4">
        {/* Nom + avatar */}
        <a
          href="/admin"
          onClick={(e) => {
            e.preventDefault();
            navigate('/admin');
          }}
          className="flex items-center gap-3"
          style={{ textDecoration: 'none' }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: scrolled ? '0.75rem' : '0.85rem',
              opacity: 0.9,
              fontWeight: 500,
              transition: 'font-size 0.3s ease',
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

        {/* Burger menu admin (droite) */}
        <div className="relative" ref={adminMenuRef}>
          <button
            onClick={() => setAdminMenuOpen((o) => !o)}
            className="flex flex-col justify-center gap-[5px] p-1 ml-1"
            aria-label="Menu administration"
          >
            {[
              adminMenuOpen ? 'translateY(6.5px) rotate(45deg)' : 'none',
              null,
              adminMenuOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
            ].map((transform, i) => (
              <span
                key={i}
                className="block w-5 h-[1.5px] bg-white rounded transition-all duration-300"
                style={transform === null ? { opacity: adminMenuOpen ? 0 : 1 } : { transform }}
              />
            ))}
          </button>

          {/* Panel droit */}
          <div
            className="fixed right-0 overflow-hidden"
            style={{
              top: panelTop,
              width: '280px',
              height: `calc(100vh - ${panelTop})`,
              backgroundColor: panelBg,
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
              transform: adminMenuOpen ? 'translateX(0)' : 'translateX(100%)',
              pointerEvents: adminMenuOpen ? 'auto' : 'none',
              transition: 'top 0.3s ease, height 0.3s ease, transform 0.3s ease',
            }}
          >
            <div className="flex flex-col pt-2">
              {ADMIN_MENU_ITEMS.map((item, idx) => (
                <a
                  key={item.label}
                  href={item.to || '#'}
                  onClick={(e) => handleMenuClick(e, item)}
                  className="flex flex-col justify-center px-5 py-3 text-sm font-medium transition-colors"
                  style={{
                    color: item.danger ? '#e05252' : textColor,
                    borderTop:
                      idx === ADMIN_MENU_ITEMS.length - 1
                        ? `1px solid ${scrolled ? 'rgba(10,49,114,0.15)' : 'rgba(255,255,255,0.2)'}`
                        : 'none',
                    marginTop: idx === ADMIN_MENU_ITEMS.length - 1 ? '6px' : '0',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = item.danger
                      ? 'rgba(224, 82, 82, 0.08)'
                      : hoverBg)
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

export default HeaderAdmin;
