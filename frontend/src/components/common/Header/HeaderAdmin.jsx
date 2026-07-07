import DashboardHeader from './DashboardHeader.jsx';

const CENTER_NAV = [
  { label: 'Vue locataire', to: '/admin/spectateur' },
  { label: 'Dashboard admin', to: '/admin' },
  { label: 'Vue propriétaire', to: '/admin/spectateur/proprietaire' },
];

const ADMIN_MENU_ITEMS = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Déconnexion', action: 'logout', danger: true },
];

function HeaderAdmin() {
  return (
    <DashboardHeader
      centerNav={CENTER_NAV}
      centerGapClass="gap-20"
      centerFontSize={{ scrolled: '0.85rem', base: '1rem' }}
      profileHref="/admin"
      rightMenuItems={ADMIN_MENU_ITEMS}
      rightVariant="compact"
      rightPanelWidth="280px"
      showMessages
      messagesTo="/admin/messages"
    />
  );
}

export default HeaderAdmin;
