import { Trans, useTranslation } from 'react-i18next';
import LegalLayout, { LegalSection } from './LegalLayout.jsx';

// Mentions légales (art. 6-III de la loi n° 2004-575 « LCEN »).
// Entité fictive — projet pédagogique (voir l'avertissement du layout).
function MentionsLegalesPage() {
  const { t } = useTranslation();

  return (
    <LegalLayout
      title={t('mentionsLegalesPage.title')}
      pageTitle={t('mentionsLegalesPage.pageTitle')}
      updated={t('mentionsLegalesPage.updated')}
    >
      <LegalSection title={t('mentionsLegalesPage.s1.title')}>
        <p>
          <Trans
            i18nKey="mentionsLegalesPage.s1.p1"
            components={{ site: <strong />, company: <strong /> }}
          />
        </p>
        <p>
          {t('mentionsLegalesPage.s1.address')}
          <br />
          {t('mentionsLegalesPage.s1.phoneLine')}
          <br />
          <Trans
            i18nKey="mentionsLegalesPage.s1.emailLine"
            components={{
              email: (
                <a href="mailto:contact@sailingloc.fr" className="text-sky-300 hover:underline" />
              ),
            }}
          />
        </p>
      </LegalSection>

      <LegalSection title={t('mentionsLegalesPage.s2.title')}>
        <p>{t('mentionsLegalesPage.s2.p1')}</p>
      </LegalSection>

      <LegalSection title={t('mentionsLegalesPage.s3.title')}>
        <p>
          <Trans
            i18nKey="mentionsLegalesPage.s3.p1"
            components={{ strong: <strong />, muted: <span className="text-on-dark/50" /> }}
          />
        </p>
      </LegalSection>

      <LegalSection title={t('mentionsLegalesPage.s4.title')}>
        <p>{t('mentionsLegalesPage.s4.p1')}</p>
        <p>{t('mentionsLegalesPage.s4.p2')}</p>
      </LegalSection>

      <LegalSection title={t('mentionsLegalesPage.s5.title')}>
        <p>
          <Trans
            i18nKey="mentionsLegalesPage.s5.p1"
            components={{
              privacy: (
                <a href="/politique-de-confidentialite" className="text-sky-300 hover:underline" />
              ),
            }}
          />
        </p>
      </LegalSection>

      <LegalSection title={t('mentionsLegalesPage.s6.title')}>
        <p>
          <Trans
            i18nKey="mentionsLegalesPage.s6.p1"
            components={{ contact: <a href="/contact" className="text-sky-300 hover:underline" /> }}
          />
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

export default MentionsLegalesPage;
