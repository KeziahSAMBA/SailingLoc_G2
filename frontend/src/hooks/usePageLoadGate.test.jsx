import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

let notifier;
const onRequestActivity = vi.fn((fn) => {
  notifier = fn;
  return () => {
    notifier = null;
  };
});
const bumpGeneration = vi.fn();
vi.mock('../services/api.js', () => ({ onRequestActivity, bumpGeneration }));

const { usePageLoadGate } = await import('./usePageLoadGate.js');

const SEUIL_LENT = 4000;
const FENETRE = 12000;
const VERIFICATION = 300;
const RETRY = 3000;

const activite = (etat) =>
  act(() =>
    notifier({ pendingCount: 0, oldestPendingAt: null, lastNetworkFailureAt: null, ...etat })
  );

const enLigne = (valeur) =>
  Object.defineProperty(navigator, 'onLine', { value: valeur, configurable: true });

const avancer = (ms) => act(() => vi.advanceTimersByTime(ms));

const monter = (pathname = '/categorie') =>
  renderHook(({ p }) => usePageLoadGate(p), { initialProps: { p: pathname } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers().setSystemTime(new Date('2026-09-02T10:00:00Z'));
  enLigne(true);
});

afterEach(() => {
  vi.useRealTimers();
  enLigne(true);
});

describe('état normal', () => {
  it('ne montre rien quand tout va bien', () => {
    const { result } = monter();
    avancer(VERIFICATION * 2);
    expect(result.current.stuck).toBe(false);
  });

  it('s’abonne à l’activité réseau', () => {
    monter();
    expect(onRequestActivity).toHaveBeenCalled();
  });

  it('se désabonne au démontage', () => {
    monter().unmount();
    expect(notifier).toBeNull();
  });
});

describe('hors ligne', () => {
  it('affiche l’écran dès l’arrivée sur une page', () => {
    enLigne(false);
    expect(monter().result.current.stuck).toBe(true);
  });

  it('le détecte en cours de route', () => {
    const { result } = monter();
    enLigne(false);
    avancer(VERIFICATION);

    expect(result.current.stuck).toBe(true);
  });

  it('le lève dès le retour de la connexion', () => {
    enLigne(false);
    const { result } = monter();

    enLigne(true);
    avancer(VERIFICATION);

    expect(result.current.stuck).toBe(false);
  });
});

// Une requête simplement lente n'est pas une panne : on la laisse aboutir,
// mais au-delà de quatre secondes l'utilisateur mérite un signe de vie.
describe('requête qui traîne', () => {
  it('patiente sous le seuil', () => {
    const { result } = monter();
    activite({ oldestPendingAt: Date.now() - 1000 });
    avancer(VERIFICATION);

    expect(result.current.stuck).toBe(false);
  });

  it('signale au-delà de quatre secondes', () => {
    const { result } = monter();
    activite({ oldestPendingAt: Date.now() - (SEUIL_LENT + 500) });
    avancer(VERIFICATION);

    expect(result.current.stuck).toBe(true);
  });

  // Une requête lente finira peut-être : la relancer perdrait le travail en
  // cours pour rien.
  it('ne relance pas une requête seulement lente', () => {
    monter();
    activite({ oldestPendingAt: Date.now() - (SEUIL_LENT + 500) });
    avancer(RETRY + VERIFICATION);

    expect(bumpGeneration).not.toHaveBeenCalled();
  });
});

// Une panne réseau confirmée reste avalée par les .catch() des pages : rien ne
// la relancerait sans ce mécanisme.
describe('panne confirmée', () => {
  it('affiche l’écran', () => {
    const { result } = monter();
    activite({ lastNetworkFailureAt: Date.now() + 1 });
    avancer(VERIFICATION);

    expect(result.current.stuck).toBe(true);
  });

  it('ignore une panne antérieure à la navigation', () => {
    const { result } = monter();
    activite({ lastNetworkFailureAt: Date.now() - 60000 });
    avancer(VERIFICATION);

    expect(result.current.stuck).toBe(false);
  });

  it('remonte la page pour retenter', () => {
    const { result } = monter();
    const cle = result.current.routerKey;
    activite({ lastNetworkFailureAt: Date.now() + 1 });

    avancer(RETRY);

    expect(bumpGeneration).toHaveBeenCalled();
    expect(result.current.routerKey).toBeGreaterThan(cle);
  });

  it('retente aussi tant qu’on est hors ligne', () => {
    enLigne(false);
    const { result } = monter();
    const cle = result.current.routerKey;

    avancer(RETRY);

    expect(result.current.routerKey).toBeGreaterThan(cle);
  });
});

// L'application sonde la messagerie toutes les quatre secondes : surveiller en
// continu déclencherait l'écran en pleine navigation déjà terminée.
describe('fenêtre de surveillance', () => {
  it('cesse d’observer au bout de douze secondes', () => {
    const { result } = monter();

    avancer(FENETRE + VERIFICATION);
    activite({ oldestPendingAt: Date.now() - 60000 });
    avancer(VERIFICATION * 2);

    expect(result.current.stuck).toBe(false);
  });

  it('lève l’écran en se désarmant', () => {
    enLigne(false);
    const { result } = monter();
    expect(result.current.stuck).toBe(true);

    avancer(FENETRE + VERIFICATION);
    expect(result.current.stuck).toBe(false);
  });

  it('se réarme à chaque nouvelle page', () => {
    const { result, rerender } = monter('/categorie');
    avancer(FENETRE + VERIFICATION);

    enLigne(false);
    rerender({ p: '/product/42' });

    expect(result.current.stuck).toBe(true);
  });
});

describe('retour de connexion', () => {
  it('retente sans attendre le prochain cycle', () => {
    const { result } = monter();
    const cle = result.current.routerKey;

    act(() => window.dispatchEvent(new Event('offline')));
    act(() => window.dispatchEvent(new Event('online')));

    expect(bumpGeneration).toHaveBeenCalled();
    expect(result.current.routerKey).toBeGreaterThan(cle);
  });

  it('ignore un retour de connexion sans coupure préalable', () => {
    const { result } = monter();
    const cle = result.current.routerKey;

    act(() => window.dispatchEvent(new Event('online')));

    expect(result.current.routerKey).toBe(cle);
  });

  it('ne retente qu’une fois par coupure', () => {
    monter();

    act(() => window.dispatchEvent(new Event('offline')));
    act(() => window.dispatchEvent(new Event('online')));
    act(() => window.dispatchEvent(new Event('online')));

    expect(bumpGeneration).toHaveBeenCalledTimes(1);
  });

  it('cesse d’écouter au démontage', () => {
    const { unmount } = monter();
    unmount();

    act(() => window.dispatchEvent(new Event('offline')));
    act(() => window.dispatchEvent(new Event('online')));

    expect(bumpGeneration).not.toHaveBeenCalled();
  });
});

// Sans cette distinction, l'écran clignoterait à chaque tentative : en ligne
// mais serveur injoignable, l'état repasserait à « tout va bien » le temps que
// la nouvelle requête échoue à son tour.
describe('retry contre vraie navigation', () => {
  it('ne remet pas l’écran à zéro sur une simple nouvelle tentative', () => {
    enLigne(false);
    const { result } = monter();
    expect(result.current.stuck).toBe(true);

    enLigne(true);
    activite({ lastNetworkFailureAt: Date.now() + 1 });
    avancer(RETRY);

    expect(result.current.stuck).toBe(true);
  });
});
