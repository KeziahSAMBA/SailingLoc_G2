import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  saveReservationResume,
  loadReservationResume,
  clearReservationResume,
} from './reservationResume.js';

const KEY = 'sailingloc:reservation-resume';
const TTL_MS = 15 * 60 * 1000;
const etat = { path: '/reservation/12', step: 2, id_booking: 12 };

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('sauvegarde et relecture', () => {
  it('restitue l’état enregistré', () => {
    saveReservationResume(etat);
    expect(loadReservationResume()).toMatchObject(etat);
  });

  it('horodate la sauvegarde', () => {
    saveReservationResume(etat);
    expect(loadReservationResume().savedAt).toBeTypeOf('number');
  });

  it('rend null quand rien n’est enregistré', () => {
    expect(loadReservationResume()).toBeNull();
  });

  it('écrase la sauvegarde précédente', () => {
    saveReservationResume(etat);
    saveReservationResume({ ...etat, step: 3 });
    expect(loadReservationResume().step).toBe(3);
  });
});

describe('expiration au bout de quinze minutes', () => {
  it('conserve l’état juste avant l’échéance', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-02T10:00:00Z'));
    saveReservationResume(etat);

    vi.setSystemTime(new Date('2026-09-02T10:00:00Z').getTime() + TTL_MS - 1000);
    expect(loadReservationResume()).toMatchObject(etat);
  });

  it('accepte l’instant exact de l’échéance', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-02T10:00:00Z'));
    saveReservationResume(etat);

    vi.setSystemTime(new Date('2026-09-02T10:00:00Z').getTime() + TTL_MS);
    expect(loadReservationResume()).toMatchObject(etat);
  });

  it('abandonne l’état passé l’échéance', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-02T10:00:00Z'));
    saveReservationResume(etat);

    vi.setSystemTime(new Date('2026-09-02T10:00:00Z').getTime() + TTL_MS + 1000);
    expect(loadReservationResume()).toBeNull();
  });

  // Un état périmé qui resterait en place serait relu à chaque chargement : la
  // relecture doit aussi nettoyer.
  it('purge le stockage en même temps', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-02T10:00:00Z'));
    saveReservationResume(etat);

    vi.setSystemTime(new Date('2026-09-02T11:00:00Z'));
    loadReservationResume();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe('entrées invalides', () => {
  it('ignore un contenu illisible', () => {
    localStorage.setItem(KEY, 'ceci n’est pas du JSON');
    expect(loadReservationResume()).toBeNull();
  });

  it('ignore un état sans chemin de reprise', () => {
    localStorage.setItem(KEY, JSON.stringify({ step: 2, savedAt: Date.now() }));
    expect(loadReservationResume()).toBeNull();
  });

  it('ignore un état sans horodatage', () => {
    localStorage.setItem(KEY, JSON.stringify({ path: '/reservation/12' }));
    expect(loadReservationResume()).toBeNull();
  });
});

describe('purge explicite', () => {
  it('efface l’état enregistré', () => {
    saveReservationResume(etat);
    clearReservationResume();
    expect(loadReservationResume()).toBeNull();
  });

  it('ne se plaint pas s’il n’y a rien à effacer', () => {
    expect(() => clearReservationResume()).not.toThrow();
  });
});

// En navigation privée, l'accès au stockage peut lever. Perdre la reprise est
// acceptable ; faire échouer le tunnel de réservation ne l'est pas.
describe('stockage indisponible', () => {
  it('n’échoue pas à la sauvegarde', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('accès refusé');
    });
    expect(() => saveReservationResume(etat)).not.toThrow();
  });

  it('rend null à la relecture', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('accès refusé');
    });
    expect(loadReservationResume()).toBeNull();
  });

  it('n’échoue pas à la purge', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('accès refusé');
    });
    expect(() => clearReservationResume()).not.toThrow();
  });
});
