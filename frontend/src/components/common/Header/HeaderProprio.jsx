import DashboardHeader from './DashboardHeader.jsx';

const NAV_PROPRIO = ['Voir mes bateaux', 'Publier un bateau'];

const CENTER_NAV = [
  { label: 'Mes publications', to: '/' },
  { label: 'Contact', to: '/contact' },
  { label: 'À propos', to: '/a-propos' },
];

const USER_MENU_ITEMS = [
  { label: 'Mon dashboard', to: '/dashboard' },
  { label: 'Mon compte', to: '/account' },
  { label: 'Mes documents', to: '/documents' },
  { label: 'Mes réservations', to: '/dashboard' },
  { label: 'Mes transactions', to: '/dashboard' },
  { label: 'Mes bateaux', to: '/dashboard' },
  { label: 'Déconnexion', action: 'logout', danger: true },
];

function HeaderProprio() {
  return (
    <DashboardHeader
      leftGroups={[{ items: NAV_PROPRIO, heightPercent: '28%' }]}
      centerNav={CENTER_NAV}
      profileHref="/account"
      rightMenuItems={USER_MENU_ITEMS}
      rightVariant="stretch"
      rightHeightPercent="77%"
      showMessages
    />
  );
}

export default HeaderProprio;
