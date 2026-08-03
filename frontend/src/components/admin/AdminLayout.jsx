import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bgImage from '../../assets/image/paysage/crique.jpg';

const ADMIN_OUTLET_CONTEXT = { compactPagination: true };

function AdminLayout() {
  const { t } = useTranslation();
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
    // Même univers visuel que les espaces propriétaire et locataire : photo
    // plein écran sous un voile sombre et panneaux en verre dépoli.
    <div
      className="min-h-screen bg-cover bg-fixed bg-center text-white"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="min-h-screen w-full bg-fixed bg-gradient-to-b from-slate-950/90 via-slate-950/75 to-slate-950/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-[6.25rem] pb-10 lg:max-w-none lg:flex-row lg:px-16">
          {/* Menu : barre horizontale défilable sur mobile, colonne à partir de lg. */}
          <aside className="w-full lg:w-60 lg:shrink-0">
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
          <main className="min-w-0 flex-1">
            <Outlet context={ADMIN_OUTLET_CONTEXT} />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
