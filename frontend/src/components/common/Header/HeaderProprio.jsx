import { useTranslation } from 'react-i18next';
import DashboardHeader from './DashboardHeader.jsx';

function HeaderProprio() {
  const { t } = useTranslation();

  const navProprio = [t('headerProprio.nav.myBoats'), t('headerProprio.nav.publish')];

  const centerNav = [
    { label: t('headerProprio.center.publications'), to: '/' },
    { label: t('headerProprio.center.contact'), to: '/contact' },
    { label: t('headerProprio.center.about'), to: '/a-propos' },
  ];

  const userMenuItems = [
    { label: t('headerProprio.menu.dashboard'), to: '/proprietaire' },
    { label: t('headerProprio.menu.account'), to: '/proprietaire/compte' },
    { label: t('headerProprio.menu.documents'), to: '/proprietaire/documents' },
    { label: t('headerProprio.menu.reservations'), to: '/proprietaire/reservations' },
    { label: t('headerProprio.menu.transactions'), to: '/proprietaire/revenus' },
    { label: t('headerProprio.menu.boats'), to: '/proprietaire/bateaux' },
    { label: t('headerProprio.menu.logout'), action: 'logout', danger: true },
  ];

  return (
    <DashboardHeader
      leftGroups={[{ items: navProprio, heightPercent: '28%' }]}
      centerNav={centerNav}
      profileHref="/proprietaire/compte"
      rightMenuItems={userMenuItems}
      rightVariant="stretch"
      rightHeightPercent="77%"
      showMessages
      messagesTo="/proprietaire/messages"
    />
  );
}

export default HeaderProprio;
