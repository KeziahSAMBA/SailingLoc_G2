import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  applyVisualPreferences,
  DEFAULT_VISUAL_PREFERENCES,
  normalizeVisualPreferences,
  parseVisualPreferences,
  readVisualPreferences,
  writeVisualPreferences,
  VISUAL_PREFERENCES_STORAGE_KEY,
} from '../utils/visualPreferences.js';

const VisualPreferencesContext = createContext(null);

export function VisualPreferencesProvider({ children }) {
  const [preferences, setPreferencesState] = useState(readVisualPreferences);

  const updatePreferences = useCallback((update) => {
    setPreferencesState((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      return normalizeVisualPreferences({ ...current, ...(next || {}) });
    });
  }, []);

  const setTheme = useCallback((theme) => updatePreferences({ theme }), [updatePreferences]);

  const setColorVision = useCallback(
    (colorVision) => updatePreferences({ colorVision }),
    [updatePreferences]
  );

  const resetPreferences = useCallback(
    () => setPreferencesState({ ...DEFAULT_VISUAL_PREFERENCES }),
    []
  );

  useLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      applyVisualPreferences(document.documentElement, preferences);
    }
  }, [preferences]);

  useEffect(() => {
    writeVisualPreferences(undefined, preferences);
  }, [preferences]);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== VISUAL_PREFERENCES_STORAGE_KEY) return;
      setPreferencesState(parseVisualPreferences(event.newValue));
    }

    if (typeof window === 'undefined') return undefined;
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo(
    () => ({
      ...preferences,
      preferences,
      setTheme,
      setColorVision,
      resetPreferences,
    }),
    [preferences, resetPreferences, setColorVision, setTheme]
  );

  return (
    <VisualPreferencesContext.Provider value={value}>{children}</VisualPreferencesContext.Provider>
  );
}

export function useVisualPreferences() {
  const context = useContext(VisualPreferencesContext);
  if (!context) {
    throw new Error('useVisualPreferences doit être utilisé dans VisualPreferencesProvider.');
  }
  return context;
}
