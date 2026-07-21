import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bgImage from '../../assets/image/paysage/crique.jpg';

function LocataireLayout() {
  const { t } = useTranslation();
  const nav = [
    { to: '/locataire', label: t('locataireLayout.nav.dashboard'), end: true },
    { to: '/locataire/compte', label: t('locataireLayout.nav.account') },
    { to: '/locataire/documents', label: t('locataireLayout.nav.documents') },
    { to: '/locataire/reservations', label: t('locataireLayout.nav.reservations') },
    { to: '/locataire/depenses', label: t('locataireLayout.nav.expenses') },
    { to: '/locataire/favoris', label: t('locataireLayout.nav.favorites') },
    { to: '/locataire/messages', label: t('locataireLayout.nav.messages') },
  ];

  return (
    // Même univers visuel que l'accueil et la page produit : photo plein écran
    // sous un voile sombre (contraste des textes) et panneaux en verre dépoli.
    <div
      className="min-h-screen bg-cover bg-fixed bg-center text-white"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Voile dégradé accroché au viewport comme la photo : renforcé en haut,
          où le ciel clair rendait laiteuses les cartes en verre au scroll. */}
      <div className="min-h-screen w-full bg-fixed bg-gradient-to-b from-slate-950/90 via-slate-950/75 to-slate-950/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-[100px] pb-10 lg:flex-row">
          {/* Menu : pleine largeur sur mobile (barre horizontale défilable),
            colonne latérale à partir de lg. */}
          <aside className="w-full lg:w-60 lg:shrink-0">
            <nav
              aria-label={t('locataireLayout.navAria')}
              className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-xl lg:sticky lg:top-[96px]"
            >
              <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-white/60">
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
