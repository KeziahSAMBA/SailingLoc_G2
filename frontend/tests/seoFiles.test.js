import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const PUBLIC_ROUTES = [
  '/',
  '/categorie',
  '/a-propos',
  '/contact',
  '/mentions-legales',
  '/cgu',
  '/cgv',
  '/politique-de-confidentialite',
];

const PRIVATE_ROUTE_MARKERS = [
  '/admin',
  '/documents',
  '/locataire',
  '/login',
  '/proprietaire',
  '/register',
  '/reservation',
  '/reset-password',
];

test('robots.txt points to the canonical sitemap', async () => {
  const robots = await readFile(new URL('../public/robots.txt', import.meta.url), 'utf8');

  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Sitemap: https:\/\/sailingloc\.fr\/sitemap\.xml$/m);
});

test('sitemap contains only stable public routes', async () => {
  const sitemap = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8');

  for (const route of PUBLIC_ROUTES) {
    const absoluteUrl = route === '/' ? 'https://sailingloc.fr/' : `https://sailingloc.fr${route}`;
    assert.ok(sitemap.includes(`<loc>${absoluteUrl}</loc>`));
  }

  for (const route of PRIVATE_ROUTE_MARKERS) {
    assert.doesNotMatch(sitemap, new RegExp(`<loc>[^<]*${route}`));
  }
});
