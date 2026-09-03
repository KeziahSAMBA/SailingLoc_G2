import { Trans, useTranslation } from 'react-i18next';
import LegalLayout, { LegalSection } from './LegalLayout.jsx';

// Conditions Générales de Vente — conditions financières de la mise en
// relation : réservation, prix, commission, paiement, annulation.
// Cohérentes avec la FAQ de la page contact (commission 10 %, annulation…).
function CgvPage() {
  const { t } = useTranslation();

  return (
    <LegalLayout
      title={t('cgvPage.title')}
      pageTitle={t('cgvPage.pageTitle')}
      updated={t('cgvPage.updated')}
    >
      <LegalSection title={t('cgvPage.s1.title')}>
        <p>
          <Trans
            i18nKey="cgvPage.s1.p1"
            components={{ cgu: <a href="/cgu" className="text-action-soft hover:underline" /> }}
          />
        </p>
      </LegalSection>

      <LegalSection title={t('cgvPage.s2.title')}>
        <p>{t('cgvPage.s2.p1')}</p>
      </LegalSection>

      <LegalSection title={t('cgvPage.s3.title')}>
        <p>
          <Trans i18nKey="cgvPage.s3.p1" components={{ strong: <strong /> }} />
        </p>
      </LegalSection>

      <LegalSection title={t('cgvPage.s4.title')}>
        <p>
          <Trans i18nKey="cgvPage.s4.p1" components={{ em: <em /> }} />
        </p>
      </LegalSection>

      <LegalSection title={t('cgvPage.s5.title')}>
        <p>{t('cgvPage.s5.p1')}</p>
      </LegalSection>

      <LegalSection title={t('cgvPage.s6.title')}>
        <p>
          <Trans i18nKey="cgvPage.s6.p1" components={{ strong: <strong /> }} />
        </p>
        <p>
          <Trans i18nKey="cgvPage.s6.p2" components={{ strong: <strong /> }} />
        </p>
        <p>
          <Trans i18nKey="cgvPage.s6.p3" components={{ strong: <strong /> }} />
        </p>
      </LegalSection>

      <LegalSection title={t('cgvPage.s7.title')}>
        <p>{t('cgvPage.s7.p1')}</p>
      </LegalSection>

      <LegalSection title={t('cgvPage.s8.title')}>
        <p>{t('cgvPage.s8.p1')}</p>
      </LegalSection>

      <LegalSection title={t('cgvPage.s9.title')}>
        <p>
          <Trans
            i18nKey="cgvPage.s9.p1"
            components={{
              odr: (
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-action-soft hover:underline"
                />
              ),
            }}
          />
        </p>
      </LegalSection>

      <LegalSection title={t('cgvPage.s10.title')}>
        <p>{t('cgvPage.s10.p1')}</p>
      </LegalSection>
    </LegalLayout>
  );
}

export default CgvPage;
