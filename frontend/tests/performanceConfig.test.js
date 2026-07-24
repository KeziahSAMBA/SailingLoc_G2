import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const nginxUrl = new URL('../nginx.conf', import.meta.url);
const viteUrl = new URL('../vite.config.js', import.meta.url);

test('nginx caches every heavy static asset format', async () => {
  const config = await readFile(nginxUrl, 'utf8');

  for (const extension of ['webp', 'ttf', 'mp4', 'json']) {
    assert.match(config, new RegExp(`(?:\\||\\()${extension}(?:\\||\\))`), extension);
  }
  assert.match(config, /Cache-Control "public, immutable"/);
});

test('nginx never stores the SPA entry point permanently', async () => {
  const config = await readFile(nginxUrl, 'utf8');

  assert.match(config, /location = \/index\.html[\s\S]*?no-cache, no-store, must-revalidate/);
  assert.match(config, /location = \/robots\.txt[\s\S]*?max-age=3600/);
  assert.match(config, /location = \/sitemap\.xml[\s\S]*?max-age=3600/);
});

test('vite separates stable third-party libraries', async () => {
  const config = await readFile(viteUrl, 'utf8');

  for (const chunk of [
    'vendor-react',
    'vendor-i18n',
    'vendor-icons',
    'vendor-maps',
    'vendor-motion',
  ]) {
    assert.ok(config.includes(`'${chunk}'`), chunk);
  }
});
