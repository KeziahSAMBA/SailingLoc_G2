import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function StaticPageStructuredData({ id, buildData }) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'fr';

  useEffect(() => {
    const configuredOrigin = import.meta.env.VITE_SITE_URL?.trim().replace(/\/+$/, '');
    const siteOrigin = configuredOrigin || window.location.origin;
    const scriptId = `sailingloc-${id}-structured-data`;
    const script = document.createElement('script');

    document.getElementById(scriptId)?.remove();
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(buildData(siteOrigin, language));
    document.head.appendChild(script);

    return () => script.remove();
  }, [buildData, id, language]);

  return null;
}

export default StaticPageStructuredData;
