import { useTranslation } from 'react-i18next';
import SpectatorFrame from './SpectatorFrame.jsx';

function AdminSpectateurLocatairePage() {
  const { t } = useTranslation();
  return (
    <SpectatorFrame
      mode="locataire"
      title={t('adminSpectator.renterTitle')}
      description={t('adminSpectator.renterDesc')}
      banner={
        <>
          👁️ {t('adminSpectator.bannerLead')} <strong>{t('adminSpectator.renterRole')}</strong>{' '}
          {t('adminSpectator.bannerRest')}
        </>
      }
    />
  );
}

export default AdminSpectateurLocatairePage;
