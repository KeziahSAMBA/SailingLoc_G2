import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';
import { buildProductSeo } from '../src/utils/productSeo.js';

const boat = {
  id_boat: 7,
  name: 'Le Mistral',
  type: 'voilier',
  daily_price: '350',
  description: 'Un voilier confortable pour découvrir la Méditerranée.',
  avg_rating: '4.5',
  review_count: 8,
  availabilities: [{ start_date: '2026-08-01', end_date: '2026-08-10' }],
  port: { city: 'Nice' },
  images: [{ url: '/images/mistral.webp' }],
};

test('builds unique product metadata from boat data', () => {
  const seo = buildProductSeo(boat, 'Voilier', 'https://sailingloc.fr');

  assert.match(seo.title, /Le Mistral/);
  assert.match(seo.title, /Nice/);
  assert.match(seo.title, /350 €\/jour/);
  assert.equal(seo.canonicalUrl, 'https://sailingloc.fr/product/7');
  assert.equal(seo.image, 'https://sailingloc.fr/images/mistral.webp');
});

test('publishes Product, Offer, rating and breadcrumb structured data', () => {
  const seo = buildProductSeo(boat, 'Voilier', 'https://sailingloc.fr');
  const [product, breadcrumb] = seo.structuredData['@graph'];

  assert.equal(product['@type'], 'Product');
  assert.equal(product.offers.price, 350);
  assert.equal(product.offers.priceCurrency, 'EUR');
  assert.equal(product.aggregateRating.reviewCount, 8);
  assert.equal(breadcrumb['@type'], 'BreadcrumbList');
  assert.equal(breadcrumb.itemListElement.length, 3);
});

test('product page exposes the boat name as its main heading', async () => {
  const source = await readFile(new URL('../src/pages/ProductPage.jsx', import.meta.url), 'utf8');

  assert.match(source, /<h1[^>]*>\s*\{boat\.name\}\s*<\/h1>/);
});
