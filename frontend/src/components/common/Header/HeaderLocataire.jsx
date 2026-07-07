import { useLocation } from 'react-router-dom';
import DashboardHeader from './DashboardHeader.jsx';

const NAV_LOCATAIRE = [
  { label: 'Chercher une location', anchor: 'hero' },
  { label: 'Nos suggestions', anchor: 'suggestions' },
  { label: 'Tutoriel', anchor: 'tutoriel' },
  { label: 'Pourquoi nous choisir ?', anchor: 'proposition-valeur' },
  { label: 'Avis & commentaires', anchor: 'avis' },
];

const NAV_LOCATAIRE_CATEGORY = [
  { label: 'Nos bateaux', anchor: 'resultats', path: '/categorie' },
  { label: 'Nos suggestions', anchor: 'suggestions', path: '/categorie' },
  { label: 'Avis & commentaires', anchor: 'avis', path: '/categorie' },
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
  const location = useLocation();
  const onCategoriePage = location.pathname === '/categorie';
  const navItems = onCategoriePage ? NAV_LOCATAIRE_CATEGORY : NAV_LOCATAIRE;

  return (
    <DashboardHeader
      leftGroups={[{ items: navItems, heightPercent: onCategoriePage ? '41%' : '69%' }]}
      centerNav={CENTER_NAV}
      profileHref="/locataire/compte"
      rightMenuItems={USER_MENU_ITEMS}
      rightVariant="stretch"
      rightHeightPercent="65%"
      showMessages
      messagesTo="/locataire/messages"
    />
  );
}

export default HeaderLocataire;
