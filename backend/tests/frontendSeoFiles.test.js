import { describe, expect, it } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_PATHS } from '../../frontend/src/utils/seoMetadata.js';
import { DEFAULT_SITE_ORIGIN, renderSitemap } from '../../frontend/scripts/sitemap.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PUBLIC_DIR = resolve(ROOT, 'frontend/public');
const EXPECTED_PATHS = [
  '/',
  '/categorie',
  '/a-propos',
  '/contact',
  '/mentions-legales',
  '/cgu',
  '/cgv',
  '/politique-de-confidentialite',
];

describe('fichiers SEO statiques frontend', () => {
  it('ouvre l’exploration des pages publiques et n’interdit que l’espace admin', () => {
    const robots = readFileSync(resolve(PUBLIC_DIR, 'robots.txt'), 'utf8')
      .replaceAll('\r\n', '\n')
      .trim();

    expect(robots).toMatch(/^User-agent:\s*\*$/mu);
    expect(robots).toMatch(/^Allow:\s*\/$/mu);
    expect(robots).toMatch(/^Disallow:\s*\/admin$/mu);
    expect(robots).toMatch(new RegExp(`^Sitemap:\\s*${DEFAULT_SITE_ORIGIN}/sitemap\\.xml$`, 'mu'));

    // Un « Disallow: / » nu bloquerait tout le site : c'est l'état d'où l'on vient.
    expect(robots).not.toMatch(/^Disallow:\s*\/$/mu);
  });

  it('laisse les espaces privés au noindex plutôt qu’au blocage d’exploration', () => {
    const robots = readFileSync(resolve(PUBLIC_DIR, 'robots.txt'), 'utf8');

    // Interdire l'exploration empêcherait les moteurs de lire le noindex rendu
    // par seoMetadata, ce qui laisserait ces URL apparaître en résultat.
    for (const prefix of ['/locataire', '/proprietaire', '/documents', '/reservation', '/login']) {
      expect(robots).not.toContain(`Disallow: ${prefix}`);
    }
  });

  it('ne conserve aucun sitemap statique susceptible de diverger des routes', () => {
    expect(existsSync(resolve(PUBLIC_DIR, 'sitemap.xml'))).toBe(false);
  });

  it('génère un sitemap XML valide limité aux routes publiques stables', () => {
    expect([...PUBLIC_PATHS]).toEqual(EXPECTED_PATHS);

    const sitemap = renderSitemap(DEFAULT_SITE_ORIGIN, PUBLIC_PATHS);
    expect(sitemap).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/u);
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).not.toMatch(/<(lastmod|changefreq|priority)>/iu);
    expect(sitemap).not.toMatch(
      /\/(?:login|register|admin|locataire|proprietaire|reservation|documents)(?:[/?<]|$)/iu
    );
    expect(sitemap).not.toMatch(/\/product(?:[/?<]|$)/iu);

    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(([, value]) => value);
    expect(locations).toEqual(
      EXPECTED_PATHS.map((pathname) => `${DEFAULT_SITE_ORIGIN}${pathname}`)
    );
    expect(new Set(locations).size).toBe(EXPECTED_PATHS.length);
    for (const location of locations) {
      const parsed = new URL(location);
      expect(parsed.origin).toBe(DEFAULT_SITE_ORIGIN);
      expect(parsed.search).toBe('');
      expect(parsed.hash).toBe('');
    }
  });

  it('refuse une origine de site non HTTPS ou porteuse d’un chemin', () => {
    expect(() => renderSitemap('http://dsp-dev-o24a-g2.com', PUBLIC_PATHS)).toThrow();
    expect(() => renderSitemap('https://dsp-dev-o24a-g2.com/base', PUBLIC_PATHS)).toThrow();
    expect(() => renderSitemap('', PUBLIC_PATHS)).toThrow();
  });
});
