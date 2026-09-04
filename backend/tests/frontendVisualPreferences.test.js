import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyVisualPreferences,
  DEFAULT_VISUAL_PREFERENCES,
  normalizeVisualPreferences,
  parseVisualPreferences,
  readVisualPreferences,
  serializeVisualPreferences,
  VISUAL_PREFERENCES_STORAGE_KEY,
  writeVisualPreferences,
} from '../../frontend/src/utils/visualPreferences.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.has(key) ? this.#values.get(key) : null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }
}

function source(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

describe('préférences visuelles persistées', () => {
  it('normalise strictement les thèmes et profils autorisés', () => {
    expect(normalizeVisualPreferences({ theme: 'dark', colorVision: 'tritanopia' })).toEqual({
      theme: 'dark',
      colorVision: 'tritanopia',
    });
    expect(normalizeVisualPreferences({ theme: 'night', colorVision: 'unknown' })).toEqual(
      DEFAULT_VISUAL_PREFERENCES
    );
    expect(normalizeVisualPreferences(null)).toEqual(DEFAULT_VISUAL_PREFERENCES);
  });

  it('utilise le repli clair standard pour les données absentes ou invalides', () => {
    expect(parseVisualPreferences(null)).toEqual(DEFAULT_VISUAL_PREFERENCES);
    expect(parseVisualPreferences('')).toEqual(DEFAULT_VISUAL_PREFERENCES);
    expect(parseVisualPreferences('{invalid')).toEqual(DEFAULT_VISUAL_PREFERENCES);
    expect(parseVisualPreferences('{"theme":"dark","colorVision":"nope"}')).toEqual({
      theme: 'dark',
      colorVision: 'standard',
    });
  });

  it('persiste uniquement la version normalisée sous la clé dédiée', () => {
    const storage = new MemoryStorage();

    expect(
      writeVisualPreferences(storage, { theme: 'dark', colorVision: 'deuteranopia', extra: true })
    ).toBe(true);
    expect(storage.getItem(VISUAL_PREFERENCES_STORAGE_KEY)).toBe(
      '{"theme":"dark","colorVision":"deuteranopia"}'
    );
    expect(readVisualPreferences(storage)).toEqual({
      theme: 'dark',
      colorVision: 'deuteranopia',
    });
    expect(serializeVisualPreferences({ theme: 'invalid' })).toBe(
      '{"theme":"light","colorVision":"standard"}'
    );
  });

  it('applique les attributs de préférence sur la racine du document', () => {
    const attributes = new Map();
    const root = {
      setAttribute(name, value) {
        attributes.set(name, value);
      },
    };

    expect(applyVisualPreferences(root, { theme: 'dark', colorVision: 'protanopia' })).toEqual({
      theme: 'dark',
      colorVision: 'protanopia',
    });
    expect(attributes).toEqual(
      new Map([
        ['data-sailingloc-theme', 'dark'],
        ['data-sailingloc-color-vision', 'protanopia'],
      ])
    );
  });
});

describe('intégration statique des préférences visuelles', () => {
  it('charge le script same-origin avant le point d’entrée React', () => {
    const index = source('frontend/index.html');
    const staticScript = source('frontend/public/visual-preferences.js');
    const staticScriptPosition = index.indexOf('<script src="/visual-preferences.js"></script>');
    const modulePosition = index.indexOf('<script type="module" src="/src/main.jsx"></script>');

    expect(staticScriptPosition).toBeGreaterThan(-1);
    expect(staticScriptPosition).toBeLessThan(modulePosition);
    expect(staticScript).toContain(`'${VISUAL_PREFERENCES_STORAGE_KEY}'`);
    expect(staticScript).toContain("'data-sailingloc-theme'");
    expect(staticScript).toContain("'data-sailingloc-color-vision'");
    expect(index).not.toMatch(/<script>(?![^<]*src=)/u);
  });

  it('expose la synchronisation storage et l’application avant peinture dans le fournisseur', () => {
    const provider = source('frontend/src/context/VisualPreferencesContext.jsx');

    expect(provider).toContain('useLayoutEffect');
    expect(provider).toContain("window.addEventListener('storage'");
    expect(provider).toContain('parseVisualPreferences(event.newValue)');
    expect(provider).toContain('writeVisualPreferences(undefined, preferences)');
    expect(provider).toContain('applyVisualPreferences(document.documentElement, preferences)');
  });

  it('garde trois profils verticaux, exclusifs et accessibles dans SettingsMenu', () => {
    const settings = source('frontend/src/components/common/Header/shared/SettingsMenu.jsx');
    const profilesBlock = settings.match(/const COLOR_VISION_PROFILES = \[(.*?)\];/su)?.[1];

    expect(profilesBlock).toBeTruthy();
    expect(profilesBlock.match(/value: '/gu)).toHaveLength(3);
    expect(settings).toContain('useId()');
    expect(settings).toContain('FiMoon');
    expect(settings).toContain('FiSun');
    expect(settings).toContain("aria-pressed={theme === 'dark'}");
    expect(settings).toContain("aria-pressed={colorVision !== 'standard'}");
    expect(settings).toContain('aria-hidden={!colorVisionOpen}');
    expect(settings).toContain('tabIndex={colorVisionOpen ? 0 : -1}');
    expect(settings).toContain('grid-rows-[0fr]');
    expect(settings).toContain('grid-rows-[1fr]');
    expect(settings).toContain('duration-[180ms]');
    expect(settings).toContain('motion-reduce:transition-none');
    expect(settings).toContain('activeGlassesButtonRef.current?.focus()');
  });

  it('intègre le sélecteur sous le header et réserve sa hauteur dans le flux', () => {
    const settings = source('frontend/src/components/common/Header/shared/SettingsMenu.jsx');
    const shell = source('frontend/src/components/common/Header/shared/HeaderShell.jsx');
    const clickOutside = source('frontend/src/components/common/Header/shared/useClickOutside.js');

    expect(settings).toContain('createPortal');
    expect(settings).toContain('panelContainerRef');
    expect(settings).toContain('data-visual-settings-panel');
    expect(settings).toContain('grid-cols-1');
    expect(settings).toContain('sm:grid-cols-4');
    expect(settings).not.toMatch(/className=.*absolute.*settings/u);
    expect(shell).toContain('settingsPanelRef');
    expect(shell).toContain('settingsOpen');
    expect(shell).toContain('settingsHeight');
    expect(shell).toContain('aria-hidden={!settingsOpen}');
    expect(clickOutside).toContain('Array.isArray(ref)');
  });

  it('expose les panneaux de navigation et les retire de la tabulation lorsqu’ils sont fermés', () => {
    const publicHeader = source('frontend/src/components/common/Header/Header.jsx');
    const dashboardHeader = source('frontend/src/components/common/Header/DashboardHeader.jsx');
    const sidePanel = source('frontend/src/components/common/Header/shared/SidePanel.jsx');

    expect(publicHeader).toContain('aria-expanded={menuOpen}');
    expect(publicHeader).toContain('aria-controls={menuPanelId}');
    expect(dashboardHeader).toContain('aria-expanded={navOpen}');
    expect(dashboardHeader).toContain('aria-controls={navPanelId}');
    expect(dashboardHeader).toContain('aria-expanded={rightMenuOpen}');
    expect(dashboardHeader).toContain('aria-controls={rightPanelId}');
    expect(sidePanel).toContain('aria-hidden={!open}');
    expect(sidePanel).toContain('panelRef.current.inert = !open');
  });
});
