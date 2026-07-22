import { useTranslation } from 'react-i18next';
import SpectatorFrame from './SpectatorFrame.jsx';

function AdminSpectateurProprietairePage() {
  const { t } = useTranslation();
  return (
    <SpectatorFrame
      mode="proprietaire"
      title={t('adminSpectator.ownerTitle')}
      description={t('adminSpectator.ownerDesc')}
      banner={
        <>
          👁️ {t('adminSpectator.bannerLead')} <strong>{t('adminSpectator.ownerRole')}</strong>{' '}
          {t('adminSpectator.bannerRest')}
        </>
      }
    />
  );
}

export default AdminSpectateurProprietairePage;
