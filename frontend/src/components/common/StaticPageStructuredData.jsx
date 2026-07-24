import { useEffect } from 'react';

function StaticPageStructuredData({ id, buildData }) {
  useEffect(() => {
    const configuredOrigin = import.meta.env.VITE_SITE_URL?.trim().replace(/\/+$/, '');
    const siteOrigin = configuredOrigin || window.location.origin;
    const scriptId = `sailingloc-${id}-structured-data`;
    const script = document.createElement('script');

    document.getElementById(scriptId)?.remove();
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(buildData(siteOrigin));
    document.head.appendChild(script);

    return () => script.remove();
  }, [buildData, id]);

  return null;
}

export default StaticPageStructuredData;
