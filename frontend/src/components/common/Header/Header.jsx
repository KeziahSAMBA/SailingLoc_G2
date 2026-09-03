import { useId, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth.jsx';
import {
  useCategoryNavigate,
  useHomeNavigate,
  useIntroHeaderReveal,
} from '../../../hooks/useCategoryTransition.js';
import { usePageExitNavigate, EXIT_TRANSITION_PAGES } from '../../../hooks/usePageTransition.js';
import { useScrolled } from './shared/useScrolled.js';
import { useClickOutside } from './shared/useClickOutside.js';
import { scrollToAnchor as scrollToAnchorBase } from './shared/scrollToAnchor.js';
import { hoverUnderlineStyle, hoverUnderlineHandlers } from './shared/hoverUnderline.js';
import { hoverBackground } from './shared/hoverBackground.js';
import { HeaderDropdown, HeaderDropdownItem } from './shared/HeaderDropdown.jsx';
import HeaderShell from './shared/HeaderShell.jsx';
import HeaderLogo from './shared/HeaderLogo.jsx';
import BurgerIcon from './shared/BurgerIcon.jsx';
import SidePanel from './shared/SidePanel.jsx';
import PanelLink from './shared/PanelLink.jsx';
import SettingsMenu from './shared/SettingsMenu.jsx';
import { getAboutNavigationItems } from './shared/aboutNavigation.js';
import { getContactNavigationItems } from './shared/contactNavigation.js';

function getBurgerItems(t) {
  return [
    { label: t('header.burger.search'), anchor: 'hero' },
    { label: t('header.burger.suggestions'), anchor: 'suggestions' },
    { label: t('header.burger.tutorial'), anchor: 'tutoriel' },
    { label: t('header.burger.whyUs'), anchor: 'proposition-valeur' },
    { label: t('header.burger.reviews'), anchor: 'avis' },
  ];
}

function getCategoryBurgerItems(t) {
  return [
    { label: t('header.burgerCategory.boats'), anchor: 'top' },
    { label: t('header.burgerCategory.suggestions'), anchor: 'suggestions' },
    { label: t('header.burgerCategory.reviews'), anchor: 'avis' },
  ];
}

function getProductBurgerItems(t) {
  return [
    { label: t('header.burgerProduct.booking'), anchor: 'top' },
    { label: t('header.burgerProduct.specs'), anchor: 'specifications' },
    { label: t('header.burgerProduct.reviews'), anchor: 'avis' },
    { label: t('header.burgerProduct.location'), anchor: 'localisation' },
    { label: t('header.burgerProduct.suggestions'), anchor: 'suggestions' },
  ];
}

function getNavLinks(t) {
  return [
    [t('header.nav.discover'), '/categorie'],
    [t('header.nav.contact'), '/contact'],
    [t('header.nav.about'), '/a-propos'],
  ];
}

const UserIcon = ({ size }) => (
  <span
    className="flex flex-shrink-0 items-center justify-center rounded-full max-sm:!h-auto max-sm:!w-auto max-sm:!border-0"
    style={{
      width: size,
      height: size,
      border: '1px solid rgba(255, 255, 255, 0.6)',
      transition: 'width 0.3s ease, height 0.3s ease',
    }}
  >
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      className="max-sm:!h-5 max-sm:!w-5"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  </span>
);

const ChevronDown = ({ open }) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fff"
    strokeWidth="2"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

function getAuthBtnStyle(scrolled) {
  return {
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
    fontSize: scrolled ? '0.75rem' : '0.80rem',
    padding: scrolled ? '5px 14px' : '7px 16px',
    transition: 'font-size 0.3s ease, padding 0.3s ease, background-color 0.2s, border-color 0.2s',
  };
}

const authBtnHover = hoverBackground('rgba(255, 255, 255, 0.15)', 'transparent', {
  hover: '#fff',
  base: 'rgba(255, 255, 255, 0.5)',
});

function Header() {
  const { t } = useTranslation();
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuRef = useRef(null);
  const userMenuRef = useRef(null);
  const settingsPanelRef = useRef(null);
  const idBase = useId().replace(/[^a-zA-Z0-9_-]/g, '-');
  const menuPanelId = `${idBase}-public-menu`;
  const location = useLocation();
  const goToCategory = useCategoryNavigate();
  const goHome = useHomeNavigate();
  const pageExitNavigate = usePageExitNavigate();
  // Pendant l'intro de première visite, le header attend caché au-dessus de
  // l'écran et descend à la révélation.
  const introHidden = useIntroHeaderReveal();
  const { user, logout, loading: authLoading } = useAuth();

  useClickOutside([
    [menuRef, () => setMenuOpen(false)],
    [userMenuRef, () => setUserMenuOpen(false)],
  ]);

  function scrollToAnchor(anchor, targetPath = '/') {
    scrollToAnchorBase(anchor, targetPath, {
      pathname: location.pathname,
      pageExitNavigate,
      closeMenu: () => setMenuOpen(false),
    });
  }

  function handleLogout() {
    setUserMenuOpen(false);
    logout();
    pageExitNavigate('/', { replace: true });
  }

  function handleLogoClick(e) {
    e.preventDefault();
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (EXIT_TRANSITION_PAGES.includes(location.pathname)) {
      pageExitNavigate('/');
    } else {
      goHome();
    }
  }

  function handleNavClick(href) {
    setMenuOpen(false);
    if (href === '/categorie' && location.pathname === '/categorie') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (
      href === '/categorie' &&
      (location.pathname === '/' || location.pathname.startsWith('/product'))
    ) {
      goToCategory();
      return;
    }
    pageExitNavigate(href);
  }

  const iconSize = scrolled ? '14px' : '16px';
  const onCategoriePage = location.pathname === '/categorie';
  const onAboutPage = location.pathname === '/a-propos';
  const onContactPage = location.pathname === '/contact';
  const onProductPage =
    location.pathname === '/product' || location.pathname.startsWith('/product/');
  const burgerItems = onProductPage
    ? getProductBurgerItems(t)
    : onCategoriePage
      ? getCategoryBurgerItems(t)
      : onAboutPage
        ? getAboutNavigationItems(t)
        : onContactPage
          ? getContactNavigationItems(t)
          : getBurgerItems(t);

  return (
    <HeaderShell
      scrolled={scrolled}
      introHidden={introHidden}
      settingsOpen={settingsOpen}
      settingsPanelRef={settingsPanelRef}
    >
      {/* Gauche — Burger + Logo (33%) */}
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 lg:w-1/3 lg:flex-none lg:pl-4">
        {/* Burger */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex flex-col justify-center gap-[5px] p-1.5"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls={menuPanelId}
          >
            <BurgerIcon open={menuOpen} />
          </button>

          <SidePanel
            id={menuPanelId}
            side="left"
            open={menuOpen}
            scrolled={scrolled}
            width="min(320px, 86vw)"
            darkerOverlay={onCategoriePage || onProductPage}
          >
            <div className="flex h-full flex-col overflow-y-auto">
              <div
                className="flex flex-col py-2 lg:hidden"
                style={{
                  borderBottom: `1px solid ${scrolled ? 'rgba(10, 49, 114, 0.15)' : 'rgba(255, 255, 255, 0.2)'}`,
                }}
              >
                {getNavLinks(t).map(([label, href]) => (
                  <PanelLink
                    key={href}
                    scrolled={scrolled}
                    large
                    onClick={() => handleNavClick(href)}
                  >
                    {label}
                  </PanelLink>
                ))}
              </div>
              <div
                className="flex min-h-0 flex-1 flex-col"
                style={{
                  maxHeight: onCategoriePage || onAboutPage ? '41%' : onContactPage ? '55%' : '69%',
                }}
              >
                {burgerItems.map(({ label, anchor, path }) => (
                  <PanelLink
                    key={anchor}
                    scrolled={scrolled}
                    stretch
                    large={false}
                    onClick={() =>
                      scrollToAnchor(
                        anchor,
                        path ??
                          (onProductPage ? location.pathname : onCategoriePage ? '/categorie' : '/')
                      )
                    }
                  >
                    {label}
                  </PanelLink>
                ))}
              </div>
            </div>
          </SidePanel>
        </div>

        {/* Logo */}
        <HeaderLogo scrolled={scrolled} onClick={handleLogoClick} />
      </div>

      {/* Centre — Navigation (33%) */}
      <nav className="hidden w-1/3 justify-center lg:flex">
        <ul className="flex gap-10 list-none m-0 p-0">
          {getNavLinks(t).map(([label, href]) => (
            <li key={href}>
              <a
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(href);
                }}
                className="font-medium"
                style={hoverUnderlineStyle({ fontSize: scrolled ? '0.90rem' : '1.15rem' })}
                {...hoverUnderlineHandlers()}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Droite — Paramètres + Connexion (33%) */}
      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4 lg:w-1/3 lg:flex-none lg:pr-4">
        <SettingsMenu
          scrolled={scrolled}
          onOpenChange={setSettingsOpen}
          panelContainerRef={settingsPanelRef}
        />

        {authLoading ? (
          <div className="h-6 w-9 sm:w-[120px]" aria-hidden="true" />
        ) : user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full transition-all whitespace-nowrap max-sm:!border-0 max-sm:!p-3"
              style={getAuthBtnStyle(scrolled)}
              {...authBtnHover}
            >
              <UserIcon size={iconSize} />
              <span className="hidden sm:inline">{user.first_name}</span>
              <span className="hidden sm:inline">
                <ChevronDown open={userMenuOpen} />
              </span>
            </button>

            {userMenuOpen && (
              <HeaderDropdown>
                <HeaderDropdownItem
                  borderTop={false}
                  onClick={() => {
                    setUserMenuOpen(false);
                    pageExitNavigate(
                      user.role === 'admin'
                        ? '/admin'
                        : user.role === 'proprietaire'
                          ? '/proprietaire'
                          : '/locataire'
                    );
                  }}
                  icon={
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
                  }
                >
                  {t('header.auth.dashboard')}
                </HeaderDropdownItem>
                <HeaderDropdownItem
                  onClick={() => {
                    setUserMenuOpen(false);
                    pageExitNavigate(
                      user.role === 'admin'
                        ? '/admin'
                        : user.role === 'proprietaire'
                          ? '/proprietaire/compte'
                          : '/locataire/compte'
                    );
                  }}
                  icon={
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
                  }
                >
                  {t('header.auth.account')}
                </HeaderDropdownItem>
                {(user.role === 'locataire' || user.role === 'proprietaire') && (
                  <HeaderDropdownItem
                    onClick={() => {
                      setUserMenuOpen(false);
                      pageExitNavigate('/documents');
                    }}
                    icon={
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
                    }
                  >
                    {t('header.auth.documents')}
                  </HeaderDropdownItem>
                )}
                <HeaderDropdownItem
                  onClick={handleLogout}
                  danger
                  icon={
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
                  }
                >
                  {t('header.auth.logout')}
                </HeaderDropdownItem>
              </HeaderDropdown>
            )}
          </div>
        ) : (
          <button
            onClick={() => pageExitNavigate('/login', { state: { backgroundLocation: location } })}
            className="flex items-center gap-2 rounded-full transition-all whitespace-nowrap max-sm:!border-0 max-sm:!p-3"
            style={getAuthBtnStyle(scrolled)}
            {...authBtnHover}
          >
            <UserIcon size={iconSize} />
            <span className="hidden sm:inline">{t('header.auth.login')}</span>
          </button>
        )}
      </div>
    </HeaderShell>
  );
}

export default Header;
