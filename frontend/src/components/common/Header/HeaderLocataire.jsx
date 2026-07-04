import DashboardHeader from './DashboardHeader.jsx';

const NAV_LOCATAIRE = [
  'Chercher une location',
  'Tutoriel',
  'Nos suggestions',
  'Avis & commentaires',
];

const CENTER_NAV = [
  { label: 'Découvrir', to: '/categorie' },
  { label: 'Contact', to: '/contact' },
  { label: 'À propos', to: '/a-propos' },
];

const USER_MENU_ITEMS = [
  { label: 'Mon dashboard', to: '/dashboard' },
  { label: 'Mon compte', to: '/account' },
  { label: 'Mes documents', to: '/documents' },
  { label: 'Mes réservations', to: '/dashboard' },
  { label: 'Mes favoris', to: '/dashboard' },
  { label: 'Déconnexion', action: 'logout', danger: true },
];

function HeaderLocataire() {
  return (
    <DashboardHeader
      leftGroups={[{ items: NAV_LOCATAIRE, heightPercent: '55%' }]}
      centerNav={CENTER_NAV}
      profileHref="/account"
      rightMenuItems={USER_MENU_ITEMS}
      rightVariant="stretch"
      rightHeightPercent="65%"
      showMessages
    />
  );
}

export default HeaderLocataire;
