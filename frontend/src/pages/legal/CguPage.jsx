import { Trans, useTranslation } from 'react-i18next';
import LegalLayout, { LegalSection } from './LegalLayout.jsx';

// Conditions Générales d'Utilisation — règles d'usage de la plateforme
// (les conditions financières relèvent des CGV).
function CguPage() {
  const { t } = useTranslation();

  return (
    <LegalLayout
      title={t('cguPage.title')}
      pageTitle={t('cguPage.pageTitle')}
      updated={t('cguPage.updated')}
    >
      <LegalSection title={t('cguPage.s1.title')}>
        <p>{t('cguPage.s1.p1')}</p>
        <p>
          <Trans
            i18nKey="cguPage.s1.p2"
            components={{ cgv: <a href="/cgv" className="text-sky-300 hover:underline" /> }}
          />
        </p>
      </LegalSection>

      <LegalSection title={t('cguPage.s2.title')}>
        <p>
          <Trans i18nKey="cguPage.s2.p1" components={{ renter: <strong />, owner: <strong /> }} />
        </p>
        <p>{t('cguPage.s2.p2')}</p>
      </LegalSection>

      <LegalSection title={t('cguPage.s3.title')}>
        <p>{t('cguPage.s3.p1')}</p>
      </LegalSection>

      <LegalSection title={t('cguPage.s4.title')}>
        <p>{t('cguPage.s4.p1')}</p>
        <p>{t('cguPage.s4.p2')}</p>
      </LegalSection>

      <LegalSection title={t('cguPage.s5.title')}>
        <p>{t('cguPage.s5.p1')}</p>
      </LegalSection>

      <LegalSection title={t('cguPage.s6.title')}>
        <p>{t('cguPage.s6.p1')}</p>
      </LegalSection>

      <LegalSection title={t('cguPage.s7.title')}>
        <p>{t('cguPage.s7.p1')}</p>
      </LegalSection>

      <LegalSection title={t('cguPage.s8.title')}>
        <p>{t('cguPage.s8.p1')}</p>
      </LegalSection>

      <LegalSection title={t('cguPage.s9.title')}>
        <p>{t('cguPage.s9.p1')}</p>
      </LegalSection>

      <LegalSection title={t('cguPage.s10.title')}>
        <p>{t('cguPage.s10.p1')}</p>
      </LegalSection>
    </LegalLayout>
  );
}

export default CguPage;
