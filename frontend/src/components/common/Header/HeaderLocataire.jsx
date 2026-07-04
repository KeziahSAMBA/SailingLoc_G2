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
  { label: 'Mon dashboard', to: '/locataire' },
  { label: 'Compte', to: '/locataire/compte' },
  { label: 'Mes documents', to: '/locataire/documents' },
  { label: 'Mes réservations', to: '/locataire/reservations' },
  { label: 'Favoris', to: '/locataire/favoris' },
  { label: 'Déconnexion', action: 'logout', danger: true },
];

function HeaderLocataire() {
  return (
    <DashboardHeader
      leftGroups={[{ items: NAV_LOCATAIRE, heightPercent: '55%' }]}
      centerNav={CENTER_NAV}
      profileHref="/locataire/compte"
      rightMenuItems={USER_MENU_ITEMS}
      rightVariant="stretch"
      rightHeightPercent="65%"
      showMessages
    />
  );
}

export default HeaderLocataire;
