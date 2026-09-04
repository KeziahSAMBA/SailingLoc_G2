/* global document, window */

(function applyStoredVisualPreferences() {
  var storageKey = 'sailingloc:visual-preferences:v1';
  var themes = ['light', 'dark'];
  var colorVisions = ['standard', 'protanopia', 'deuteranopia', 'tritanopia'];
  var preferences = { theme: 'light', colorVision: 'standard' };

  try {
    var serialized = window.localStorage.getItem(storageKey);
    if (serialized) {
      var parsed = JSON.parse(serialized);
      if (parsed && typeof parsed === 'object') {
        preferences.theme = themes.indexOf(parsed.theme) !== -1 ? parsed.theme : 'light';
        preferences.colorVision =
          colorVisions.indexOf(parsed.colorVision) !== -1 ? parsed.colorVision : 'standard';
      }
    }
  } catch {
    preferences = { theme: 'light', colorVision: 'standard' };
  }

  document.documentElement.setAttribute('data-sailingloc-theme', preferences.theme);
  document.documentElement.setAttribute('data-sailingloc-color-vision', preferences.colorVision);
})();
