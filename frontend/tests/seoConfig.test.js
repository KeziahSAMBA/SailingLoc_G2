import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveSeo } from '../src/utils/seoConfig.js';

test('returns indexable metadata for a public page', () => {
  const seo = resolveSeo('/categorie');

  assert.equal(seo.robots, 'index, follow');
  assert.equal(seo.canonicalPath, '/categorie');
  assert.match(seo.title, /Location de bateaux/);
});

test('keeps a product identifier in its canonical URL', () => {
  const seo = resolveSeo('/product/42');

  assert.equal(seo.robots, 'index, follow');
  assert.equal(seo.canonicalPath, '/product/42');
});

test('prevents private routes from being indexed', () => {
  for (const pathname of [
    '/login',
    '/reservation/42',
    '/locataire/messages',
    '/proprietaire/bateaux',
    '/admin/users',
  ]) {
    assert.equal(resolveSeo(pathname).robots, 'noindex, nofollow');
  }
});

test('prevents unknown routes from being indexed', () => {
  const seo = resolveSeo('/page-inconnue');

  assert.equal(seo.robots, 'noindex, nofollow');
  assert.match(seo.title, /introuvable/);
});
