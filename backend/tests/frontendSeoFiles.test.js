import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PUBLIC_DIR = resolve(ROOT, 'frontend/public');
const STAGING_ORIGIN = 'https://dsp-dev-o24a-g2.com';
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
  it('bloque explicitement toute indexation sur le domaine de staging', () => {
    const robots = readFileSync(resolve(PUBLIC_DIR, 'robots.txt'), 'utf8')
      .replaceAll('\r\n', '\n')
      .trim();

    expect(robots).toBe('User-agent: *\nDisallow: /');
    expect(robots).not.toMatch(/^Allow\s*:/imu);
  });

  it('publie uniquement les routes publiques stables dans un sitemap XML valide', () => {
    const sitemap = readFileSync(resolve(PUBLIC_DIR, 'sitemap.xml'), 'utf8');
    expect(sitemap).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/u);
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).not.toMatch(/<(lastmod|changefreq|priority)>/iu);
    expect(sitemap).not.toMatch(
      /\/(?:login|register|admin|locataire|proprietaire|reservation|documents)(?:[/?<]|$)/iu
    );
    expect(sitemap).not.toMatch(/\/product(?:[/?<]|$)/iu);

    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(([, value]) => value);
    expect(locations).toEqual(EXPECTED_PATHS.map((pathname) => `${STAGING_ORIGIN}${pathname}`));
    expect(new Set(locations).size).toBe(EXPECTED_PATHS.length);
    for (const location of locations) {
      const parsed = new URL(location);
      expect(parsed.origin).toBe(STAGING_ORIGIN);
      expect(parsed.search).toBe('');
      expect(parsed.hash).toBe('');
    }
  });
});
