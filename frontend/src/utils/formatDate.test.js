import { describe, it, expect, beforeEach } from 'vitest';
import i18n from '../i18n/index.js';
import { formatDate } from './formatDate.js';

describe('formatDate', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('fr');
  });

  it('formate une date en français par défaut', () => {
    expect(formatDate('2026-07-14')).toBe('14 juillet 2026');
  });

  it('suit la langue active', async () => {
    await i18n.changeLanguage('en');
    expect(formatDate('2026-07-14')).toBe('July 14, 2026');
  });

  // Le formateur est mis en cache par couple langue + options : un changement de
  // langue doit produire une nouvelle entrée, pas réutiliser la précédente.
  it('ne réutilise pas le format d’une autre langue', async () => {
    const fr = formatDate('2026-07-14');
    await i18n.changeLanguage('en');
    const en = formatDate('2026-07-14');
    expect(fr).not.toBe(en);
  });

  it('respecte des options explicites', () => {
    expect(
      formatDate('2026-07-14', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    ).toBe('14/07/2026');
  });

  it('accepte un objet Date autant qu’une chaîne', () => {
    expect(formatDate(new Date('2026-07-14T00:00:00Z'))).toBe(formatDate('2026-07-14T00:00:00Z'));
  });

  // Une réservation sans date d'annulation, un champ jamais rempli : la fiche
  // doit afficher du vide, pas « Invalid Date ».
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['chaîne vide', ''],
  ])('rend une chaîne vide pour %s', (_label, value) => {
    expect(formatDate(value)).toBe('');
  });
});
