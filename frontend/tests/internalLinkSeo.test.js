import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const readSource = (relativePath) =>
  readFile(new URL(`../src/${relativePath}`, import.meta.url), 'utf8');

test('GhostButton can render a crawlable internal React link', async () => {
  const source = await readSource('components/common/GhostButton.jsx');

  assert.match(source, /if \(to\)/);
  assert.match(source, /<Link to=\{to\} onClick=\{onClick\} className=\{cls\}>/);
});

test('existing public calls to action expose real destinations', async () => {
  const [home, product] = await Promise.all([
    readSource('pages/HomePage.jsx'),
    readSource('pages/ProductPage.jsx'),
  ]);

  assert.match(home, /<GhostButton to="\/a-propos">/);
  assert.match(home, /<GhostButton[\s\S]*?to="\/categorie"[\s\S]*?home\.reviews\.cta/);
  assert.match(product, /<GhostButton[\s\S]*?to="\/categorie"[\s\S]*?product\.notFound\.cta/);
});

test('public secondary pages publish breadcrumb structured data', async () => {
  const source = await readSource('components/common/SeoManager.jsx');

  assert.match(source, /const BREADCRUMB_LABELS/);
  assert.match(source, /'@type': 'BreadcrumbList'/);
  assert.match(
    source,
    /updateBreadcrumbStructuredData\(location\.pathname, siteOrigin, seo\.language\)/
  );
});
