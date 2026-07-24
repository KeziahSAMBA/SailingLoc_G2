import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const categorySourceUrl = new URL('../src/pages/CategoryPage.jsx', import.meta.url);

test('category page exposes one semantic main heading', async () => {
  const source = await readFile(categorySourceUrl, 'utf8');
  const openingHeadings = source.match(/<h1(?:\s|>)/g) ?? [];
  const closingHeadings = source.match(/<\/h1>/g) ?? [];

  assert.equal(openingHeadings.length, 1);
  assert.equal(closingHeadings.length, 1);
  assert.match(source, /<h1[\s\S]*?\{t\('category\.results\.title'\)\}[\s\S]*?<\/h1>/);
});

test('boat names expose crawlable product links', async () => {
  const source = await readFile(categorySourceUrl, 'utf8');

  assert.match(source, /href=\{`\/product\/\$\{id\}`\}/);
});

test('category page publishes an ItemList schema', async () => {
  const source = await readFile(categorySourceUrl, 'utf8');

  assert.match(source, /'@type': 'ItemList'/);
  assert.match(source, /'@type': 'ListItem'/);
});
