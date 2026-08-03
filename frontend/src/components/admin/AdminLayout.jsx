import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bgImage from '../../assets/image/paysage/dashboard_bg.jpg';

function AdminLayout() {
  const { t } = useTranslation();
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
    { to: '/admin/compte', label: t('adminLayout.nav.account') },
  ];
  return (
    // Même univers visuel que les autres pages : photo plein écran sous un
    // voile noir transparent et panneaux en verre dépoli.
    <div
      className="min-h-screen bg-cover bg-fixed bg-center text-white"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="min-h-screen w-full bg-black/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-[100px] pb-10 lg:flex-row">
          {/* Menu : barre horizontale défilable sur mobile, colonne à partir de lg. */}
          <aside className="w-full lg:w-60 lg:shrink-0">
            <nav
              aria-label={t('adminLayout.navAria')}
              className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-xl lg:sticky lg:top-[96px]"
            >
              <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-white/60">
                {t('adminLayout.title')}
              </p>
              <div className="flex gap-1 overflow-x-auto lg:flex-col">
                {nav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `block shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition lg:shrink ${
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
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
