import { Fragment, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiMail } from 'react-icons/fi';
import { useAuth } from '../../../hooks/useAuth.jsx';
import { nameToAvatarUrl } from '../../../utils/avatar.js';
import { useScrolled } from './shared/useScrolled.js';
import { useClickOutside } from './shared/useClickOutside.js';
import HeaderLogo from './shared/HeaderLogo.jsx';
import BurgerIcon from './shared/BurgerIcon.jsx';
import SidePanel from './shared/SidePanel.jsx';
import PanelLink from './shared/PanelLink.jsx';

/**
 * Header shared by every authenticated role (admin, propriétaire, locataire).
 * Each role provides its own nav/menu content through props — see
 * HeaderAdmin.jsx / HeaderProprio.jsx / HeaderLocataire.jsx for the configs.
 */
function DashboardHeader({
  leftGroups,
  centerNav,
  centerGapClass = 'gap-10',
  centerFontSize = { scrolled: '0.85rem', base: '1.05rem' },
  profileHref,
  rightMenuItems,
  rightVariant = 'stretch',
  rightHeightPercent,
  rightPanelWidth = '260px',
  showMessages = false,
}) {
  const scrolled = useScrolled();
  const [navOpen, setNavOpen] = useState(false);
  const [rightMenuOpen, setRightMenuOpen] = useState(false);
  const navRef = useRef(null);
  const rightMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const onCategoriePage = location.pathname === '/categorie';
  const { user, logout } = useAuth();

  const displayName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';

  useClickOutside([
    [navRef, () => setNavOpen(false)],
    [rightMenuRef, () => setRightMenuOpen(false)],
  ]);

  function handleLogout() {
    setRightMenuOpen(false);
    logout();
    navigate('/', { replace: true });
  }

  function handleMenuClick(item) {
    setRightMenuOpen(false);
    setNavOpen(false);
    if (item.action === 'logout') handleLogout();
    else if (item.to) navigate(item.to);
  }

  return (
    <header
      className="fixed top-0 left-0 w-full z-50 flex items-center px-12"
      style={{ height: scrolled ? '60px' : '80px', transition: 'height 0.3s ease' }}
    >
      {/*
        Background lives on its own layer (not on <header> itself) because a
        backdrop-filter on an element makes it a new containing block for
        fixed-position descendants — which would break the SidePanels' own
        backdrop-filter (they're nested inside <header>).
      */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundColor: scrolled
            ? 'rgba(10, 49, 114, 0.95)'
            : onCategoriePage
              ? 'rgba(0, 0, 0, 0.10)'
              : 'rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(90, 180, 236, 0.2)',
          boxShadow: scrolled ? '0 2px 12px rgba(10, 49, 114, 0.08)' : 'none',
          backdropFilter: !scrolled && onCategoriePage ? 'blur(1px)' : undefined,
          WebkitBackdropFilter: !scrolled && onCategoriePage ? 'blur(1px)' : undefined,
          transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
        }}
      />

      {/* Gauche — Burger nav + Logo (33%) */}
      <div className="w-1/3 flex items-center gap-4 pl-4">
        {leftGroups && (
          <div className="relative" ref={navRef}>
            <button
              onClick={() => setNavOpen((o) => !o)}
              className="flex flex-col justify-center gap-[5px] p-1"
              aria-label="Menu navigation"
            >
              <BurgerIcon open={navOpen} />
            </button>

            <SidePanel
              side="left"
              open={navOpen}
              scrolled={scrolled}
              width="260px"
              darkerOverlay={onCategoriePage}
            >
              <div style={{ height: '100%' }}>
                {leftGroups.map((group, groupIdx) => (
                  <Fragment key={groupIdx}>
                    <div className="flex flex-col" style={{ height: group.heightPercent }}>
                      {group.items.map((item) => (
                        <PanelLink key={item} scrolled={scrolled} stretch>
                          {item}
                        </PanelLink>
                      ))}
                    </div>
                    {groupIdx < leftGroups.length - 1 && (
                      <div
                        style={{
                          margin: '6px 16px',
                          height: '1px',
                          backgroundColor: scrolled
                            ? 'rgba(10, 49, 114, 0.15)'
                            : 'rgba(255, 255, 255, 0.2)',
                        }}
                      />
                    )}
                  </Fragment>
                ))}
              </div>
            </SidePanel>
          </div>
        )}

        <HeaderLogo scrolled={scrolled} />
      </div>

      {/* Centre — Navigation (33%) */}
      <nav className="w-1/3 flex justify-center">
        <ul className={`flex ${centerGapClass} list-none m-0 p-0`} style={{ whiteSpace: 'nowrap' }}>
          {centerNav.map(({ label, to }) => (
            <li key={label} style={{ whiteSpace: 'nowrap' }}>
              <a
                href={to}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(to);
                }}
                className="font-medium"
                style={{
                  color: '#fff',
                  fontSize: scrolled ? centerFontSize.scrolled : centerFontSize.base,
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

      {/* Droite — Icône utilisateur + Burger menu (33%) */}
      <div className="w-1/3 flex items-center justify-end gap-3 pr-4">
        <a
          href={profileHref}
          onClick={(e) => {
            e.preventDefault();
            navigate(profileHref);
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
            <img
              src={user?.avatar ?? nameToAvatarUrl(displayName)}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </a>

        {showMessages && (
          <button
            onClick={() => navigate('/messages')}
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              width: scrolled ? '32px' : '40px',
              height: scrolled ? '32px' : '40px',
              border: '1.5px solid rgba(255, 255, 255, 0.7)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              transition: 'width 0.3s ease, height 0.3s ease, background-color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
            aria-label="Messagerie"
          >
            <FiMail size={scrolled ? 18 : 22} color="#fff" />
          </button>
        )}

        <div className="relative" ref={rightMenuRef}>
          <button
            onClick={() => setRightMenuOpen((o) => !o)}
            className="flex flex-col justify-center gap-[5px] p-1 ml-1"
            aria-label="Menu utilisateur"
          >
            <BurgerIcon open={rightMenuOpen} />
          </button>

          <SidePanel
            side="right"
            open={rightMenuOpen}
            scrolled={scrolled}
            width={rightPanelWidth}
            darkerOverlay={onCategoriePage}
          >
            <div
              className={rightVariant === 'compact' ? 'flex flex-col pt-2' : 'flex flex-col'}
              style={rightVariant === 'stretch' ? { height: rightHeightPercent } : undefined}
            >
              {rightMenuItems.map((item, idx) => (
                <PanelLink
                  key={item.label}
                  href={item.to || '#'}
                  onClick={() => handleMenuClick(item)}
                  scrolled={scrolled}
                  stretch={rightVariant === 'stretch'}
                  danger={item.danger}
                  borderTop={rightVariant === 'compact' && idx === rightMenuItems.length - 1}
                >
                  {item.label}
                </PanelLink>
              ))}
            </div>
          </SidePanel>
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
