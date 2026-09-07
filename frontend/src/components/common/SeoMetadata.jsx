import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createSeoStructuredData, createSeoTags, getSeoMetadata } from '../../utils/seoMetadata.js';
import { applyMetaTags, removeManagedHeadTags } from '../../utils/seoHead.js';

/**
 * Gère les balises SEO des routes déjà présentes, sans modifier le rendu de
 * la page. Le composant est rendu une fois dans App et, pour un produit,
 * une seconde fois dans ProductPage avec les données déjà chargées.
 */
function SeoMetadata({ product = null, productMode = false }) {
  const location = useLocation();
  const { i18n } = useTranslation();
  const language = i18n.language === 'en' ? 'en' : 'fr';

  useEffect(() => {
    const isProductRoute =
      location.pathname === '/product' || /^\/product\/[^/]+$/.test(location.pathname);
    if (productMode !== isProductRoute) return undefined;
    if (!productMode && isProductRoute) return undefined;

    const metadata = getSeoMetadata(location.pathname, { language, product });
    const tags = createSeoTags(metadata, {
      origin: window.location.origin,
      pathname: location.pathname,
      language,
    });
    const structuredData = createSeoStructuredData(metadata, {
      origin: window.location.origin,
      pathname: location.pathname,
      language,
      product,
    });
    applyMetaTags(tags, structuredData);

    return () => {
      removeManagedHeadTags();
    };
  }, [language, location.pathname, product, productMode]);

  return null;
}

export default SeoMetadata;
