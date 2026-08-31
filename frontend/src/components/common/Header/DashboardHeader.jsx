import { Fragment, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiMail } from 'react-icons/fi';
import { useAuth } from '../../../hooks/useAuth.jsx';
import {
  useCategoryNavigate,
  useHomeNavigate,
  useIntroHeaderReveal,
  CATEGORY_ENTER_TOTAL,
  INTRO_SOFT_EASING,
} from '../../../hooks/useCategoryTransition.js';
import {
  usePageExitNavigate,
  EXIT_TRANSITION_PAGES,
  isOnDashboardPage,
} from '../../../hooks/usePageTransition.js';
import { getUnreadCount } from '../../../services/messageService.js';
import { nameToAvatarUrl } from '../../../utils/avatar.js';
import { useScrolled } from './shared/useScrolled.js';
import { useClickOutside } from './shared/useClickOutside.js';
import HeaderLogo from './shared/HeaderLogo.jsx';
import BurgerIcon from './shared/BurgerIcon.jsx';
import SidePanel from './shared/SidePanel.jsx';
import PanelLink from './shared/PanelLink.jsx';
import { LANGUAGES } from './shared/languages.js';
import { getAboutNavigationItems } from './shared/aboutNavigation.js';
import { getContactNavigationItems } from './shared/contactNavigation.js';
import SafeImage from '../SafeImage.jsx';

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
  // Destination de l'icône messagerie (l'admin a sa page dédiée).
  messagesTo = '/messages',
  languageAsFlags = true,
  // Révélation d'en haut à la première connexion (locataire/propriétaire) —
  // désactivée pour l'admin, qui n'en a pas besoin.
  introReveal = true,
}) {
  const { t, i18n } = useTranslation();
  const scrolled = useScrolled();
  const [navOpen, setNavOpen] = useState(false);
  const [rightMenuOpen, setRightMenuOpen] = useState(false);
  const navRef = useRef(null);
  const rightMenuRef = useRef(null);
  const location = useLocation();
  // Route les liens vers /categorie (resp. l'accueil) à travers la transition
  // animée depuis l'accueil (resp. /categorie) ; toute autre destination est
  // naviguée normalement.
  const categoryNavigate = useCategoryNavigate();
  const goHome = useHomeNavigate();
  const pageExitNavigate = usePageExitNavigate();
  // Pendant l'intro de première visite, le header attend caché au-dessus de
  // l'écran et descend à la révélation.
  const introHidden = useIntroHeaderReveal(introReveal);
  const onCategoriePage = location.pathname === '/categorie';
  const onAboutPage = location.pathname === '/a-propos';
  const onContactPage = location.pathname === '/contact';
  const contextualNavigationItems = onAboutPage
    ? getAboutNavigationItems(t)
    : onContactPage
      ? getContactNavigationItems(t)
      : null;
  const resolvedLeftGroups =
    contextualNavigationItems && leftGroups
      ? [
          {
            items: contextualNavigationItems,
            heightPercent: onAboutPage ? '41%' : onContactPage ? '55%' : '69%',
          },
        ]
      : leftGroups;
  const onProductPage =
    location.pathname === '/product' || location.pathname.startsWith('/product/');
  const { user, logout } = useAuth();
  // Badge de messages non lus sur l'icône messagerie : rafraîchi à chaque
  // navigation ET en direct quand un fil est lu (événement émis par la
  // messagerie, qui vit sur la même page).
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!showMessages || !user) return undefined;
    const refresh = () =>
      getUnreadCount()
        .then((res) => setUnread(res.data.unread || 0))
        .catch(() => setUnread(0));
    refresh();
    window.addEventListener('sailingloc:messages-read', refresh);
    // Quasi temps réel : un message entrant fait apparaître le badge en ~5 s,
    // où qu'on soit dans le dashboard (même rythme que la messagerie).
    const interval = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener('sailingloc:messages-read', refresh);
      clearInterval(interval);
    };
  }, [showMessages, user, location.pathname]);

  const displayName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';

  useClickOutside([
    [navRef, () => setNavOpen(false)],
    [rightMenuRef, () => setRightMenuOpen(false)],
  ]);

  function handleLogout() {
    setRightMenuOpen(false);
    // logout() avant la navigation (comportement volontairement instantané,
    // sans glissade) : différer l'effacement de la session pour animer la
    // sortie ferait courir le nouveau home connecté (HomePageProprio) le
    // temps de son propre fondu d'arrivée, puis basculerait brutalement vers
    // la home invité une fois la session réellement coupée — un à-coup pire
    // que l'absence d'animation.
    logout();
    pageExitNavigate('/', { replace: true });
  }

  function handleMenuClick(item) {
    setRightMenuOpen(false);
    setNavOpen(false);
    if (item.action === 'logout') handleLogout();
    else if (item.to) pageExitNavigate(item.to);
  }

  function scrollToAnchor(anchor, targetPath = '/') {
    setNavOpen(false);
    const scroll = () => {
      if (anchor === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    };
    if (location.pathname === targetPath) {
      scroll();
    } else {
      pageExitNavigate(targetPath);
      setTimeout(scroll, 300);
    }
  }

  function handleLogoClick(e) {
    e.preventDefault();
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (
      EXIT_TRANSITION_PAGES.includes(location.pathname) ||
      isOnDashboardPage(location.pathname)
    ) {
      pageExitNavigate('/');
    } else {
      goHome();
    }
  }

  function handleCenterNavClick({ to, anchor }) {
    setNavOpen(false);
    if (anchor) {
      scrollToAnchor(anchor, location.pathname);
    } else if (to === location.pathname) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (
      EXIT_TRANSITION_PAGES.includes(location.pathname) ||
      EXIT_TRANSITION_PAGES.includes(to) ||
      (to === '/' && isOnDashboardPage(location.pathname))
    ) {
      pageExitNavigate(to);
    } else {
      categoryNavigate(to);
    }
  }

  return (
    <header
      className="fixed top-0 left-0 z-50 flex w-full items-center px-4 sm:px-6 lg:px-12"
      style={{
        height: scrolled ? '60px' : 'clamp(64px, 6vw, 80px)',
        transform: introHidden ? 'translateY(-110%)' : 'none',
        transition: `height 0.3s ease, transform ${CATEGORY_ENTER_TOTAL}ms ${INTRO_SOFT_EASING}`,
      }}
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
          backgroundColor: scrolled ? 'rgba(10, 49, 114, 0.95)' : 'rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(90, 180, 236, 0.2)',
          boxShadow: scrolled ? '0 2px 12px rgba(10, 49, 114, 0.08)' : 'none',
          transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
        }}
      />

      {/* Gauche — Burger nav + Logo (33%) */}
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 lg:w-1/3 lg:flex-none lg:pl-4">
        {resolvedLeftGroups && (
          <div className="relative" ref={navRef}>
            <button
              onClick={() => setNavOpen((o) => !o)}
              className="flex flex-col justify-center gap-[5px] p-1"
              aria-label={t('dashboardHeader.menuAria')}
            >
              <BurgerIcon open={navOpen} />
            </button>

            <SidePanel
              side="left"
              open={navOpen}
              scrolled={scrolled}
              width="260px"
              darkerOverlay={onCategoriePage || onProductPage}
            >
              <div className="h-full overflow-y-auto">
                <div className="flex flex-col border-b border-white/15 py-2 lg:hidden">
                  {centerNav.map((item) => (
                    <PanelLink
                      key={item.label}
                      scrolled={scrolled}
                      onClick={() => handleCenterNavClick(item)}
                    >
                      {item.label}
                    </PanelLink>
                  ))}
                </div>
                {resolvedLeftGroups.map((group, groupIdx) => (
                  <Fragment key={groupIdx}>
                    <div className="flex flex-col" style={{ height: group.heightPercent }}>
                      {group.items.map((item) => {
                        const label = typeof item === 'string' ? item : item.label;
                        const anchor = typeof item === 'string' ? null : item.anchor;
                        const path = typeof item === 'string' ? '/' : (item.path ?? '/');
                        return (
                          <PanelLink
                            key={label}
                            scrolled={scrolled}
                            stretch
                            onClick={anchor ? () => scrollToAnchor(anchor, path) : undefined}
                          >
                            {label}
                          </PanelLink>
                        );
                      })}
                    </div>
                    {groupIdx < resolvedLeftGroups.length - 1 && (
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

        <HeaderLogo scrolled={scrolled} onClick={handleLogoClick} />
      </div>

      {/* Centre — Navigation (33%) */}
      <nav className="hidden w-1/3 justify-center lg:flex">
        <ul className={`flex ${centerGapClass} list-none m-0 p-0`} style={{ whiteSpace: 'nowrap' }}>
          {centerNav.map(({ label, to, anchor }) => (
            <li key={label} style={{ whiteSpace: 'nowrap' }}>
              <a
                href={anchor ? `#${anchor}` : to}
                onClick={(e) => {
                  e.preventDefault();
                  handleCenterNavClick({ to, anchor });
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

      {/* Droite — Langue + Icône utilisateur + Burger menu (33%) */}
      <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-3 lg:w-1/3 lg:flex-none lg:pr-4">
        <div className="hidden items-center gap-2.5 md:flex">
          {languageAsFlags
            ? LANGUAGES.map(({ code, Flag, label }) => (
                <button
                  key={code}
                  onClick={() => i18n.changeLanguage(code)}
                  aria-label={label}
                  title={label}
                  className="rounded-[3px] overflow-hidden transition-transform hover:scale-110"
                  style={{
                    width: scrolled ? '20px' : '24px',
                    height: scrolled ? '14px' : '17px',
                    opacity: i18n.language === code ? 1 : 0.45,
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.4)',
                    transition:
                      'width 0.3s ease, height 0.3s ease, opacity 0.2s ease, transform 0.2s ease',
                  }}
                >
                  <Flag className="w-full h-full block" />
                </button>
              ))
            : LANGUAGES.map(({ code }, i) => (
                <span key={code} className="flex items-center gap-1">
                  {i === 1 && (
                    <span style={{ color: '#fff', opacity: 0.4, fontSize: '0.9rem' }}>/</span>
                  )}
                  <button
                    onClick={() => i18n.changeLanguage(code)}
                    className="px-1 font-medium"
                    style={{
                      color: '#fff',
                      opacity: i18n.language === code ? 1 : 0.45,
                      fontWeight: i18n.language === code ? 700 : 500,
                      fontSize: scrolled ? '0.7rem' : '0.75rem',
                      backgroundImage: 'linear-gradient(#fff, #fff)',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '0% 1px',
                      backgroundPosition: '0 100%',
                      paddingBottom: '2px',
                      transition: 'font-size 0.3s ease, background-size 0.35s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundSize = '100% 1px')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundSize = '0% 1px')}
                  >
                    {code.toUpperCase()}
                  </button>
                </span>
              ))}
        </div>

        <a
          href={profileHref}
          onClick={(e) => {
            e.preventDefault();
            pageExitNavigate(profileHref);
          }}
          className="flex items-center gap-2 sm:gap-3"
          style={{ textDecoration: 'none' }}
        >
          <span
            className="hidden xl:inline"
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
              width: scrolled ? '32px' : 'clamp(34px, 4vw, 40px)',
              height: scrolled ? '32px' : 'clamp(34px, 4vw, 40px)',
              border: '1.5px solid rgba(255, 255, 255, 0.7)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              transition: 'width 0.3s ease, height 0.3s ease, background-color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
          >
            <SafeImage
              src={user?.avatar ?? nameToAvatarUrl(displayName)}
              alt={displayName}
              fallbackSrc={nameToAvatarUrl(displayName)}
              fallback={null}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </a>

        {showMessages && (
          <button
            onClick={() => pageExitNavigate(messagesTo)}
            className="relative rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              width: scrolled ? '32px' : 'clamp(34px, 4vw, 40px)',
              height: scrolled ? '32px' : 'clamp(34px, 4vw, 40px)',
              transition: 'width 0.3s ease, height 0.3s ease, opacity 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
            aria-label={t('dashboardHeader.messagesAria')}
          >
            <FiMail size={scrolled ? 18 : 22} color="#fff" />
            {unread > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5AB4EC] px-1 text-[10px] font-bold text-slate-950"
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        )}

        <div className="relative" ref={rightMenuRef}>
          <button
            onClick={() => setRightMenuOpen((o) => !o)}
            className="flex flex-col justify-center gap-[5px] p-1 ml-1"
            aria-label={t('dashboardHeader.userMenuAria')}
          >
            <BurgerIcon open={rightMenuOpen} />
          </button>

          <SidePanel
            side="right"
            open={rightMenuOpen}
            scrolled={scrolled}
            width={rightPanelWidth}
            darkerOverlay={onCategoriePage || onProductPage}
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
