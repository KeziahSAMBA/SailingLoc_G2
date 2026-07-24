import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';
import { resolveSeo } from '../src/utils/seoConfig.js';

const PRIVATE_ROUTES = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/documents',
  '/reservation/12',
  '/locataire',
  '/locataire/compte',
  '/locataire/documents',
  '/locataire/reservations',
  '/locataire/depenses',
  '/locataire/favoris',
  '/locataire/messages',
  '/proprietaire',
  '/proprietaire/compte',
  '/proprietaire/documents',
  '/proprietaire/reservations',
  '/proprietaire/revenus',
  '/proprietaire/bateaux',
  '/proprietaire/bateaux/nouveau',
  '/proprietaire/bateaux/12/modifier',
  '/proprietaire/messages',
  '/admin/login',
  '/admin',
  '/admin/users',
  '/admin/bookings',
  '/admin/comments',
  '/admin/documents',
  '/admin/messages',
];

test('every private route family is noindex and nofollow', () => {
  for (const pathname of PRIVATE_ROUTES) {
    assert.equal(resolveSeo(pathname).robots, 'noindex, nofollow', pathname);
  }
});

test('product route without an identifier is not indexable', () => {
  assert.equal(resolveSeo('/product').robots, 'noindex, follow');
  assert.equal(resolveSeo('/product/12').robots, 'index, follow');
});

test('legal layout publishes dated WebPage structured data', async () => {
  const source = await readFile(
    new URL('../src/pages/legal/LegalLayout.jsx', import.meta.url),
    'utf8'
  );

  assert.match(source, /'@type': 'WebPage'/);
  assert.match(source, /dateModified: updatedIso/);
  assert.match(source, /'@type': 'Organization'/);
});
