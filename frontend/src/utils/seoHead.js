import { serializeJsonLd } from './seoMetadata.js';

const MANAGED_ATTRIBUTE = 'data-sailingloc-seo';
const MANAGED_VALUE = 'true';
const ORIGINAL_CONTENT_ATTRIBUTE = 'data-sailingloc-seo-original-content';

// Keep the original canonical href outside the DOM. Storing it in a data-*
// attribute would create a DOM-source-to-URL-sink flow when the link is
// restored during navigation. The snapshot deliberately contains only a
// validated URL (or the absence of one), never the raw DOM value.
const originalLinkSnapshots = new WeakMap();

function containsControlCharacters(value) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      (codePoint >= 0 && codePoint <= 31) ||
      codePoint === 127 ||
      codePoint === 0x2028 ||
      codePoint === 0x2029
    );
  });
}

function containsEncodedControlCharacters(value) {
  const octets = value.match(/%[0-9a-f]{2}/giu) || [];
  if (
    octets.some((octet) => {
      const codePoint = Number.parseInt(octet.slice(1), 16);
      return codePoint <= 31 || codePoint === 127;
    })
  ) {
    return true;
  }

  return /%e2%80%a8|%e2%80%a9/iu.test(value);
}

function getDocument(providedDocument) {
  if (providedDocument) return providedDocument;
  return typeof document !== 'undefined' ? document : null;
}

function getUrlContext(providedDocument) {
  const doc = getDocument(providedDocument);
  const origin = doc?.defaultView?.location?.origin || '';
  const baseURI = typeof doc?.baseURI === 'string' ? doc.baseURI : origin;
  return { baseURI, origin };
}

/**
 * Validates a URL before it can be used as a canonical link href.
 *
 * Relative URLs are resolved against the current document, while explicit
 * HTTP(S) URLs are accepted. Protocol-relative URLs and backslash variants
 * are rejected because browsers can reinterpret them as external URLs.
 */
export function sanitizeCanonicalHref(value, context = {}) {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    /%5c/iu.test(trimmed) ||
    containsControlCharacters(trimmed) ||
    containsEncodedControlCharacters(trimmed)
  ) {
    return '';
  }

  const { baseURI, origin } = context;
  const base = baseURI || origin;
  if (!base) return '';

  try {
    const url = new URL(trimmed, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    if (url.username || url.password) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function findMeta(doc, attribute, value) {
  const candidates = [...doc.head.querySelectorAll(`meta[${attribute}="${value}"]`)];
  const element =
    candidates.find((candidate) => candidate.getAttribute(MANAGED_ATTRIBUTE) === MANAGED_VALUE) ||
    candidates[0];
  candidates
    .filter((candidate) => candidate !== element)
    .forEach((candidate) => candidate.remove());
  return element;
}

function ensureMeta(doc, attribute, value, content) {
  let element = findMeta(doc, attribute, value);
  if (!element) {
    element = doc.createElement('meta');
    element.setAttribute(attribute, value);
    doc.head.appendChild(element);
  } else if (!element.hasAttribute(MANAGED_ATTRIBUTE)) {
    element.setAttribute(ORIGINAL_CONTENT_ATTRIBUTE, element.getAttribute('content') || '');
  }
  element.setAttribute(MANAGED_ATTRIBUTE, MANAGED_VALUE);
  element.setAttribute('content', content);
  return element;
}

function ensureLink(doc, rel, href) {
  const candidates = [...doc.head.querySelectorAll(`link[rel="${rel}"]`)];
  let element =
    candidates.find((candidate) => candidate.getAttribute(MANAGED_ATTRIBUTE) === MANAGED_VALUE) ||
    candidates[0];
  candidates
    .filter((candidate) => candidate !== element)
    .forEach((candidate) => candidate.remove());

  const safeHref = sanitizeCanonicalHref(href, getUrlContext(doc));
  if (!safeHref) {
    if (element) {
      originalLinkSnapshots.delete(element);
      element.remove();
    }
    return null;
  }

  if (!element) {
    element = doc.createElement('link');
    element.setAttribute('rel', rel);
    doc.head.appendChild(element);
  } else if (!element.hasAttribute(MANAGED_ATTRIBUTE)) {
    const hasHref = element.hasAttribute('href');
    const originalHref = hasHref ? element.getAttribute('href') : null;
    originalLinkSnapshots.set(element, {
      present: hasHref,
      value: hasHref ? sanitizeCanonicalHref(originalHref, getUrlContext(doc)) : null,
    });
  }

  element.setAttribute(MANAGED_ATTRIBUTE, MANAGED_VALUE);
  element.setAttribute('href', safeHref);
  return element;
}

export function removeManagedHeadTags(providedDocument) {
  const doc = getDocument(providedDocument);
  if (!doc?.head) return;

  doc.head.querySelectorAll(`[${MANAGED_ATTRIBUTE}="${MANAGED_VALUE}"]`).forEach((element) => {
    const snapshot = originalLinkSnapshots.get(element);
    if (snapshot) {
      originalLinkSnapshots.delete(element);
      if (snapshot.present && snapshot.value) {
        element.removeAttribute(MANAGED_ATTRIBUTE);
        element.setAttribute('href', snapshot.value);
      } else {
        // Invalid, empty or absent original values must never be restored.
        element.remove();
      }
      return;
    }

    if (element.hasAttribute(ORIGINAL_CONTENT_ATTRIBUTE)) {
      element.setAttribute('content', element.getAttribute(ORIGINAL_CONTENT_ATTRIBUTE));
      element.removeAttribute(ORIGINAL_CONTENT_ATTRIBUTE);
      element.removeAttribute(MANAGED_ATTRIBUTE);
      return;
    }
    element.remove();
  });
}

function applyStructuredData(doc, structuredData) {
  if (!Array.isArray(structuredData)) return;
  structuredData.forEach((data) => {
    const script = doc.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(MANAGED_ATTRIBUTE, MANAGED_VALUE);
    script.textContent = serializeJsonLd(data);
    doc.head.appendChild(script);
  });
}

export function applyMetaTags(tags, structuredData, providedDocument) {
  const doc = getDocument(providedDocument);
  if (!doc?.head || !tags) return;

  removeManagedHeadTags(doc);
  if (tags.title) doc.title = tags.title;
  if (tags.description) ensureMeta(doc, 'name', 'description', tags.description);
  ensureMeta(doc, 'name', 'robots', tags.robots);
  ensureMeta(doc, 'property', 'og:title', tags.openGraph.title);
  ensureMeta(doc, 'property', 'og:description', tags.openGraph.description);
  ensureMeta(doc, 'property', 'og:type', tags.openGraph.type);
  ensureMeta(doc, 'property', 'og:site_name', tags.openGraph.siteName);
  ensureMeta(doc, 'property', 'og:locale', tags.openGraph.locale);
  if (tags.openGraph.url) ensureMeta(doc, 'property', 'og:url', tags.openGraph.url);
  if (tags.openGraph.image) ensureMeta(doc, 'property', 'og:image', tags.openGraph.image);
  ensureMeta(doc, 'name', 'twitter:card', tags.twitter.card);
  ensureMeta(doc, 'name', 'twitter:title', tags.twitter.title);
  ensureMeta(doc, 'name', 'twitter:description', tags.twitter.description);
  if (tags.canonical) ensureLink(doc, 'canonical', tags.canonical);
  applyStructuredData(doc, structuredData);
}
