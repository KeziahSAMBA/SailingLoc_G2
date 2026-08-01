import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bgImage from '../../assets/image/paysage/dashboard_bg.jpg';

function ProprietaireLayout() {
  const { t } = useTranslation();
  const nav = [
    { to: '/proprietaire', label: t('proprietaireLayout.nav.dashboard'), end: true },
    { to: '/proprietaire/compte', label: t('proprietaireLayout.nav.account') },
    { to: '/proprietaire/documents', label: t('proprietaireLayout.nav.documents') },
    { to: '/proprietaire/reservations', label: t('proprietaireLayout.nav.reservations') },
    { to: '/proprietaire/avis', label: t('proprietaireLayout.nav.reviews') },
    { to: '/proprietaire/revenus', label: t('proprietaireLayout.nav.revenues') },
    { to: '/proprietaire/bateaux', label: t('proprietaireLayout.nav.boats') },
    { to: '/proprietaire/messages', label: t('proprietaireLayout.nav.messages') },
  ];

  return (
    // Même univers visuel que les autres pages : photo plein écran sous un
    // voile noir transparent (contraste des textes) et panneaux en verre dépoli.
    <div
      className="min-h-screen bg-cover bg-fixed bg-center text-white"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="min-h-screen w-full bg-black/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-[100px] pb-10 lg:flex-row">
          {/* Menu : pleine largeur sur mobile (barre horizontale défilable),
              colonne latérale à partir de lg. */}
          <aside className="w-full lg:w-60 lg:shrink-0">
            <nav
              aria-label={t('proprietaireLayout.navAria')}
              className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-xl lg:sticky lg:top-[96px]"
            >
              <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-white/60">
                {t('proprietaireLayout.mySpace')}
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

          {/* Zone de contenu */}
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default ProprietaireLayout;
