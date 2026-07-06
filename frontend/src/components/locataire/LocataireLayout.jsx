import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function LocataireLayout() {
  const { t } = useTranslation();
  const nav = [
    { to: '/locataire', label: t('locataireLayout.nav.dashboard'), end: true },
    { to: '/locataire/compte', label: t('locataireLayout.nav.account') },
    { to: '/locataire/documents', label: t('locataireLayout.nav.documents') },
    { to: '/locataire/reservations', label: t('locataireLayout.nav.reservations') },
    { to: '/locataire/favoris', label: t('locataireLayout.nav.favorites') },
    { to: '/locataire/messages', label: t('locataireLayout.nav.messages') },
  ];

  return (
    // Fond sombre : indispensable pour que le texte blanc du header reste lisible.
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-[100px] pb-10 lg:flex-row">
        {/* Menu : pleine largeur sur mobile (barre horizontale défilable),
            colonne latérale à partir de lg. */}
        <aside className="w-full lg:w-60 lg:shrink-0">
          <nav
            aria-label={t('locataireLayout.navAria')}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 lg:sticky lg:top-[96px]"
          >
            <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('locataireLayout.mySpace')}
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
                        ? 'bg-[#0A3172] text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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
  );
}

export default LocataireLayout;
