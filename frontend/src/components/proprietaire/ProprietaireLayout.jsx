import { NavLink, Outlet } from 'react-router-dom';
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
const PROPRIETAIRE_ENTER_TOTAL = NAV_ENTER_TOTAL;

// Vers ces pages, notre photo de fond fait un crossfade vers la leur avant de
// naviguer — raccord invisible, comme entre Contact/À propos/légal.
const PROPRIETAIRE_STATIC_BG_TARGETS = {
  '/contact': contactBg,
  '/a-propos': aboutBg,
  '/mentions-legales': legalBg,
  '/cgu': legalBg,
  '/cgv': legalBg,
  '/politique-de-confidentialite': legalBg,
};

function ProprietaireLayout() {
  const { t } = useTranslation();
  const { slide, exitBgSrc } = usePageSlideTransition(PROPRIETAIRE_ENTER_TOTAL, {
    ownBg: bgImage,
    staticBgTargets: PROPRIETAIRE_STATIC_BG_TARGETS,
  });
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
            animation: `pageBgFadeIn ${PROPRIETAIRE_ENTER_TOTAL}ms ease forwards`,
          }}
        />
      )}
      <div className="min-h-screen w-full bg-black/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-[100px] pb-10 lg:flex-row">
          {/* Menu : pleine largeur sur mobile (barre horizontale défilable),
              colonne latérale à partir de lg. */}
          <aside className="w-full lg:w-60 lg:shrink-0" style={slide(0)}>
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
          <main className="min-w-0 flex-1" style={slide(1, 'right')}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default ProprietaireLayout;
