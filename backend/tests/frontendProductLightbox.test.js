import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

describe('visionneuse de photos de la fiche bateau', () => {
  it('rend les photos de la galerie activables au clavier, et non cliquables en tant qu’image', () => {
    const productPage = source('frontend/src/pages/ProductPage.jsx');

    // Un onClick posé sur <img> ou sur SafeImage serait inatteignable au
    // clavier : la photo doit être portée par un vrai bouton.
    expect(productPage).toMatch(/<button[^>]*aria-label=\{t\('product\.lightbox\.open'/u);
    expect(productPage).not.toMatch(/<SafeImage[^>]*onClick/u);
  });

  it('déclare une modale accessible et rend le focus à la photo cliquée', () => {
    const lightbox = source('frontend/src/components/common/ImageLightbox.jsx');
    const productPage = source('frontend/src/pages/ProductPage.jsx');

    expect(lightbox).toMatch(/role="dialog"/u);
    expect(lightbox).toMatch(/aria-modal="true"/u);
    expect(lightbox).toMatch(/aria-label=\{t\('product\.lightbox\.label'\)\}/u);

    // Échap ferme, les flèches naviguent.
    expect(lightbox).toMatch(/e\.key === 'Escape'/u);
    expect(lightbox).toMatch(/e\.key === 'ArrowLeft'/u);
    expect(lightbox).toMatch(/e\.key === 'ArrowRight'/u);

    // Le défilement de la page est bloqué puis rétabli à la fermeture.
    expect(lightbox).toMatch(/document\.body\.style\.overflow = 'hidden'/u);
    expect(lightbox).toMatch(/document\.body\.style\.overflow = originalOverflow/u);

    // Sans ce renvoi, la navigation au clavier repart du haut de la page.
    expect(productPage).toMatch(/lightboxOpenerRef\.current\?\.focus\(\)/u);
  });

  it('traduit tous les libellés de la visionneuse en français et en anglais', () => {
    const texts = source('frontend/src/i18n/texts.js');
    const block = texts.slice(texts.indexOf('lightbox: {'));

    for (const key of ['label', 'open', 'close', 'previous', 'next', 'counter']) {
      const entry = new RegExp(`${key}: \\{ fr: '[^']+', en: '[^']+' \\}`, 'u');
      expect(block).toMatch(entry);
    }
  });
});
