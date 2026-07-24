import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';
import { buildProductSeo } from '../src/utils/productSeo.js';
import { resolveSeo } from '../src/utils/seoConfig.js';

test('bilingual public pages return metadata in the requested language', () => {
  const home = resolveSeo('/', 'en');
  const category = resolveSeo('/categorie', 'en');
  const about = resolveSeo('/a-propos', 'en');

  assert.equal(home.language, 'en');
  assert.match(home.title, /Boat rental/i);
  assert.match(category.description, /boats available to rent/i);
  assert.match(about.title, /About SailingLoc/);
});

test('French-only pages keep French metadata and language', () => {
  for (const pathname of ['/contact', '/mentions-legales', '/cgu', '/cgv', '/inconnue']) {
    const seo = resolveSeo(pathname, 'en');

    assert.equal(seo.language, 'fr', pathname);
  }
});

test('product metadata can be generated in English', () => {
  const seo = buildProductSeo(
    {
      id_boat: 4,
      name: 'Le Mistral',
      type: 'sailboat',
      daily_price: 350,
      port: { city: 'Nice' },
      images: [],
      availabilities: [],
    },
    'Sailboat',
    'https://sailingloc.fr',
    'en'
  );

  assert.match(seo.title, /Sailboat rental in Nice from €350\/day/);
  assert.match(seo.description, /Rent Le Mistral/);
  assert.equal(seo.structuredData['@graph'][1].itemListElement[0].name, 'Home');
});

test('SEO manager synchronizes document language and Open Graph locale', async () => {
  const source = await readFile(
    new URL('../src/components/common/SeoManager.jsx', import.meta.url),
    'utf8'
  );

  assert.match(source, /document\.documentElement\.lang = seo\.language/);
  assert.match(source, /property: 'og:locale'/);
  assert.match(source, /requestedLanguage/);
});
