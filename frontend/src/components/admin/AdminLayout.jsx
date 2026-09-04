import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bgImage from '../../assets/image/paysage/dashboard_bg.jpg';
import contactBg from '../../assets/image/paysage/contact_bg.jpg';
import aboutBg from '../../assets/image/paysage/about_bg.jpg';
import legalBg from '../../assets/image/portrait/cgu.jpg';
import { usePageSlideTransition } from '../../hooks/usePageTransition.js';
import {
  PAGE_SLIDE_CSS,
  PHOTO_OVERLAY_STATIC_PAGE,
  NAV_ENTER_TOTAL,
} from '../../hooks/useCategoryTransition.js';

// Cascade d'entrée/sortie du tableau de bord : 0 menu latéral, 1 zone de
// contenu — même rythme que les autres pages navigables (cf.
// useCategoryTransition.js).
const ADMIN_ENTER_TOTAL = NAV_ENTER_TOTAL;

// Vers ces pages, notre photo de fond fait un crossfade vers la leur avant de
// naviguer — raccord invisible, comme entre Contact/À propos/légal. (Pas
// /admin/login : route autonome, exclue de STATIC_EXIT_AWARE_PAGES.)
const ADMIN_STATIC_BG_TARGETS = {
  '/contact': contactBg,
  '/a-propos': aboutBg,
  '/mentions-legales': legalBg,
  '/cgu': legalBg,
  '/cgv': legalBg,
  '/politique-de-confidentialite': legalBg,
};

const ADMIN_OUTLET_CONTEXT = { compactPagination: true };

function AdminLayout() {
  const { t } = useTranslation();
  const { slide, exitBgSrc } = usePageSlideTransition(ADMIN_ENTER_TOTAL, {
    ownBg: bgImage,
    staticBgTargets: ADMIN_STATIC_BG_TARGETS,
  });
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [supervisionPinned, setSupervisionPinned] = useState(false);
  const [supervisionHovered, setSupervisionHovered] = useState(false);
  const supervision = [
    { to: '/admin/logs', label: t('adminLayout.nav.logs') },
    { to: '/admin/taches', label: t('adminLayout.nav.tasks'), end: true },
    { to: '/admin/taches/programmation', label: t('adminLayout.nav.taskSchedule') },
  ];
  const nav = [
    { to: '/admin', label: t('adminLayout.nav.dashboard'), end: true },
    { to: '/admin/spectateur', label: t('adminLayout.nav.viewRenter'), end: true },
    { to: '/admin/spectateur/proprietaire', label: t('adminLayout.nav.viewOwner') },
    { to: '/admin/users', label: t('adminLayout.nav.users') },
    { to: '/admin/comments', label: t('adminLayout.nav.comments') },
    { to: '/admin/publications', label: t('adminLayout.nav.publication') },
    { to: '/admin/documents', label: t('adminLayout.nav.documents') },
    { to: '/admin/bookings', label: t('adminLayout.nav.bookings') },
    { to: '/admin/ports', label: t('adminLayout.nav.ports') },
    { to: '/admin/transactions', label: t('adminLayout.nav.transaction') },
    { to: '/admin/messages', label: t('adminLayout.nav.messages') },
    { to: '/admin/contact', label: t('adminLayout.nav.contact') },
    { group: 'supervision', label: t('adminLayout.nav.supervision'), children: supervision },
    { to: '/admin/compte', label: t('adminLayout.nav.account') },
  ];

  const matches = (item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

  const flatNav = nav.flatMap((item) => item.children ?? [item]);
  const activeItem = flatNav.find(matches) ?? flatNav[0];
  const supervisionActive = supervision.some(matches);
  const supervisionOpen = supervisionHovered || supervisionPinned || mobileNavOpen;

  useEffect(() => {
    setMobileNavOpen(false);
    setSupervisionPinned(false);
    setSupervisionHovered(false);
  }, [location.pathname]);
  return (
    // Même univers visuel que les autres pages : photo plein écran sous un
    // voile noir transparent et panneaux en verre dépoli.
    <div
      className="relative min-h-screen overflow-x-clip bg-cover bg-fixed bg-center text-on-dark"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <style>{PAGE_SLIDE_CSS}</style>
      {/* Crossfade vers le fond de la destination pendant la sortie : se pose
          derrière les blocs (qui glissent hors écran par-dessus) et atterrit
          à pleine opacité pile pour le montage réel de la page cible, qui
          utilise nativement cette même image. */}
      {exitBgSrc && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `${PHOTO_OVERLAY_STATIC_PAGE}, url(${exitBgSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            animation: `pageBgFadeIn ${ADMIN_ENTER_TOTAL}ms ease forwards`,
          }}
        />
      )}
      <div className="min-h-screen w-full bg-overlay/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-[100px] pb-10 lg:flex-row">
          {/* Menu : barre horizontale défilable sur mobile, colonne à partir de lg. */}
          <aside className="relative z-30 w-full lg:w-60 lg:shrink-0" style={slide(0)}>
            <nav
              aria-label={t('adminLayout.navAria')}
              className="rounded-2xl border border-glass/20 bg-surface/10 p-3 backdrop-blur-xl lg:sticky lg:top-[6rem]"
            >
              <button
                type="button"
                aria-expanded={mobileNavOpen}
                aria-controls="admin-dashboard-navigation"
                aria-label={t('adminLayout.navAria')}
                onClick={() => setMobileNavOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2 text-left transition hover:bg-surface/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-bright lg:hidden"
              >
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-on-dark/60">
                  {t('adminLayout.title')}
                </span>
                <span className="ml-auto flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold text-on-dark">
                    {activeItem.label}
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className={`h-5 w-5 shrink-0 text-on-dark/70 transition-transform duration-200 ${
                      mobileNavOpen ? 'rotate-180' : ''
                    }`}
                  >
                    <path
                      d="m5 7.5 5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              <p className="hidden px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-on-dark/60 lg:block">
                {t('adminLayout.title')}
              </p>
              <div
                id="admin-dashboard-navigation"
                className={`${mobileNavOpen ? 'flex' : 'hidden'} mt-2 flex-col gap-1 border-t border-glass/15 pt-2 lg:mt-0 lg:flex lg:border-0 lg:pt-0`}
              >
                {nav.map((item) =>
                  item.children ? (
                    <div
                      key={item.group}
                      className="lg:relative"
                      onMouseEnter={() => setSupervisionHovered(true)}
                      onMouseLeave={() => {
                        setSupervisionHovered(false);
                        setSupervisionPinned(false);
                      }}
                      onKeyDown={(e) => e.key === 'Escape' && setSupervisionPinned(false)}
                    >
                      <button
                        type="button"
                        aria-expanded={supervisionOpen}
                        aria-controls="admin-nav-supervision"
                        onClick={() => setSupervisionPinned((pinned) => !pinned)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-bright ${
                          supervisionActive
                            ? 'bg-surface/15 text-on-dark'
                            : 'text-on-dark/80 hover:bg-surface/10 hover:text-on-dark'
                        }`}
                      >
                        {item.label}
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          fill="none"
                          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                            supervisionOpen ? 'rotate-180' : ''
                          }`}
                        >
                          <path
                            d="m5 7.5 5 5 5-5"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <div
                        id="admin-nav-supervision"
                        className={`${supervisionOpen ? 'flex' : 'hidden'} mt-1 flex-col gap-1 border-l border-glass/15 pl-2 lg:absolute lg:left-full lg:top-0 lg:z-20 lg:mt-0 lg:w-56 lg:border-l-0 lg:pl-3`}
                      >
                        <div className="flex flex-col gap-1 lg:rounded-2xl lg:border lg:border-glass/20 lg:bg-overlay/40 lg:shadow-2xl lg:backdrop-blur-xl">
                          <div className="flex flex-col gap-1 lg:rounded-2xl lg:bg-surface/10 lg:p-3">
                            {item.children.map((child) => (
                              <NavLink
                                key={child.to}
                                to={child.to}
                                end={child.end}
                                className={({ isActive }) =>
                                  `block w-full rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-bright ${
                                    isActive
                                      ? 'bg-action text-action-text non-color-active'
                                      : 'text-on-dark/80 hover:bg-surface/10 hover:text-on-dark'
                                  }`
                                }
                              >
                                {child.label}
                              </NavLink>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `block w-full rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-bright ${
                          isActive
                            ? 'bg-action text-action-text non-color-active'
                            : 'text-on-dark/80 hover:bg-surface/10 hover:text-on-dark'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  )
                )}
              </div>
            </nav>
          </aside>

          {/* Zone de contenu droite */}
          <main className="min-w-0 flex-1" style={slide(1, 'right')}>
            <Outlet context={ADMIN_OUTLET_CONTEXT} />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
