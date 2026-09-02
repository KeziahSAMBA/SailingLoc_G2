import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useIdleLogout } from './useIdleLogout.jsx';

const KEY = 'sl_last_activity';
const TIMEOUT = 30 * 60 * 1000;
const INTERVALLE = 60_000;

const monter = (options = {}) => {
  const onIdle = vi.fn();
  const rendu = renderHook((props) => useIdleLogout(props), {
    initialProps: { enabled: true, timeoutMs: TIMEOUT, onIdle, ...options },
  });
  return { ...rendu, onIdle };
};

const avancer = (ms) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers().setSystemTime(new Date('2026-09-02T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('activation', () => {
  it('note l’activité dès le montage', () => {
    monter();
    expect(localStorage.getItem(KEY)).toBe(String(Date.now()));
  });

  // Sans cette initialisation, une entrée absente ferait lire zéro et
  // déconnecterait l'utilisateur à la première vérification.
  it('ne déconnecte pas immédiatement', () => {
    const { onIdle } = monter();
    avancer(INTERVALLE);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('ne surveille rien tant qu’aucun utilisateur n’est connecté', () => {
    const { onIdle } = monter({ enabled: false });
    avancer(TIMEOUT * 2);

    expect(localStorage.getItem(KEY)).toBeNull();
    expect(onIdle).not.toHaveBeenCalled();
  });
});

describe('déconnexion après inactivité', () => {
  it('laisse tranquille avant l’échéance', () => {
    const { onIdle } = monter();
    avancer(TIMEOUT - INTERVALLE);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('déconnecte une fois le délai écoulé', () => {
    const { onIdle } = monter();
    avancer(TIMEOUT + INTERVALLE);
    expect(onIdle).toHaveBeenCalled();
  });

  it('efface la trace d’activité en déconnectant', () => {
    monter();
    avancer(TIMEOUT + INTERVALLE);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('respecte un intervalle de vérification personnalisé', () => {
    const { onIdle } = monter({ timeoutMs: 5000, checkIntervalMs: 1000 });
    avancer(6000);
    expect(onIdle).toHaveBeenCalled();
  });
});

describe('activité de l’utilisateur', () => {
  it.each(['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'])(
    'repousse l’échéance sur %s',
    (evenement) => {
      const { onIdle } = monter();

      avancer(TIMEOUT - INTERVALLE);
      act(() => window.dispatchEvent(new Event(evenement)));
      avancer(INTERVALLE * 2);

      expect(onIdle).not.toHaveBeenCalled();
    }
  );

  // Un mousemove se déclenche des dizaines de fois par seconde : écrire à
  // chaque fois saturerait le stockage sans rien apporter.
  it('n’écrit pas plus d’une fois toutes les cinq secondes', () => {
    monter();
    const initial = localStorage.getItem(KEY);

    avancer(1000);
    act(() => window.dispatchEvent(new Event('mousemove')));
    expect(localStorage.getItem(KEY)).toBe(initial);

    avancer(5000);
    act(() => window.dispatchEvent(new Event('mousemove')));
    expect(localStorage.getItem(KEY)).not.toBe(initial);
  });

  // L'horodatage passe par localStorage : une activité dans un onglet doit
  // maintenir la session des autres.
  it('accepte une activité venue d’un autre onglet', () => {
    const { onIdle } = monter();

    avancer(TIMEOUT - INTERVALLE);
    localStorage.setItem(KEY, String(Date.now()));
    avancer(INTERVALLE * 2);

    expect(onIdle).not.toHaveBeenCalled();
  });
});

describe('démontage', () => {
  it('cesse de surveiller', () => {
    const { onIdle, unmount } = monter();
    unmount();
    avancer(TIMEOUT * 2);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('retire ses écouteurs d’événements', () => {
    const retirer = vi.spyOn(window, 'removeEventListener');
    monter().unmount();

    for (const evt of ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']) {
      expect(retirer).toHaveBeenCalledWith(evt, expect.any(Function));
    }
  });

  it('repart à neuf quand la surveillance est réarmée', () => {
    const { rerender, onIdle } = monter();

    rerender({ enabled: false, timeoutMs: TIMEOUT, onIdle });
    avancer(TIMEOUT * 2);
    expect(onIdle).not.toHaveBeenCalled();

    rerender({ enabled: true, timeoutMs: TIMEOUT, onIdle });
    avancer(INTERVALLE);
    expect(onIdle).not.toHaveBeenCalled();
  });
});

// En navigation privée stricte, l'accès au stockage lève. La session ne doit
// pas se rompre pour autant, ni le minuteur cesser de fonctionner.
describe('stockage indisponible', () => {
  it('n’échoue pas à l’écriture', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('accès refusé');
    });
    expect(() => monter()).not.toThrow();
  });

  it('se rabat sur l’activité gardée en mémoire', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('accès refusé');
    });
    const { onIdle } = monter();

    avancer(INTERVALLE);
    expect(onIdle).not.toHaveBeenCalled();

    avancer(TIMEOUT);
    expect(onIdle).toHaveBeenCalled();
  });

  it('déconnecte même si la trace ne peut pas être effacée', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('accès refusé');
    });
    const { onIdle } = monter();

    avancer(TIMEOUT + INTERVALLE);
    expect(onIdle).toHaveBeenCalled();
  });
});
