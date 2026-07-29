import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

test('home page exposes one semantic main heading', async () => {
  const source = await readFile(new URL('../src/pages/HomePage.jsx', import.meta.url), 'utf8');
  const openingHeadings = source.match(/<h1(?:\s|>)/g) ?? [];
  const closingHeadings = source.match(/<\/h1>/g) ?? [];

  assert.equal(openingHeadings.length, 1);
  assert.equal(closingHeadings.length, 1);
  assert.match(source, /<h1[\s\S]*?\{t\('home\.hero\.tagline'\)\}[\s\S]*?<\/h1>/);
});

test('decorative hero video is hidden from assistive technologies', async () => {
  const source = await readFile(new URL('../src/pages/HomePage.jsx', import.meta.url), 'utf8');

  assert.match(source, /<video[\s\S]*?aria-hidden="true"[\s\S]*?\/>/);
});
