import { useTranslation } from 'react-i18next';
import DashboardHeader from './DashboardHeader.jsx';

function HeaderProprio() {
  const { t } = useTranslation();

  const navProprio = [t('headerProprio.nav.myBoats'), t('headerProprio.nav.publish')];

  const centerNav = [
    { label: t('headerProprio.center.publications'), to: '/' },
    { label: t('headerProprio.center.contact'), anchor: 'contact' },
    { label: t('headerProprio.center.about'), to: '/a-propos' },
  ];

  const userMenuItems = [
    { label: t('headerProprio.menu.dashboard'), to: '/dashboard' },
    { label: t('headerProprio.menu.account'), to: '/account' },
    { label: t('headerProprio.menu.documents'), to: '/documents' },
    { label: t('headerProprio.menu.reservations'), to: '/dashboard' },
    { label: t('headerProprio.menu.transactions'), to: '/dashboard' },
    { label: t('headerProprio.menu.boats'), to: '/dashboard' },
    { label: t('headerProprio.menu.logout'), action: 'logout', danger: true },
  ];

  return (
    <DashboardHeader
      leftGroups={[{ items: navProprio, heightPercent: '28%' }]}
      centerNav={centerNav}
      profileHref="/account"
      rightMenuItems={userMenuItems}
      rightVariant="stretch"
      rightHeightPercent="77%"
      showMessages
    />
  );
}

export default HeaderProprio;
