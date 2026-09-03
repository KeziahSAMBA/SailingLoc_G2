import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

describe('consommation des préférences par les composants spécialisés', () => {
  it('branche les graphiques sur les cinq tokens adaptatifs', () => {
    const admin = source('frontend/src/components/admin/AdminDashboard.jsx');
    const owner = source('frontend/src/components/proprietaire/ProprietaireRevenus.jsx');

    for (const token of ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']) {
      expect(admin).toContain(`var(--sl-${token})`);
    }
    expect(owner).toContain('rgb(var(--sl-chart-1))');
    expect(owner).not.toContain('rgb(var(--sl-chart-primary))');
  });

  it('adapte les contrôles et popups de carte sans filtrer les tuiles', () => {
    const map = source('frontend/src/components/common/MapView.jsx');

    expect(map).toContain('var(--sl-brand-focus)');
    expect(map).toContain('var(--sl-map-control-border)');
    expect(map).toContain('border-dark-elevated');
    expect(map).toContain('text-content-muted');
    expect(map).toContain('text-content-subtle');
    expect(map).toContain('text-map-control-text');
    expect(map).not.toMatch(/\.leaflet-tile[^}]*filter\s*:/u);
  });

  it('utilise le premier plan du calendrier et conserve ses états ARIA', () => {
    const calendar = source('frontend/src/components/common/DateRangePicker.jsx');

    expect(calendar).toContain('text-calendar-selected-text');
    expect(calendar).toContain('text-calendar-available-text');
    expect(calendar).toContain('border-calendar-available-text');
    expect(calendar).toContain('aria-selected={Boolean(isStart || isEnd || inRange)}');
    expect(calendar).toContain('aria-disabled={disabled}');
    expect(calendar).toContain('data-calendar-state={calendarState}');
  });

  it('déclare une apparence Stripe pour les huit combinaisons sans remount', () => {
    const reservation = source('frontend/src/pages/ReservationPage.jsx');

    expect(reservation).toContain('const STRIPE_CARD_PALETTES');
    expect(reservation.match(/standard: Object\.freeze\(/gu)).toHaveLength(2);
    expect(reservation.match(/protanopia: Object\.freeze\(/gu)).toHaveLength(2);
    expect(reservation.match(/deuteranopia: Object\.freeze\(/gu)).toHaveLength(2);
    expect(reservation.match(/tritanopia: Object\.freeze\(/gu)).toHaveLength(2);
    expect(reservation).toContain('color: palette.content');
    expect(reservation).toContain("'::placeholder': { color: palette.placeholder }");
    expect(reservation).toContain('iconColor: palette.icon');
    expect(reservation).toContain('color: palette.invalid');
    expect(reservation).toContain('stripeCardElementOptions(theme, colorVision)');
    expect(reservation).toContain('[theme, colorVision]');
    expect(reservation).toContain('<CardElement options={cardElementOptions} />');
    expect(reservation).not.toContain('key={theme}');
  });
});
