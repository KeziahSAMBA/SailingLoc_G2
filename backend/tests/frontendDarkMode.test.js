import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

function darkThemeBlock(css) {
  const match = css.match(/html\[data-sailingloc-theme=['"]dark['"]\]\s*\{([\s\S]*?)\n\}/u);
  expect(match).not.toBeNull();
  return match[1];
}

function tokenValue(block, token) {
  const match = block.match(new RegExp(`${token}:\\s*([^;]+);`, 'u'));
  expect(match).not.toBeNull();
  return match[1].trim();
}

function hexToRgb(hex) {
  return hex
    .slice(1)
    .match(/.{2}/gu)
    .map((channel) => Number.parseInt(channel, 16));
}

function relativeLuminance(hex) {
  return hexToRgb(hex)
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('palette du mode nuit', () => {
  it('déclare les tokens sombres sous le seul attribut du thème', () => {
    const css = source('frontend/src/index.css');
    const dark = darkThemeBlock(css);

    expect(css).toMatch(/:root\s*\{/u);
    expect(css).not.toMatch(/:root\[data-sailingloc-(?:theme|color-vision)\]/u);

    expect(dark).toContain('color-scheme: dark');
    expect(css.match(/color-scheme:\s*dark/gu)).toHaveLength(1);

    for (const [token, value] of [
      ['--sl-page', '2 6 23'],
      ['--sl-surface', '15 23 42'],
      ['--sl-content', '248 250 252'],
      ['--sl-content-muted', '203 213 225'],
      ['--sl-on-light', '15 23 42'],
      ['--sl-brand', '90 180 236'],
      ['--sl-brand-focus', '125 211 252'],
      ['--sl-brand-text', '125 211 252'],
      ['--sl-brand-hover', '125 211 252'],
      ['--sl-dark-elevated', '30 41 59'],
      ['--sl-dark-muted', '51 65 85'],
      ['--sl-border-light', '100 116 139'],
      ['--sl-success', '74 222 128'],
      ['--sl-success-base', '74 222 128'],
      ['--sl-warning', '251 191 36'],
      ['--sl-warning-base', '251 191 36'],
      ['--sl-danger', '248 113 113'],
      ['--sl-danger-base', '248 113 113'],
      ['--sl-info', '56 189 248'],
    ]) {
      expect(tokenValue(dark, token)).toBe(value);
    }
  });

  it('conserve les contrastes lisibles de la matrice sombre', () => {
    const page = '#020617';
    const surface = '#0F172A';
    const text = '#F8FAFC';
    const muted = '#CBD5E1';
    const inverse = '#0F172A';
    const focus = '#7DD3FC';

    expect(contrastRatio(text, page)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(muted, page)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(inverse, focus)).toBeGreaterThanOrEqual(4.5);

    for (const status of ['#4ADE80', '#FBBF24', '#F87171', '#38BDF8']) {
      expect(contrastRatio(status, page)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('applique la palette aux surfaces natives sans modifier le layout', () => {
    const css = source('frontend/src/index.css');

    for (const selector of [
      "html[data-sailingloc-theme='dark'] body",
      "html[data-sailingloc-theme='dark'] #root",
      "html[data-sailingloc-theme='dark'] .select-glass option",
      "html[data-sailingloc-theme='dark'] input[type='date']",
      "html[data-sailingloc-theme='dark'] input:-webkit-autofill",
      "html[data-sailingloc-theme='dark']::-webkit-scrollbar-thumb",
    ]) {
      expect(css).toContain(selector);
    }

    expect(css).toContain('scrollbar-color: rgb(var(--sl-border-light)) rgb(var(--sl-page))');
    expect(css).toContain('background-color: rgb(var(--sl-dark-elevated))');
    expect(css).toContain('color: rgb(var(--sl-content))');
    expect(css).toContain('color: rgb(var(--sl-on-light))');
    expect(css).toContain('-webkit-box-shadow: 0 0 0 1000px rgb(var(--sl-surface)) inset');
  });
});

describe('pages publiques et composants partages', () => {
  it('conserve les couleurs historiques claires dans les nouveaux tokens contextuels', () => {
    const css = source('frontend/src/index.css');
    const root = css.match(/:root\s*\{([\s\S]*?)\n\}/u)?.[1] ?? '';

    expect(tokenValue(root, '--sl-field-border')).toBe('203 213 225');
    expect(tokenValue(root, '--sl-field-placeholder')).toBe('148 163 184');
    expect(tokenValue(root, '--sl-home-sea')).toBe('0 78 87');
    expect(tokenValue(root, '--sl-home-tint')).toBe('235 245 253');
  });

  it('relie les surfaces publiques et les retours utilisateur aux palettes', () => {
    const home = source('frontend/src/pages/HomePage.jsx');
    const toast = source('frontend/src/context/ToastContext.jsx');
    const cookie = source('frontend/src/components/common/CookieConsentBanner.jsx');

    expect(home).toContain('var(--sl-home-sea)');
    expect(home).toContain('var(--sl-home-tint)');
    expect(toast).toContain('bg-success-surface text-success-text');
    expect(toast).toContain('bg-danger-surface text-danger-text');
    expect(cookie).toContain('border-field-border');
    expect(cookie).toContain('text-content-muted');
  });
});

describe('bascule lune et soleil', () => {
  it('conserve le bouton de thème et son état accessible', () => {
    const settings = source('frontend/src/components/common/Header/shared/SettingsMenu.jsx');

    expect(settings).toContain('FiMoon');
    expect(settings).toContain('FiSun');
    expect(settings).toContain("setTheme(theme === 'dark' ? 'light' : 'dark')");
    expect(settings).toContain("aria-pressed={theme === 'dark'}");
    expect(settings).toContain("{theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}");
  });
});

describe('composants spéciaux du mode nuit', () => {
  it('adapte uniquement le style visuel de Stripe CardElement au thème', () => {
    const reservation = source('frontend/src/pages/ReservationPage.jsx');

    expect(reservation).toContain('stripeCardElementOptions(theme)');
    expect(reservation).toContain("const dark = theme === 'dark'");
    expect(reservation).toContain('<CardElement options={cardElementOptions} />');
    expect(reservation).not.toContain('key={theme}');
    expect(reservation).toContain('stripe.confirmCardPayment(data.client_secret');
    expect(reservation).toContain('card: elements.getElement(CardElement)');
    expect(reservation).toContain('billing_details: { name: name.trim() }');
  });

  it('relie calendrier Leaflet et graphiques aux tokens sans filtre sur les images', () => {
    const calendar = source('frontend/src/components/common/DateRangePicker.jsx');
    const map = source('frontend/src/components/common/MapView.jsx');
    const chart = source('frontend/src/components/proprietaire/ProprietaireRevenus.jsx');

    expect(calendar).toContain('bg-calendar-available');
    expect(calendar).toContain('bg-calendar-selected');
    expect(calendar).toContain('text-calendar-disabled');
    expect(map).toContain('rgb(var(--sl-map-available))');
    expect(map).toContain('background: rgb(var(--sl-surface))');
    expect(chart).toContain('rgb(var(--sl-chart-primary))');
    expect(chart).toContain('rgb(var(--sl-glass) / 0.15)');
    expect(source('frontend/src/index.css')).not.toMatch(/\b(?:img|video)\s*\{[^}]*filter:/su);
  });
});
