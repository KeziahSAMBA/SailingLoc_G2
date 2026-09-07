import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const css = readFileSync(resolve(ROOT, 'frontend/src/index.css'), 'utf8');
const calendar = readFileSync(
  resolve(ROOT, 'frontend/src/components/common/DateRangePicker.jsx'),
  'utf8'
);
const map = readFileSync(resolve(ROOT, 'frontend/src/components/common/MapView.jsx'), 'utf8');
const revenue = readFileSync(
  resolve(ROOT, 'frontend/src/components/proprietaire/ProprietaireRevenus.jsx'),
  'utf8'
);

describe('redondance géométrique des cartes, calendriers et graphiques', () => {
  it('déclare des contours et un motif distincts pour les états du calendrier', () => {
    expect(css).toMatch(
      /\.calendar-day\.calendar-day--selected\s*\{[\s\S]*?border-style:\s*double;[\s\S]*?border-width:\s*3px;/u
    );
    expect(css).toMatch(
      /\.calendar-day\.calendar-day--available\s*\{[\s\S]*?border-style:\s*solid;[\s\S]*?border-width:\s*1px;/u
    );
    expect(css).toMatch(
      /\.calendar-day\.calendar-day--disabled\s*\{[\s\S]*?border-style:\s*dashed;[\s\S]*?repeating-linear-gradient/u
    );
  });

  it('expose l’état et le nom complet de chaque jour au lecteur d’écran', () => {
    expect(calendar).toContain('aria-selected={Boolean(isStart || isEnd || inRange)}');
    expect(calendar).toContain('aria-disabled={disabled}');
    expect(calendar).toContain('aria-label={`${dateFormatter.format(day)}');
    expect(calendar).toContain('data-calendar-state={calendarState}');
    expect(calendar).toContain('calendar-day--${calendarState}');
  });

  it('différencie les pins disponibles et indisponibles par forme et expose leur état', () => {
    expect(map).toContain(
      "data-marker-availability=\"${available ? 'available' : 'unavailable'}\""
    );
    expect(map).toContain('role="img" aria-label="${escapeHtml(markerLabel)}"');
    expect(map).toContain('stroke-dasharray="3 2"');
    expect(map).toContain('m9 9 6 6m0-6-6 6');
    expect(map).toContain('Bientôt disponible');
    expect(map).toContain('role="group"');
    expect(map).not.toMatch(/\.leaflet-tile\s*\{[^}]*filter\s*:/u);
  });

  it('rend le graphique de revenus identifiable sans dépendre d’une couleur', () => {
    expect(revenue).toContain('aria-describedby="monthly-revenue-chart-description"');
    expect(revenue).toContain('<title id="monthly-revenue-chart-title">');
    expect(revenue).toContain('<desc id="monthly-revenue-chart-description">');
    expect(revenue).toContain('id="monthly-revenue-stripes"');
    expect(revenue).toContain("strokeDasharray={active ? undefined : '4 2'}");
    expect(revenue).toContain('months.map((m, i) => {');
    expect(revenue).toContain('roundedTopRect(cx - barW / 2, top, barW, h)');
  });
});
