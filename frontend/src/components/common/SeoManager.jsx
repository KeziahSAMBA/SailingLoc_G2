import { useEffect } from 'react';
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

function updateHomeStructuredData(pathname, siteOrigin) {
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
        inLanguage: 'fr-FR',
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

function getSiteOrigin() {
  const configuredOrigin = import.meta.env.VITE_SITE_URL?.trim();

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, '');
  }

  return window.location.origin;
}

function SeoManager({ location }) {
  useEffect(() => {
    const seo = resolveSeo(location.pathname);
    const siteOrigin = getSiteOrigin();
    const canonicalUrl = new URL(seo.canonicalPath, `${siteOrigin}/`).toString();

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
    updateHomeStructuredData(location.pathname, siteOrigin);
  }, [location.pathname]);

  return null;
}

export default SeoManager;
