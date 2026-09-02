import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  createSeoStructuredData,
  createSeoTags,
  getSeoMetadata,
  serializeJsonLd,
} from '../../utils/seoMetadata.js';

const MANAGED_ATTRIBUTE = 'data-sailingloc-seo';
const MANAGED_VALUE = 'true';
const ORIGINAL_CONTENT_ATTRIBUTE = 'data-sailingloc-seo-original-content';
const ORIGINAL_HREF_ATTRIBUTE = 'data-sailingloc-seo-original-href';

function findMeta(attribute, value) {
  const candidates = [...document.head.querySelectorAll(`meta[${attribute}="${value}"]`)];
  const element =
    candidates.find((candidate) => candidate.getAttribute(MANAGED_ATTRIBUTE) === MANAGED_VALUE) ||
    candidates[0];
  candidates
    .filter((candidate) => candidate !== element)
    .forEach((candidate) => candidate.remove());
  return element;
}

function ensureMeta(attribute, value, content) {
  let element = findMeta(attribute, value);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  } else if (!element.hasAttribute(MANAGED_ATTRIBUTE)) {
    element.setAttribute(ORIGINAL_CONTENT_ATTRIBUTE, element.getAttribute('content') || '');
  }
  element.setAttribute(MANAGED_ATTRIBUTE, MANAGED_VALUE);
  element.setAttribute('content', content);
  return element;
}

function ensureLink(rel, href) {
  const candidates = [...document.head.querySelectorAll(`link[rel="${rel}"]`)];
  let element =
    candidates.find((candidate) => candidate.getAttribute(MANAGED_ATTRIBUTE) === MANAGED_VALUE) ||
    candidates[0];
  candidates
    .filter((candidate) => candidate !== element)
    .forEach((candidate) => candidate.remove());
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  } else if (!element.hasAttribute(MANAGED_ATTRIBUTE)) {
    element.setAttribute(ORIGINAL_HREF_ATTRIBUTE, element.getAttribute('href') || '');
  }
  element.setAttribute(MANAGED_ATTRIBUTE, MANAGED_VALUE);
  element.setAttribute('href', href);
  return element;
}

function removeManagedHeadTags() {
  document.head.querySelectorAll(`[${MANAGED_ATTRIBUTE}="${MANAGED_VALUE}"]`).forEach((element) => {
    if (element.hasAttribute(ORIGINAL_CONTENT_ATTRIBUTE)) {
      element.setAttribute('content', element.getAttribute(ORIGINAL_CONTENT_ATTRIBUTE));
      element.removeAttribute(ORIGINAL_CONTENT_ATTRIBUTE);
      element.removeAttribute(MANAGED_ATTRIBUTE);
      return;
    }
    if (element.hasAttribute(ORIGINAL_HREF_ATTRIBUTE)) {
      element.setAttribute('href', element.getAttribute(ORIGINAL_HREF_ATTRIBUTE));
      element.removeAttribute(ORIGINAL_HREF_ATTRIBUTE);
      element.removeAttribute(MANAGED_ATTRIBUTE);
      return;
    }
    element.remove();
  });
}

function applyStructuredData(structuredData) {
  if (!Array.isArray(structuredData)) return;
  structuredData.forEach((data) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(MANAGED_ATTRIBUTE, MANAGED_VALUE);
    script.textContent = serializeJsonLd(data);
    document.head.appendChild(script);
  });
}

function applyMetaTags(tags, structuredData) {
  removeManagedHeadTags();
  if (tags.title) document.title = tags.title;
  if (tags.description) ensureMeta('name', 'description', tags.description);
  ensureMeta('name', 'robots', tags.robots);
  ensureMeta('property', 'og:title', tags.openGraph.title);
  ensureMeta('property', 'og:description', tags.openGraph.description);
  ensureMeta('property', 'og:type', tags.openGraph.type);
  ensureMeta('property', 'og:site_name', tags.openGraph.siteName);
  ensureMeta('property', 'og:locale', tags.openGraph.locale);
  if (tags.openGraph.url) ensureMeta('property', 'og:url', tags.openGraph.url);
  if (tags.openGraph.image) ensureMeta('property', 'og:image', tags.openGraph.image);
  ensureMeta('name', 'twitter:card', tags.twitter.card);
  ensureMeta('name', 'twitter:title', tags.twitter.title);
  ensureMeta('name', 'twitter:description', tags.twitter.description);
  if (tags.canonical) ensureLink('canonical', tags.canonical);
  applyStructuredData(structuredData);
}

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
