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
    { to: '/admin/logs', label: t('adminLayout.nav.logs') },
    { to: '/admin/taches', label: t('adminLayout.nav.tasks'), end: true },
    { to: '/admin/taches/programmation', label: t('adminLayout.nav.taskSchedule') },
    { to: '/admin/compte', label: t('adminLayout.nav.account') },
  ];
  const activeItem =
    nav.find((item) =>
      item.end
        ? location.pathname === item.to
        : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
    ) ?? nav[0];

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);
  return (
    // Même univers visuel que les autres pages : photo plein écran sous un
    // voile noir transparent et panneaux en verre dépoli.
    <div
      className="relative min-h-screen overflow-x-clip bg-cover bg-fixed bg-center text-white"
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
      <div className="min-h-screen w-full bg-black/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-[100px] pb-10 lg:flex-row">
          {/* Menu : barre horizontale défilable sur mobile, colonne à partir de lg. */}
          <aside className="w-full lg:w-60 lg:shrink-0" style={slide(0)}>
            <nav
              aria-label={t('adminLayout.navAria')}
              className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-xl lg:sticky lg:top-[6rem]"
            >
              <button
                type="button"
                aria-expanded={mobileNavOpen}
                aria-controls="admin-dashboard-navigation"
                aria-label={t('adminLayout.navAria')}
                onClick={() => setMobileNavOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 lg:hidden"
              >
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-white/60">
                  {t('adminLayout.title')}
                </span>
                <span className="ml-auto flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold text-white">
                    {activeItem.label}
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className={`h-5 w-5 shrink-0 text-white/70 transition-transform duration-200 ${
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

              <p className="hidden px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-white/60 lg:block">
                {t('adminLayout.title')}
              </p>
              <div
                id="admin-dashboard-navigation"
                className={`${mobileNavOpen ? 'flex' : 'hidden'} mt-2 flex-col gap-1 border-t border-white/15 pt-2 lg:mt-0 lg:flex lg:border-0 lg:pt-0`}
              >
                {nav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `block w-full rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        isActive
                          ? 'bg-sky-500 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
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
