import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CSS = readFileSync(resolve(ROOT, 'frontend/src/index.css'), 'utf8');
const THEMES = ['light', 'dark'];
const PROFILES = ['protanopia', 'deuteranopia', 'tritanopia'];
const STRUCTURAL = [
  'page',
  'surface',
  'content',
  'content-muted',
  'on-dark',
  'on-light',
  'brand',
  'brand-soft',
  'brand-hover',
  'brand-navy',
  'brand-focus',
  'brand-text',
  'action',
  'action-hover',
  'action-pale',
  'action-soft',
  'action-bright',
  'action-deep',
  'action-text',
  'status-fill-text',
  'calendar-selected-text',
  'glass',
  'overlay',
  'dark-surface',
  'dark-elevated',
  'dark-muted',
  'dark-strong',
  'content-bright',
  'content-light',
  'content-media',
  'content-soft',
  'content-subtle',
  'border-light',
  'field-border',
  'field-border-strong',
  'field-placeholder',
  'field-placeholder-strong',
  'home-sea',
  'home-tint',
  'neutral',
];
const SEMANTIC = [
  'success',
  'success-base',
  'success-bright',
  'success-soft',
  'success-deep',
  'success-surface',
  'success-text',
  'warning',
  'warning-base',
  'warning-bright',
  'warning-soft',
  'warning-pale',
  'warning-deep',
  'warning-surface',
  'warning-text',
  'danger',
  'danger-base',
  'danger-bright',
  'danger-soft',
  'danger-pale',
  'danger-deep',
  'danger-surface',
  'danger-text',
  'info',
  'info-surface',
  'info-text',
  'neutral-surface',
  'neutral-text',
  'map-available',
  'map-unavailable',
  'map-unavailable-strong',
  'chart-primary',
  'chart-hover',
  'chart-violet',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'calendar-border',
  'calendar-title',
  'calendar-muted',
  'calendar-weekday',
  'calendar-disabled',
  'calendar-hover',
  'calendar-available',
  'calendar-available-text',
  'calendar-available-hover',
  'calendar-selected',
  'calendar-range',
  'calendar-range-text',
  'calendar-reserved',
];

function block(selector) {
  const start = CSS.indexOf(selector);
  expect(start).toBeGreaterThanOrEqual(0);
  const open = CSS.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < CSS.length; i += 1) {
    if (CSS[i] === '{') depth += 1;
    if (CSS[i] === '}' && --depth === 0) return CSS.slice(open + 1, i);
  }
  throw new Error(`Bloc non fermé: ${selector}`);
}

function token(source, name) {
  const match = source.match(new RegExp(`--sl-${name}:\\s*([^;]+);`, 'u'));
  expect(match).not.toBeNull();
  return match[1].trim();
}

function rgb(value) {
  return value
    .match(/\d+(?:\.\d+)?/gu)
    .slice(0, 3)
    .map(Number);
}

function luminance(values) {
  return values
    .map((value) => value / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

function blend(value, background) {
  const alpha = value.match(/\/\s*([\d.]+)\s*\)?$/u);
  return alpha
    ? rgb(value).map(
        (channel, i) => channel * Number(alpha[1]) + background[i] * (1 - Number(alpha[1]))
      )
    : rgb(value);
}

function profile(theme, name) {
  return block(`html[data-sailingloc-theme='${theme}'][data-sailingloc-color-vision='${name}']`);
}

describe('palettes complètes des profils daltoniens', () => {
  it('laisse les thèmes standards inchangés et déclare les tokens contextuels', () => {
    const light = block(':root');
    const dark = block("html[data-sailingloc-theme='dark']");
    for (const [source, values, actionText] of [
      [
        light,
        { page: '248 250 252', action: '14 165 233', 'calendar-selected': '2 132 199' },
        '0 0 0',
      ],
      [
        dark,
        { page: '2 6 23', action: '3 105 161', 'calendar-selected': '2 132 199' },
        // Le bouton sombre porte un texte clair ; le test contextuel vérifie
        // le contraste AA de cette combinaison sur le fond sombre.
        'var(--sl-on-dark)',
      ],
    ]) {
      for (const [name, value] of Object.entries(values)) expect(token(source, name)).toBe(value);
      expect(token(source, 'action-text')).toBe(actionText);
      expect(token(source, 'calendar-selected-text')).toBe('0 0 0');
    }
  });

  it('fournit une palette structurelle et sémantique complète pour les six variantes', () => {
    const signatures = [];
    for (const theme of THEMES)
      for (const name of PROFILES) {
        const source = profile(theme, name);
        [...STRUCTURAL, ...SEMANTIC].forEach((key) => token(source, key));
        signatures.push(STRUCTURAL.map((key) => token(source, key)).join('|'));
      }
    expect(new Set(signatures).size).toBe(6);
  });

  it('respecte 4,5:1 pour le texte et 3:1 pour les signaux UI', () => {
    for (const theme of THEMES)
      for (const name of PROFILES) {
        const source = profile(theme, name);
        const page = rgb(token(source, 'page'));
        const surface = rgb(token(source, 'surface'));
        expect(contrast(rgb(token(source, 'content')), page)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(rgb(token(source, 'content-muted')), page)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(rgb(token(source, 'brand')), page)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(rgb(token(source, 'field-placeholder')), surface)).toBeGreaterThanOrEqual(
          4.5
        );
        expect(contrast(rgb(token(source, 'field-border')), surface)).toBeGreaterThanOrEqual(3);
        expect(
          contrast(rgb(token(source, 'field-placeholder-strong')), surface)
        ).toBeGreaterThanOrEqual(4.5);
        expect(contrast(rgb(token(source, 'field-border-strong')), surface)).toBeGreaterThanOrEqual(
          3
        );
        expect(
          contrast(rgb(token(source, 'action-text')), rgb(token(source, 'action')))
        ).toBeGreaterThanOrEqual(4.5);
        for (const name of ['success', 'warning', 'danger', 'info']) {
          expect(
            contrast(
              rgb(token(source, `${name}-text`)),
              blend(token(source, `${name}-surface`), surface)
            )
          ).toBeGreaterThanOrEqual(4.5);
          expect(contrast(rgb(token(source, name)), page)).toBeGreaterThanOrEqual(3);
        }
        for (const group of [
          ['map-available', 'map-unavailable'],
          ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'],
        ]) {
          expect(
            Math.min(...group.map((key) => contrast(rgb(token(source, key)), page)))
          ).toBeGreaterThanOrEqual(3);
        }
        // Les graphiques sont rendus dans les tableaux de bord sur une
        // surface assombrie (et non directement sur le fond de la page).
        // Contrôler ce contexte évite notamment un violet peu visible sur
        // un fond bleu sombre dans les profils daltoniens clairs.
        const darkSurface = rgb(token(source, 'dark-surface'));
        expect(
          Math.min(
            ...['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'].map((key) =>
              contrast(rgb(token(source, key)), darkSurface)
            )
          )
        ).toBeGreaterThanOrEqual(3);
        expect(
          contrast(
            rgb(token(source, 'calendar-available-text')),
            rgb(token(source, 'calendar-available'))
          )
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrast(rgb(token(source, 'calendar-range-text')), rgb(token(source, 'calendar-range')))
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrast(
            rgb(token(source, 'calendar-selected-text')),
            rgb(token(source, 'calendar-selected'))
          )
        ).toBeGreaterThanOrEqual(4.5);
      }
  });

  it('conserve la redondance non chromatique et ne filtre aucun média', () => {
    expect(CSS).not.toMatch(/(?:img|video|picture|canvas|\.leaflet-tile)[^}]*filter:/su);
    expect(CSS).toContain('calendar-day--selected');
    expect(CSS).toContain('calendar-day--disabled');
    expect(CSS).toContain('status-indicator--danger');
  });
});
