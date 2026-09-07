import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

describe('structure sémantique et textes alternatifs frontend', () => {
  it('expose le slogan visible de l’accueil comme unique H1 de la page', () => {
    const home = source('frontend/src/pages/HomePage.jsx');

    expect(home).toMatch(
      /<h1\s+className="mx-auto max-w-3xl px-2 text-base leading-relaxed text-content-soft sm:text-lg lg:text-xl"\s+style=\{\{ \.\.\.heroSlideStyle\('left'\), \.\.\.introTaglineStyle \}\}\s*>\s*\{t\('home\.hero\.tagline'\)\}\s*<\/h1>/u
    );
    expect(home).not.toMatch(/sr-only[^\n]*home\.hero\.tagline/u);
  });

  it('emploie les titres déjà visibles comme H1 sans changement de classes', () => {
    const category = source('frontend/src/pages/CategoryPage.jsx');
    const product = source('frontend/src/pages/ProductPage.jsx');

    expect(category).toMatch(
      /<h1 className="text-xl font-bold uppercase tracking-tight text-map-results-heading drop-shadow-\[0_2px_6px_rgba\(0,0,0,0\.4\)\] sm:text-2xl">\s*\{t\('category\.results\.title'\)\}\s*<\/h1>/u
    );
    expect(product).toMatch(
      /<h1 className="text-lg font-bold text-on-dark tracking-tight drop-shadow-\[0_2px_6px_rgba\(0,0,0,0\.4\)\]">\s*\{boat\.name\}\s*<\/h1>/u
    );
  });

  it('décrit les photos de bateaux, ports et profils avec des données réelles', () => {
    const category = source('frontend/src/pages/CategoryPage.jsx');
    const product = source('frontend/src/pages/ProductPage.jsx');
    const reservation = source('frontend/src/pages/ReservationPage.jsx');
    const carousel = source('frontend/src/components/common/Carrousel.jsx');
    const translations = source('frontend/src/i18n/texts.js');

    expect(category).toContain("t('carrousel.boatImageAlt', { name })");
    expect(category).toContain("t('carrousel.boatImageAlt', { name: boat.name })");
    expect(product).toContain("t('carrousel.boatImageAlt', { name: boat.name })");
    expect(reservation).toContain("t('carrousel.boatImageAlt', { name: boat.name })");
    expect(carousel).toContain("t('carrousel.portImageAlt', { city: slide.label })");
    expect(carousel).toContain("t('carrousel.boatImageAlt', { name: slide.label })");
    expect(translations).toContain("boatImageAlt: { fr: 'Photo du bateau {{name}}'");
    expect(translations).toContain("portImageAlt: { fr: 'Port de {{city}}'");
  });

  it('conserve les textes alternatifs vides pour les images décoratives', () => {
    const notFound = source('frontend/src/pages/NotFoundPage.jsx');
    const loading = source('frontend/src/components/common/PageLoadGateScreen.jsx');

    expect(notFound).toMatch(/<img\s+[\s\S]*?alt=""\s+aria-hidden="true"/u);
    expect(loading).toMatch(/<img\s+[\s\S]*?alt=""\s+aria-hidden="true"/u);
  });
});
