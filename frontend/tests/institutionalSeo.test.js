import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const aboutSourceUrl = new URL('../src/pages/AboutPage.jsx', import.meta.url);
const contactSourceUrl = new URL('../src/pages/ContactPage.jsx', import.meta.url);

test('about page publishes AboutPage and Organization structured data', async () => {
  const source = await readFile(aboutSourceUrl, 'utf8');

  assert.match(source, /'@type': 'AboutPage'/);
  assert.match(source, /'@type': 'Organization'/);
  assert.match(source, /<h1[\s\S]*?aboutPage\.hero\.title[\s\S]*?<\/h1>/);
});

test('contact page publishes ContactPage, ContactPoint and FAQ structured data', async () => {
  const source = await readFile(contactSourceUrl, 'utf8');

  assert.match(source, /'@type': 'ContactPage'/);
  assert.match(source, /'@type': 'ContactPoint'/);
  assert.match(source, /'@type': 'FAQPage'/);
});

test('contact form submission behavior remains wired', async () => {
  const source = await readFile(contactSourceUrl, 'utf8');

  assert.match(source, /async function handleFormSubmit\(e\)/);
  assert.match(source, /onSubmit=\{handleFormSubmit\}/);
  assert.match(source, /await sendContactRequest\(form\)/);
});
