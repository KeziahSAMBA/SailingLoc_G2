import DashboardHeader from './DashboardHeader.jsx';

const CENTER_NAV = [
  { label: 'Vue locataire', to: '/admin/spectateur' },
  { label: 'Dashboard admin', to: '/admin' },
  { label: 'Vue propriétaire', to: '/admin/spectateur/proprietaire' },
];

const ADMIN_MENU_ITEMS = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Utilisateurs', to: '/admin/users' },
  { label: 'Commentaires', to: '/admin/comments' },
  { label: 'Publication', to: '/admin/publications' },
  { label: 'Documents', to: '/admin/documents' },
  { label: 'Réservations', to: '/admin/bookings' },
  { label: 'Ports', to: '/admin/ports' },
  { label: 'Transaction', to: '/admin/transactions' },
  { label: 'Messagerie', to: '/admin/messages' },
  { label: 'Compte', to: '/admin/compte' },
  { label: 'Déconnexion', action: 'logout', danger: true },
];

function HeaderAdmin() {
  return (
    <DashboardHeader
      centerNav={CENTER_NAV}
      centerGapClass="gap-6 xl:gap-20"
      centerFontSize={{ scrolled: '0.85rem', base: '1rem' }}
      profileHref="/admin"
      rightMenuItems={ADMIN_MENU_ITEMS}
      rightVariant="compact"
      rightPanelWidth="17.5rem"
      showMessages
      messagesTo="/admin/messages"
      introReveal={false}
    />
  );
}

export default HeaderAdmin;
