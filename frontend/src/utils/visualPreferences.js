export const VISUAL_PREFERENCES_STORAGE_KEY = 'sailingloc:visual-preferences:v1';

export const VISUAL_PREFERENCE_THEMES = Object.freeze(['light', 'dark']);
export const VISUAL_PREFERENCE_COLOR_VISIONS = Object.freeze([
  'standard',
  'protanopia',
  'deuteranopia',
  'tritanopia',
]);

export const DEFAULT_VISUAL_PREFERENCES = Object.freeze({
  theme: 'light',
  colorVision: 'standard',
});

function browserStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function defaultVisualPreferences() {
  return { ...DEFAULT_VISUAL_PREFERENCES };
}

export function normalizeVisualPreferences(value) {
  const preferences = value && typeof value === 'object' ? value : {};
  return {
    theme: VISUAL_PREFERENCE_THEMES.includes(preferences.theme)
      ? preferences.theme
      : DEFAULT_VISUAL_PREFERENCES.theme,
    colorVision: VISUAL_PREFERENCE_COLOR_VISIONS.includes(preferences.colorVision)
      ? preferences.colorVision
      : DEFAULT_VISUAL_PREFERENCES.colorVision,
  };
}

export function parseVisualPreferences(serialized) {
  if (typeof serialized !== 'string' || !serialized.trim()) {
    return defaultVisualPreferences();
  }

  try {
    return normalizeVisualPreferences(JSON.parse(serialized));
  } catch {
    return defaultVisualPreferences();
  }
}

export function readVisualPreferences(storage = browserStorage()) {
  if (!storage || typeof storage.getItem !== 'function') {
    return defaultVisualPreferences();
  }

  try {
    return parseVisualPreferences(storage.getItem(VISUAL_PREFERENCES_STORAGE_KEY));
  } catch {
    return defaultVisualPreferences();
  }
}

export function serializeVisualPreferences(value) {
  return JSON.stringify(normalizeVisualPreferences(value));
}

export function writeVisualPreferences(storage = browserStorage(), value) {
  if (!storage || typeof storage.setItem !== 'function') return false;

  try {
    storage.setItem(VISUAL_PREFERENCES_STORAGE_KEY, serializeVisualPreferences(value));
    return true;
  } catch {
    return false;
  }
}

export function applyVisualPreferences(root, value) {
  const preferences = normalizeVisualPreferences(value);
  if (!root || typeof root.setAttribute !== 'function') return preferences;

  root.setAttribute('data-sailingloc-theme', preferences.theme);
  root.setAttribute('data-sailingloc-color-vision', preferences.colorVision);
  return preferences;
}
