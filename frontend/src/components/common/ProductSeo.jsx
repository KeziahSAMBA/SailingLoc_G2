import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { buildProductSeo } from '../../utils/productSeo.js';

function setMeta(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
}

function ProductSeo({ boat, boatsLoaded, typeLabel }) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'fr';

  useEffect(() => {
    if (!boatsLoaded) return undefined;

    if (!boat) {
      document.documentElement.lang = language;
      document.title =
        language === 'en' ? 'Boat not found | SailingLoc' : 'Bateau introuvable | SailingLoc';
      setMeta('meta[name="description"]', {
        name: 'description',
        content:
          language === 'en'
            ? 'This listing does not exist or is no longer available on SailingLoc.'
            : "Cette annonce n'existe pas ou n'est plus disponible sur SailingLoc.",
      });
      setMeta('meta[name="robots"]', {
        name: 'robots',
        content: 'noindex, nofollow',
      });
      return undefined;
    }

    const configuredOrigin = import.meta.env.VITE_SITE_URL?.trim().replace(/\/+$/, '');
    const siteOrigin = configuredOrigin || window.location.origin;
    const seo = buildProductSeo(boat, typeLabel, siteOrigin, language);

    document.documentElement.lang = language;
    document.title = seo.title;
    setMeta('meta[name="description"]', {
      name: 'description',
      content: seo.description,
    });
    setMeta('meta[name="robots"]', {
      name: 'robots',
      content: 'index, follow',
    });
    setMeta('meta[property="og:title"]', {
      property: 'og:title',
      content: seo.title,
    });
    setMeta('meta[property="og:description"]', {
      property: 'og:description',
      content: seo.description,
    });
    setMeta('meta[property="og:type"]', {
      property: 'og:type',
      content: 'product',
    });
    setMeta('meta[property="og:url"]', {
      property: 'og:url',
      content: seo.canonicalUrl,
    });
    setMeta('meta[property="og:locale"]', {
      property: 'og:locale',
      content: language === 'en' ? 'en_GB' : 'fr_FR',
    });
    setMeta('meta[name="twitter:title"]', {
      name: 'twitter:title',
      content: seo.title,
    });
    setMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: seo.description,
    });

    if (seo.image) {
      setMeta('meta[property="og:image"]', {
        property: 'og:image',
        content: seo.image,
      });
      setMeta('meta[name="twitter:image"]', {
        name: 'twitter:image',
        content: seo.image,
      });
      setMeta('meta[name="twitter:card"]', {
        name: 'twitter:card',
        content: 'summary_large_image',
      });
    }

    const canonical = document.head.querySelector('link[rel="canonical"]');
    canonical?.setAttribute('href', seo.canonicalUrl);

    const script = document.createElement('script');
    script.id = 'sailingloc-product-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(seo.structuredData);
    document.getElementById(script.id)?.remove();
    document.head.appendChild(script);

    return () => {
      script.remove();
      document.head.querySelector('meta[property="og:image"]')?.remove();
      document.head.querySelector('meta[name="twitter:image"]')?.remove();
    };
  }, [boat, boatsLoaded, language, typeLabel]);

  return null;
}

export default ProductSeo;
