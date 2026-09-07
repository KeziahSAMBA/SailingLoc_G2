import { describe, expect, it } from '@jest/globals';
import {
  applyMetaTags,
  removeManagedHeadTags,
  sanitizeCanonicalHref,
} from '../../frontend/src/utils/seoHead.js';

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.parentNode = null;
    this.children = [];
    this.textContent = '';
    this.type = '';
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) this.children.splice(index, 1);
    child.parentNode = null;
  }

  remove() {
    this.parentNode?.removeChild(this);
  }
}

function matchesSelector(element, selector) {
  const match = selector.match(/^(?:(\w+))?\[([^=\]]+)(?:="([^"]*)")?\]$/u);
  if (!match) return false;
  const [, tagName, attribute, expected] = match;
  return (
    (!tagName || element.tagName.toLowerCase() === tagName.toLowerCase()) &&
    element.hasAttribute(attribute) &&
    (expected === undefined || element.getAttribute(attribute) === expected)
  );
}

class FakeHead extends FakeElement {
  querySelectorAll(selector) {
    return this.children.filter((element) => matchesSelector(element, selector));
  }
}

class FakeDocument {
  constructor() {
    this.baseURI = 'https://app.example.test/base/';
    this.defaultView = { location: { origin: 'https://app.example.test' } };
    this.head = new FakeHead('head');
    this.title = '';
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }
}

function tags(canonical = 'https://app.example.test/categorie', title = 'Catégorie') {
  return {
    title,
    description: 'Description publique',
    robots: 'index,follow',
    canonical,
    openGraph: {
      title,
      description: 'Description publique',
      type: 'website',
      siteName: 'SailingLoc',
      locale: 'fr_FR',
      url: canonical,
      image: null,
    },
    twitter: {
      card: 'summary',
      title,
      description: 'Description publique',
    },
  };
}

function canonicalLinks(doc) {
  return doc.head.querySelectorAll('link[rel="canonical"]');
}

describe('restauration sécurisée des métadonnées SEO', () => {
  it('accepte les URL HTTP(S) sûres et refuse les variantes ambiguës', () => {
    const context = {
      baseURI: 'https://app.example.test/base/',
      origin: 'https://app.example.test',
    };

    expect(sanitizeCanonicalHref('/legacy?x=1&y=2', context)).toBe(
      'https://app.example.test/legacy?x=1&y=2'
    );
    expect(sanitizeCanonicalHref('https://www.example.test/page', context)).toBe(
      'https://www.example.test/page'
    );

    for (const value of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///C:/secret.txt',
      'blob:https://app.example.test/id',
      '//evil.example.test/path',
      '/\\evil.example.test',
      '/%5Cevil.example.test',
      '/page\u0000',
      '/page%0a',
      '/page%E2%80%A8',
    ]) {
      expect(sanitizeCanonicalHref(value, context)).toBe('', `URL dangereuse acceptée: ${value}`);
    }
  });

  it('restaure un canonical valide depuis la WeakMap, sans relire un attribut data-*', () => {
    const doc = new FakeDocument();
    const original = doc.createElement('link');
    original.setAttribute('rel', 'canonical');
    original.setAttribute('href', '/legacy?x=1&y=2');
    original.setAttribute('data-sailingloc-seo-original-href', 'javascript:alert(1)');
    doc.head.appendChild(original);

    applyMetaTags(tags(), [], doc);
    expect(canonicalLinks(doc)).toHaveLength(1);
    expect(canonicalLinks(doc)[0].getAttribute('href')).toBe('https://app.example.test/categorie');

    removeManagedHeadTags(doc);
    expect(canonicalLinks(doc)).toHaveLength(1);
    expect(canonicalLinks(doc)[0].getAttribute('href')).toBe(
      'https://app.example.test/legacy?x=1&y=2'
    );
    expect(canonicalLinks(doc)[0].getAttribute('data-sailingloc-seo-original-href')).toBe(
      'javascript:alert(1)'
    );
  });

  it('ne restaure jamais un canonical initial dangereux', () => {
    for (const href of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///C:/secret.txt',
      'blob:https://app.example.test/id',
      '//evil.example.test/path',
      '/\\evil.example.test',
      '/page%00',
    ]) {
      const doc = new FakeDocument();
      const original = doc.createElement('link');
      original.setAttribute('rel', 'canonical');
      original.setAttribute('href', href);
      doc.head.appendChild(original);

      applyMetaTags(tags(), [], doc);
      removeManagedHeadTags(doc);
      expect(canonicalLinks(doc)).toHaveLength(0);
    }
  });

  it('évite les doublons et conserve les métadonnées textuelles et JSON-LD échappées', () => {
    const doc = new FakeDocument();
    const metadata = tags('https://app.example.test/categorie', '<b>titre</b>');
    applyMetaTags(metadata, [{ '@type': 'WebSite', name: '<script>alert(1)</script>' }], doc);
    applyMetaTags(metadata, [{ '@type': 'WebSite', name: '<script>alert(1)</script>' }], doc);

    expect(canonicalLinks(doc)).toHaveLength(1);
    expect(doc.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    const scripts = doc.head.querySelectorAll('script[data-sailingloc-seo="true"]');
    expect(scripts).toHaveLength(1);
    expect(scripts[0].textContent).toContain('\\u003cscript\\u003e');
    expect(scripts[0].textContent).not.toContain('<script>');

    removeManagedHeadTags(doc);
    expect(canonicalLinks(doc)).toHaveLength(0);
    expect(doc.head.querySelectorAll('script[data-sailingloc-seo="true"]')).toHaveLength(0);
  });
});
