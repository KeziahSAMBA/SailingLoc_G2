import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveSeo } from '../../utils/seoConfig.js';

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
}

function upsertCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function updateHomeStructuredData(pathname, siteOrigin, language) {
  const scriptId = 'sailingloc-home-structured-data';
  let element = document.getElementById(scriptId);

  if (pathname !== '/') {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement('script');
    element.id = scriptId;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteOrigin}/#website`,
        url: `${siteOrigin}/`,
        name: 'SailingLoc',
        inLanguage: language === 'en' ? 'en-GB' : 'fr-FR',
      },
      {
        '@type': 'Organization',
        '@id': `${siteOrigin}/#organization`,
        name: 'SailingLoc',
        url: `${siteOrigin}/`,
        logo: `${siteOrigin}/favicon.webp`,
      },
    ],
  });
}

const BREADCRUMB_LABELS = {
  '/categorie': { fr: 'Catalogue', en: 'Catalogue' },
  '/contact': { fr: 'Contact et aide' },
  '/a-propos': { fr: 'À propos', en: 'About' },
  '/mentions-legales': { fr: 'Mentions légales' },
  '/cgu': { fr: "Conditions générales d'utilisation" },
  '/cgv': { fr: 'Conditions générales de vente' },
  '/politique-de-confidentialite': { fr: 'Politique de confidentialité' },
};

function updateBreadcrumbStructuredData(pathname, siteOrigin, language) {
  const scriptId = 'sailingloc-page-breadcrumb-structured-data';
  const labels = BREADCRUMB_LABELS[pathname];
  const label = labels?.[language] ?? labels?.fr;
  let element = document.getElementById(scriptId);

  if (!label) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement('script');
    element.id = scriptId;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: language === 'en' ? 'Home' : 'Accueil',
        item: `${siteOrigin}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: label,
        item: `${siteOrigin}${pathname}`,
      },
    ],
  });
}

function getSiteOrigin() {
  const configuredOrigin = import.meta.env.VITE_SITE_URL?.trim();

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, '');
  }

  return window.location.origin;
}

function SeoManager({ location }) {
  const { i18n } = useTranslation();
  const requestedLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'fr';

  useEffect(() => {
    const seo = resolveSeo(location.pathname, requestedLanguage);
    const siteOrigin = getSiteOrigin();
    const canonicalUrl = new URL(seo.canonicalPath, `${siteOrigin}/`).toString();

    document.documentElement.lang = seo.language;
    document.title = seo.title;
    upsertMeta('meta[name="description"]', {
      name: 'description',
      content: seo.description,
    });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: seo.robots,
    });
    upsertMeta('meta[property="og:title"]', {
      property: 'og:title',
      content: seo.title,
    });
    upsertMeta('meta[property="og:description"]', {
      property: 'og:description',
      content: seo.description,
    });
    upsertMeta('meta[property="og:type"]', {
      property: 'og:type',
      content: 'website',
    });
    upsertMeta('meta[property="og:url"]', {
      property: 'og:url',
      content: canonicalUrl,
    });
    upsertMeta('meta[property="og:locale"]', {
      property: 'og:locale',
      content: seo.language === 'en' ? 'en_GB' : 'fr_FR',
    });
    upsertMeta('meta[name="twitter:card"]', {
      name: 'twitter:card',
      content: 'summary',
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: 'twitter:title',
      content: seo.title,
    });
    upsertMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: seo.description,
    });
    upsertCanonical(canonicalUrl);
    updateHomeStructuredData(location.pathname, siteOrigin, seo.language);
    updateBreadcrumbStructuredData(location.pathname, siteOrigin, seo.language);
  }, [location.pathname, requestedLanguage]);

  return null;
}

export default SeoManager;
