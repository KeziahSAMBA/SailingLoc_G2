import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const mapView = readFileSync(resolve(ROOT, 'frontend/src/components/common/MapView.jsx'), 'utf8');

describe('fonds cartographiques selon le thème visuel', () => {
  it('sélectionne Voyager en clair et sépare le fond sombre de ses libellés', () => {
    expect(mapView).toContain(
      "import { useVisualPreferences } from '../../context/VisualPreferencesContext.jsx';"
    );
    expect(mapView).toContain('const CARTO_TILE_URLS = Object.freeze({');
    expect(mapView).toContain(
      "light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'"
    );
    expect(mapView).toContain(
      "dark: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'"
    );
    expect(mapView).toContain(
      "darkLabels: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png'"
    );
    expect(mapView).toContain('const { theme } = useVisualPreferences();');
    expect(mapView).toContain(
      "const tileUrl = theme === 'dark' ? CARTO_TILE_URLS.dark : CARTO_TILE_URLS.light;"
    );
    expect(mapView).toContain('url={tileUrl}');
    expect(mapView).toContain('url={CARTO_TILE_URLS.darkLabels}');
    expect(mapView).toContain('className="sailingloc-map-labels"');
    expect(mapView).toContain('zIndex={10}');
    expect(mapView).not.toContain('dark_all');
    expect(mapView).not.toContain('key={theme}');
  });

  it('conserve attribution, interactions et rendu natif des tuiles', () => {
    expect(mapView).toContain('openstreetmap.org/copyright');
    expect(mapView).toContain('carto.com/attributions');
    expect(mapView).toContain('scrollWheelZoom');
    expect(mapView).toContain('<FitBounds points={fitPoints} />');
    expect(mapView).toContain('<ZoomWatcher onZoomChange={setZoom} />');
    expect(mapView).toContain(
      '{onBoundsChange && <BoundsWatcher onBoundsChange={onBoundsChange} />}'
    );
    expect(mapView).toContain('onSelect={onBoatSelect}');
    expect(mapView.match(/\battribution=/gu)).toHaveLength(1);
    expect(mapView).toMatch(
      /\.leaflet-layer\.sailingloc-map-labels\s+\.leaflet-tile\s*\{[^}]*filter\s*:\s*invert\(1\)/u
    );
    expect(mapView).not.toMatch(
      /(?<!\.sailingloc-map-labels\s)\.leaflet-tile[^}]*\{[^}]*filter\s*:/u
    );
  });

  it('garde les contrôles, popups et marqueurs branchés sur les tokens', () => {
    for (const token of [
      '--sl-surface',
      '--sl-content',
      '--sl-map-available',
      '--sl-map-control',
      '--sl-map-control-text',
      '--sl-map-control-hover',
      '--sl-map-control-hover-text',
      '--sl-map-control-border',
    ]) {
      expect(mapView).toContain(token);
    }
    expect(mapView).toContain('data-marker-availability');
    expect(mapView).toContain('aria-label="${escapeHtml(markerLabel)}"');
  });
});
