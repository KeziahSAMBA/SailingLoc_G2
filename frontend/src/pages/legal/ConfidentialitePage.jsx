import { Trans, useTranslation } from 'react-i18next';
import { useCookieConsent } from '../../hooks/useCookieConsent.jsx';
import LegalLayout, { LegalSection } from './LegalLayout.jsx';

// Politique de confidentialité (RGPD + recommandations CNIL).
// La section cookies documente exactement ce que fait la bannière de
// consentement (CookieConsentContext) et permet de rouvrir le panneau.
function ConfidentialitePage() {
  const { t } = useTranslation();
  const { openPreferences } = useCookieConsent();

  return (
    <LegalLayout
      title={t('confidentialitePage.title')}
      pageTitle={t('confidentialitePage.pageTitle')}
      updated={t('confidentialitePage.updated')}
    >
      <LegalSection title={t('confidentialitePage.s1.title')}>
        <p>
          <Trans
            i18nKey="confidentialitePage.s1.p1"
            components={{
              email: (
                <a href="mailto:dpo@sailingloc.fr" className="text-action-soft hover:underline" />
              ),
            }}
          />
        </p>
      </LegalSection>

      <LegalSection title={t('confidentialitePage.s2.title')}>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Trans i18nKey="confidentialitePage.s2.li1" components={{ strong: <strong /> }} />
          </li>
          <li>
            <Trans i18nKey="confidentialitePage.s2.li2" components={{ strong: <strong /> }} />
          </li>
          <li>
            <Trans i18nKey="confidentialitePage.s2.li3" components={{ strong: <strong /> }} />
          </li>
          <li>
            <Trans i18nKey="confidentialitePage.s2.li4" components={{ strong: <strong /> }} />
          </li>
          <li>
            <Trans i18nKey="confidentialitePage.s2.li5" components={{ strong: <strong /> }} />
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t('confidentialitePage.s3.title')}>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Trans i18nKey="confidentialitePage.s3.li1" components={{ strong: <strong /> }} />
          </li>
          <li>
            <Trans i18nKey="confidentialitePage.s3.li2" components={{ strong: <strong /> }} />
          </li>
          <li>
            <Trans i18nKey="confidentialitePage.s3.li3" components={{ strong: <strong /> }} />
          </li>
          <li>
            <Trans i18nKey="confidentialitePage.s3.li4" components={{ strong: <strong /> }} />
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t('confidentialitePage.s4.title')}>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('confidentialitePage.s4.li1')}</li>
          <li>{t('confidentialitePage.s4.li2')}</li>
          <li>{t('confidentialitePage.s4.li3')}</li>
          <li>{t('confidentialitePage.s4.li4')}</li>
          <li>
            <Trans
              i18nKey="confidentialitePage.s4.li5"
              components={{ strong1: <strong />, strong2: <strong />, strong3: <strong /> }}
            />
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t('confidentialitePage.s5.title')}>
        <p>
          <Trans i18nKey="confidentialitePage.s5.p1" components={{ strong: <strong /> }} />
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Trans i18nKey="confidentialitePage.s5.li1" components={{ strong: <strong /> }} />
          </li>
          <li>
            <Trans i18nKey="confidentialitePage.s5.li2" components={{ strong: <strong /> }} />
          </li>
          <li>
            <Trans i18nKey="confidentialitePage.s5.li3" components={{ strong: <strong /> }} />
          </li>
        </ul>
        <p>
          <Trans
            i18nKey="confidentialitePage.s5.p2"
            components={{
              button: (
                <button
                  type="button"
                  onClick={openPreferences}
                  className="font-medium text-action-soft hover:underline"
                />
              ),
            }}
          />
        </p>
      </LegalSection>

      <LegalSection title={t('confidentialitePage.s6.title')}>
        <p>{t('confidentialitePage.s6.p1')}</p>
      </LegalSection>

      <LegalSection title={t('confidentialitePage.s7.title')}>
        <p>{t('confidentialitePage.s7.p1')}</p>
        <p>
          <Trans i18nKey="confidentialitePage.s7.p2" components={{ strong: <strong /> }} />
        </p>
      </LegalSection>

      <LegalSection title={t('confidentialitePage.s8.title')}>
        <p>
          <Trans
            i18nKey="confidentialitePage.s8.p1"
            components={{
              email: (
                <a href="mailto:dpo@sailingloc.fr" className="text-action-soft hover:underline" />
              ),
            }}
          />
        </p>
        <p>
          <Trans i18nKey="confidentialitePage.s8.p2" components={{ strong: <strong /> }} />
        </p>
        <p>
          <Trans
            i18nKey="confidentialitePage.s8.p3"
            components={{
              strong: <strong />,
              email: (
                <a href="mailto:dpo@sailingloc.fr" className="text-action-soft hover:underline" />
              ),
            }}
          />
        </p>
        <p>
          <Trans
            i18nKey="confidentialitePage.s8.p4"
            components={{
              cnil: (
                <a
                  href="https://www.cnil.fr/fr/plaintes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-action-soft hover:underline"
                />
              ),
            }}
          />
        </p>
      </LegalSection>

      <LegalSection title={t('confidentialitePage.s9.title')}>
        <p>{t('confidentialitePage.s9.p1')}</p>
      </LegalSection>
    </LegalLayout>
  );
}

export default ConfidentialitePage;
