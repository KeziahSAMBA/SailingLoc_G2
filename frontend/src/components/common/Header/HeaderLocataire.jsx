import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardHeader from './DashboardHeader.jsx';

function HeaderLocataire() {
  const { t } = useTranslation();
  const location = useLocation();
  const onCategoriePage = location.pathname === '/categorie';
  const onProductPage =
    location.pathname === '/product' || location.pathname.startsWith('/product/');

  const navLocataire = [
    { label: t('headerLocataire.nav.search'), anchor: 'hero' },
    { label: t('headerLocataire.nav.suggestions'), anchor: 'suggestions' },
    { label: t('headerLocataire.nav.tutorial'), anchor: 'tutoriel' },
    { label: t('headerLocataire.nav.whyUs'), anchor: 'proposition-valeur' },
    { label: t('headerLocataire.nav.reviews'), anchor: 'avis' },
  ];

  const navLocataireCategory = [
    { label: t('headerLocataire.navCategory.boats'), anchor: 'top', path: '/categorie' },
    {
      label: t('headerLocataire.navCategory.suggestions'),
      anchor: 'suggestions',
      path: '/categorie',
    },
    { label: t('headerLocataire.navCategory.reviews'), anchor: 'avis', path: '/categorie' },
  ];

  const navLocataireProduct = [
    {
      label: t('headerLocataire.navProduct.booking'),
      anchor: 'top',
      path: location.pathname,
    },
    {
      label: t('headerLocataire.navProduct.specs'),
      anchor: 'specifications',
      path: location.pathname,
    },
    { label: t('headerLocataire.navProduct.reviews'), anchor: 'avis', path: location.pathname },
    {
      label: t('headerLocataire.navProduct.location'),
      anchor: 'localisation',
      path: location.pathname,
    },
    {
      label: t('headerLocataire.navProduct.suggestions'),
      anchor: 'suggestions',
      path: location.pathname,
    },
  ];

  const centerNav = [
    { label: t('headerLocataire.center.discover'), to: '/categorie' },
    { label: t('headerLocataire.center.contact'), to: '/contact' },
    { label: t('headerLocataire.center.about'), to: '/a-propos' },
  ];

  const userMenuItems = [
    { label: t('headerLocataire.menu.dashboard'), to: '/locataire' },
    { label: t('headerLocataire.menu.account'), to: '/locataire/compte' },
    { label: t('headerLocataire.menu.documents'), to: '/locataire/documents' },
    { label: t('headerLocataire.menu.reservations'), to: '/locataire/reservations' },
    { label: t('headerLocataire.menu.favorites'), to: '/locataire/favoris' },
    { label: t('headerLocataire.menu.logout'), action: 'logout', danger: true },
  ];

  const navItems = onProductPage
    ? navLocataireProduct
    : onCategoriePage
      ? navLocataireCategory
      : navLocataire;

  return (
    <DashboardHeader
      leftGroups={[{ items: navItems, heightPercent: onCategoriePage ? '41%' : '69%' }]}
      centerNav={centerNav}
      profileHref="/locataire/compte"
      rightMenuItems={userMenuItems}
      rightVariant="stretch"
      rightHeightPercent="65%"
      showMessages
      messagesTo="/locataire/messages"
    />
  );
}

export default HeaderLocataire;
