import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

function block(css, selector) {
  let start = css.indexOf(selector);
  expect(start).toBeGreaterThanOrEqual(0);

  while (start >= 0) {
    const open = css.indexOf('{', start);
    let depth = 0;
    for (let index = open; index < css.length; index += 1) {
      if (css[index] === '{') depth += 1;
      if (css[index] === '}' && --depth === 0) {
        const candidate = css.slice(open + 1, index);
        if (candidate.includes('--sl-page:')) return candidate;
        break;
      }
    }
    start = css.indexOf(selector, open + 1);
  }
  throw new Error(`Bloc CSS non fermé : ${selector}`);
}

describe('surfaces du mode nuit', () => {
  it('conserve les voiles historiques en clair et les renforce en mode nuit', () => {
    const css = source('frontend/src/index.css');
    const root = block(css, ':root');
    const dark = block(css, "html[data-sailingloc-theme='dark']");

    expect(root).toContain('--sl-photo-overlay-boat-opacity: 0.5');
    expect(root).toContain('--sl-photo-overlay-static-start-opacity: 0.62');
    expect(root).toContain('--sl-photo-overlay-static-end-opacity: 0.72');
    expect(root).toContain('--sl-photo-overlay-dashboard-opacity: 0.4');
    expect(dark).toContain('--sl-photo-overlay-boat-opacity: 0.68');
    expect(dark).toContain('--sl-photo-overlay-static-start-opacity: 0.78');
    expect(dark).toContain('--sl-photo-overlay-static-end-opacity: 0.86');
    expect(dark).toContain('--sl-photo-overlay-dashboard-opacity: 0.58');
    expect(dark).toContain('--sl-photo-overlay-hero-opacity: 0.68');
    expect(dark).toContain('--sl-photo-overlay-dashboard-layer-opacity: 0.58');
    expect(dark).toContain('--sl-photo-overlay-document-opacity: 0.58');
    expect(dark).toContain('--sl-photo-overlay-not-found-opacity: 0.72');
  });

  it('utilise des voiles pilotés par les tokens pour les pages photo et les transitions', () => {
    const transition = source('frontend/src/hooks/useCategoryTransition.js');
    expect(transition).toContain('--sl-photo-overlay-boat-color');
    expect(transition).toContain('--sl-photo-overlay-static-start');
    expect(transition).toContain('--sl-photo-overlay-dashboard-color');
    expect(transition).not.toMatch(/rgba\(/u);

    for (const relativePath of [
      'frontend/src/pages/CategoryPage.jsx',
      'frontend/src/pages/ProductPage.jsx',
      'frontend/src/pages/ContactPage.jsx',
      'frontend/src/pages/AboutPage.jsx',
      'frontend/src/pages/legal/LegalLayout.jsx',
    ]) {
      expect(source(relativePath)).toMatch(/PHOTO_OVERLAY_(?:BOAT|STATIC_PAGE)/u);
    }

    expect(source('frontend/src/components/common/PageLoadGateScreen.jsx')).toContain(
      '--sl-photo-overlay-page-gate-start'
    );
    expect(source('frontend/src/components/common/Footer.jsx')).toContain(
      '--sl-photo-overlay-footer-opacity'
    );
  });

  it('assombrit les héros, documents et tableaux de bord sans filtrer les médias', () => {
    for (const relativePath of [
      'frontend/src/pages/HomePage.jsx',
      'frontend/src/pages/HomePageProprio.jsx',
    ]) {
      expect(source(relativePath)).toContain('sailingloc-photo-overlay--hero');
    }
    expect(source('frontend/src/pages/ReservationPage.jsx')).toContain(
      'sailingloc-photo-overlay--hero'
    );
    expect(source('frontend/src/pages/MyDocumentsPage.jsx')).toContain(
      'sailingloc-photo-overlay--document'
    );
    for (const relativePath of [
      'frontend/src/components/locataire/LocataireLayout.jsx',
      'frontend/src/components/proprietaire/ProprietaireLayout.jsx',
      'frontend/src/components/admin/AdminLayout.jsx',
    ]) {
      expect(source(relativePath)).toContain('sailingloc-photo-overlay--dashboard');
    }

    const css = source('frontend/src/index.css');
    for (const modifier of ['hero', 'dashboard', 'document', 'not-found']) {
      expect(css).toMatch(
        new RegExp(
          `\\.sailingloc-photo-overlay--${modifier}\\s*\\{[^}]*background-color:\\s*rgb\\(var\\(--sl-overlay\\) /`,
          'u'
        )
      );
    }
    expect(css).not.toMatch(
      /\.sailingloc-photo-overlay--(?:hero|dashboard|document|not-found)\s*\{[^}]*opacity:/u
    );
    const map = source('frontend/src/components/common/MapView.jsx');
    expect(map).toMatch(
      /\.leaflet-layer\.sailingloc-map-labels\s+\.leaflet-tile\s*\{[^}]*filter\s*:\s*invert\(1\)/u
    );
    expect(map).not.toMatch(
      /(?:\bimg\b|\bvideo\b|\bpicture\b|\bcanvas\b|(?<!\.sailingloc-map-labels\s)\.leaflet-tile)[^}]*filter\s*:/su
    );
    expect(css).not.toMatch(/(?:img|video|picture|canvas|\.leaflet-tile)[^}]*filter:/su);
  });

  it('fait suivre les carrousels de la page d’accueil au thème global', () => {
    const carousel = source('frontend/src/components/common/Carrousel.jsx');
    expect(carousel).toContain('useVisualPreferences');
    expect(carousel).toContain("const effectiveTheme = visualTheme === 'dark' ? 'dark' : theme");
    expect(carousel).toContain('var(--sl-carousel-dot-active)');
    expect(carousel).toContain('var(--sl-carousel-dot-muted)');
    expect(carousel).toContain(
      "theme={themed || glass || effectiveTheme === 'dark' ? effectiveTheme : 'light'}"
    );
  });
});
