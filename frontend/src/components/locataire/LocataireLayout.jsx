import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bgImage from '../../assets/image/paysage/dashboard_bg.jpg';

function LocataireLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const nav = [
    { to: '/locataire', label: t('locataireLayout.nav.dashboard'), end: true },
    { to: '/locataire/compte', label: t('locataireLayout.nav.account') },
    { to: '/locataire/documents', label: t('locataireLayout.nav.documents') },
    { to: '/locataire/reservations', label: t('locataireLayout.nav.reservations') },
    { to: '/locataire/depenses', label: t('locataireLayout.nav.expenses') },
    { to: '/locataire/favoris', label: t('locataireLayout.nav.favorites') },
    { to: '/locataire/messages', label: t('locataireLayout.nav.messages') },
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
    // voile noir transparent (contraste des textes) et panneaux en verre dépoli.
    <div
      className="min-h-screen bg-cover bg-fixed bg-center text-white"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Voile dégradé accroché au viewport comme la photo : renforcé en haut,
          où le ciel clair rendait laiteuses les cartes en verre au scroll. */}
      <div className="min-h-screen w-full bg-fixed bg-gradient-to-b from-slate-950/90 via-slate-950/75 to-slate-950/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-[6.25rem] pb-10 lg:max-w-none lg:flex-row lg:px-16">
      <div className="min-h-screen w-full bg-black/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-[100px] pb-10 lg:flex-row">
          {/* Menu : pleine largeur sur mobile (barre horizontale défilable),
            colonne latérale à partir de lg. */}
          <aside className="w-full lg:w-60 lg:shrink-0">
            <nav
              aria-label={t('locataireLayout.navAria')}
              className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-xl lg:sticky lg:top-[6rem]"
            >
              <button
                type="button"
                aria-expanded={mobileNavOpen}
                aria-controls="locataire-dashboard-navigation"
                aria-label={t('locataireLayout.navAria')}
                onClick={() => setMobileNavOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 lg:hidden"
              >
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-white/60">
                  {t('locataireLayout.mySpace')}
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
                {t('locataireLayout.mySpace')}
              </p>
              <div
                id="locataire-dashboard-navigation"
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

          {/* Zone de contenu */}
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default LocataireLayout;
