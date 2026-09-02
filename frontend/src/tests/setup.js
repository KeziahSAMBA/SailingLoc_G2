import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom ne fournit ni observateur d'intersection, ni API d'animation, ni
// correspondance de media query : 21 fichiers du projet s'en servent et
// lèveraient une ReferenceError au montage. On les remplace ici une fois pour
// toutes plutôt que dans chaque test.
class ObserverVide {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

vi.stubGlobal('IntersectionObserver', ObserverVide);
vi.stubGlobal('ResizeObserver', ObserverVide);

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
}

if (!window.scrollTo) window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});
