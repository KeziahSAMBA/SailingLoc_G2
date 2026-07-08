import DashboardHeader from './DashboardHeader.jsx';

const NAV_PROPRIO = ['Voir mes bateaux', 'Publier un bateau'];

const CENTER_NAV = [
  { label: 'Mes publications', to: '/' },
  { label: 'Contact', to: '/contact' },
  { label: 'À propos', to: '/a-propos' },
];

const USER_MENU_ITEMS = [
  { label: 'Mon dashboard', to: '/proprietaire' },
  { label: 'Mon compte', to: '/proprietaire/compte' },
  { label: 'Mes documents', to: '/proprietaire/documents' },
  { label: 'Mes réservations', to: '/proprietaire/reservations' },
  { label: 'Mes revenus', to: '/proprietaire/revenus' },
  { label: 'Mes bateaux', to: '/proprietaire/bateaux' },
  { label: 'Déconnexion', action: 'logout', danger: true },
];

function HeaderProprio() {
  return (
    <DashboardHeader
      leftGroups={[{ items: NAV_PROPRIO, heightPercent: '28%' }]}
      centerNav={CENTER_NAV}
      profileHref="/proprietaire/compte"
      rightMenuItems={USER_MENU_ITEMS}
      rightVariant="stretch"
      rightHeightPercent="77%"
      showMessages
      messagesTo="/proprietaire/messages"
    />
  );
}

export default HeaderProprio;
