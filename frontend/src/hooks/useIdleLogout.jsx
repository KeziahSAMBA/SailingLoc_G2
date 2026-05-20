import { useEffect } from 'react';

const STORAGE_KEY = 'sl_last_activity';
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
const WRITE_THROTTLE_MS = 5_000;

export function useIdleLogout({ enabled, timeoutMs, onIdle, checkIntervalMs = 60_000 }) {
  useEffect(() => {
    if (!enabled) return undefined;

    let lastWrite = 0;
    const markActive = () => {
      const now = Date.now();
      if (now - lastWrite < WRITE_THROTTLE_MS) return;
      lastWrite = now;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // localStorage indisponible (mode privé strict, etc.) — on ignore.
      }
    };

    // Initialise pour ne pas se déconnecter immédiatement si l'entrée est vide.
    markActive();

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }));

    const intervalId = setInterval(() => {
      const stored = Number(window.localStorage.getItem(STORAGE_KEY)) || Date.now();
      if (Date.now() - stored >= timeoutMs) {
        window.localStorage.removeItem(STORAGE_KEY);
        onIdle();
      }
    }, checkIntervalMs);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActive));
      clearInterval(intervalId);
    };
  }, [enabled, timeoutMs, onIdle, checkIntervalMs]);
}
