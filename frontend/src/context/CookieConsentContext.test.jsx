import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useContext } from 'react';
import CookieConsentContext, {
  CookieConsentProvider,
  PURPOSES,
  getStoredConsent,
} from './CookieConsentContext.jsx';

const KEY = 'sailingloc_cookie_consent';
const VERSION = 2;
const TTL_MS = 6 * 30 * 24 * 60 * 60 * 1000;

const stocker = (valeur) => localStorage.setItem(KEY, JSON.stringify(valeur));
const lire = () => JSON.parse(localStorage.getItem(KEY));

const choixValide = (purposes, date = new Date().toISOString()) => ({
  version: VERSION,
  date,
  purposes,
});

const monter = () =>
  renderHook(() => useContext(CookieConsentContext), {
    wrapper: CookieConsentProvider,
  });

afterEach(() => {
  vi.useRealTimers();
});

describe('finalités déclarées', () => {
  it('couvre les trois finalités non essentielles', () => {
    expect(PURPOSES).toEqual(['analytics', 'ads', 'personalization']);
  });
});

// Recommandation CNIL : rien ne se dépose tant que l'utilisateur n'a pas
// choisi. L'absence de consentement valide doit donc rendre null, jamais un
// objet permissif par défaut.
describe('getStoredConsent — absence de choix valide', () => {
  it.each([
    ['rien de stocké', null],
    ['contenu illisible', 'pas du JSON'],
  ])('rend null : %s', (_label, brut) => {
    if (brut !== null) localStorage.setItem(KEY, brut);
    expect(getStoredConsent()).toBeNull();
  });

  it('rend null pour une version de consentement obsolète', () => {
    stocker({ ...choixValide({ analytics: true }), version: 1 });
    expect(getStoredConsent()).toBeNull();
  });

  it('rend null quand la date manque', () => {
    stocker({ version: VERSION, purposes: { analytics: true } });
    expect(getStoredConsent()).toBeNull();
  });

  it('rend null quand la date est illisible', () => {
    stocker(choixValide({ analytics: true }, 'hier'));
    expect(getStoredConsent()).toBeNull();
  });

  it('rend null passé les six mois', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-02T10:00:00Z'));
    stocker(choixValide({ analytics: true }, new Date('2026-01-01T10:00:00Z').toISOString()));
    expect(getStoredConsent()).toBeNull();
  });

  it('conserve le choix avant l’échéance', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-02T10:00:00Z'));
    const date = new Date(Date.now() - TTL_MS + 86400000).toISOString();
    stocker(choixValide({ analytics: true }, date));
    expect(getStoredConsent()).toMatchObject({ analytics: true });
  });
});

describe('getStoredConsent — lecture d’un choix valide', () => {
  it('restitue les finalités acceptées', () => {
    stocker(choixValide({ analytics: true, ads: false, personalization: false }));
    expect(getStoredConsent()).toEqual({
      analytics: true,
      ads: false,
      personalization: false,
    });
  });

  // Une finalité ajoutée après coup ne doit pas hériter d'un « oui » implicite
  // du consentement déjà stocké.
  it('considère comme refusée toute finalité absente du choix stocké', () => {
    stocker(choixValide({ analytics: true }));
    expect(getStoredConsent()).toEqual({
      analytics: true,
      ads: false,
      personalization: false,
    });
  });
});

describe('bannière à l’ouverture', () => {
  it('n’expose aucun consentement sans choix préalable', () => {
    expect(monter().result.current.consent).toBeNull();
  });

  it('reprend le choix déjà enregistré', () => {
    stocker(choixValide({ analytics: true, ads: false, personalization: false }));
    expect(monter().result.current.consent).toMatchObject({ analytics: true });
  });

  it('garde le panneau de préférences fermé', () => {
    expect(monter().result.current.preferencesOpen).toBe(false);
  });
});

describe('choix de l’utilisateur', () => {
  it('accepte toutes les finalités', () => {
    const { result } = monter();
    act(() => result.current.acceptAll());

    expect(result.current.consent).toEqual({
      analytics: true,
      ads: true,
      personalization: true,
    });
  });

  // Le bouton « Refuser » doit produire un enregistrement, au même titre que
  // « Accepter » : sans lui, la bannière reviendrait à chaque visite et le
  // refus ne serait pas respecté.
  it('refuse toutes les finalités, et l’enregistre', () => {
    const { result } = monter();
    act(() => result.current.refuseAll());

    expect(result.current.consent).toEqual({
      analytics: false,
      ads: false,
      personalization: false,
    });
    expect(lire().purposes).toEqual({
      analytics: false,
      ads: false,
      personalization: false,
    });
  });

  it('enregistre un choix partiel', () => {
    const { result } = monter();
    act(() => result.current.savePreferences({ analytics: true }));

    expect(result.current.consent).toEqual({
      analytics: true,
      ads: false,
      personalization: false,
    });
  });

  it('horodate et versionne l’enregistrement', () => {
    const { result } = monter();
    act(() => result.current.acceptAll());

    expect(lire()).toMatchObject({ version: VERSION });
    expect(Number.isNaN(new Date(lire().date).getTime())).toBe(false);
  });

  it('permet de revenir sur un choix', () => {
    const { result } = monter();
    act(() => result.current.acceptAll());
    act(() => result.current.refuseAll());

    expect(result.current.consent.analytics).toBe(false);
  });
});

describe('panneau de préférences', () => {
  it('s’ouvre à la demande', () => {
    const { result } = monter();
    act(() => result.current.openPreferences());
    expect(result.current.preferencesOpen).toBe(true);
  });

  it('se referme à la demande', () => {
    const { result } = monter();
    act(() => result.current.openPreferences());
    act(() => result.current.closePreferences());
    expect(result.current.preferencesOpen).toBe(false);
  });

  it('se referme dès qu’un choix est enregistré', () => {
    const { result } = monter();
    act(() => result.current.openPreferences());
    act(() => result.current.savePreferences({ analytics: true }));

    expect(result.current.preferencesOpen).toBe(false);
  });
});

describe('valeur par défaut du contexte', () => {
  // Un composant monté hors du fournisseur ne doit pas faire tomber l'écran.
  it('expose des fonctions inertes sans fournisseur', () => {
    const { result } = renderHook(() => useContext(CookieConsentContext));

    expect(result.current.consent).toBeNull();
    expect(() => {
      result.current.acceptAll();
      result.current.refuseAll();
      result.current.savePreferences({});
      result.current.openPreferences();
      result.current.closePreferences();
    }).not.toThrow();
  });
});
