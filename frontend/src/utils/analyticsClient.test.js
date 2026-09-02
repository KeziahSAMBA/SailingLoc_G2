import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Le module retient son état de chargement : chaque test le réimporte à neuf
// pour ne pas hériter d'un Matomo déjà chargé par le test précédent.
async function moduleNeuf(url = 'https://matomo.example.com') {
  vi.resetModules();
  // stubEnv(nom, undefined) ne retire pas la variable : pour simuler une
  // instance non configurée, il faut la vider explicitement.
  vi.stubEnv('VITE_MATOMO_URL', url ?? '');
  return import('./analyticsClient.js');
}

const commandes = () => window._paq ?? [];
const commande = (nom) => commandes().filter((c) => c[0] === nom);

beforeEach(() => {
  window._paq = [];
  document.head.querySelectorAll('script').forEach((s) => s.remove());
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('chargement du traceur', () => {
  it('injecte le script depuis l’instance configurée', async () => {
    const { loadMatomo } = await moduleNeuf();
    loadMatomo();

    const script = document.head.querySelector('script[src*="matomo.js"]');
    expect(script).not.toBeNull();
    expect(script.src).toBe('https://matomo.example.com/matomo.js');
    expect(script.async).toBe(true);
  });

  it('déclare l’adresse de collecte et l’identifiant du site', async () => {
    const { loadMatomo } = await moduleNeuf();
    loadMatomo();

    expect(commande('setTrackerUrl')[0][1]).toBe('https://matomo.example.com/matomo.php');
    expect(commande('setSiteId')[0][1]).toBe('1');
    expect(commande('enableLinkTracking')).toHaveLength(1);
  });

  it('normalise une adresse terminée par des barres obliques', async () => {
    const { loadMatomo } = await moduleNeuf('https://matomo.example.com///');
    loadMatomo();

    expect(commande('setTrackerUrl')[0][1]).toBe('https://matomo.example.com/matomo.php');
  });

  it('ne charge le script qu’une seule fois', async () => {
    const { loadMatomo } = await moduleNeuf();
    loadMatomo();
    loadMatomo();

    expect(document.head.querySelectorAll('script[src*="matomo.js"]')).toHaveLength(1);
  });

  // Matomo n'est pas déployé partout : sans adresse, le module doit se taire
  // au lieu d'injecter un script vers nulle part.
  it('ne fait rien sans instance configurée', async () => {
    const { loadMatomo } = await moduleNeuf('');
    loadMatomo();

    expect(document.head.querySelector('script[src*="matomo.js"]')).toBeNull();
  });

  it('n’enregistre rien non plus sans instance configurée', async () => {
    const { loadMatomo, trackPageView } = await moduleNeuf('');
    loadMatomo();
    trackPageView('/categorie');

    expect(commandes()).toHaveLength(0);
  });
});

// Conformité CNIL : rien ne part tant que la finalité « mesure d'audience »
// n'est pas accordée, c'est-à-dire tant que loadMatomo n'a pas été appelé.
describe('avant consentement', () => {
  it('n’enregistre aucune vue de page', async () => {
    const { trackPageView } = await moduleNeuf();
    trackPageView('/categorie');

    expect(commandes()).toHaveLength(0);
  });

  it('n’enregistre aucune recherche', async () => {
    const { trackSiteSearch } = await moduleNeuf();
    trackSiteSearch('Marseille', 12);

    expect(commandes()).toHaveLength(0);
  });
});

describe('enregistrement des vues', () => {
  it('déclare l’adresse et le titre de la page', async () => {
    const { loadMatomo, trackPageView } = await moduleNeuf();
    loadMatomo();
    document.title = 'Catalogue';

    trackPageView('/categorie');

    expect(commande('setCustomUrl')[0][1]).toBe('/categorie');
    expect(commande('setDocumentTitle')[0][1]).toBe('Catalogue');
    expect(commande('trackPageView')).toHaveLength(1);
  });

  // Notre paramètre d'URL s'appelle « destination » : Matomo ne reconnaîtrait
  // pas nos recherches tout seul.
  it('déclare explicitement une recherche interne', async () => {
    const { loadMatomo, trackSiteSearch } = await moduleNeuf();
    loadMatomo();

    trackSiteSearch('Marseille', 12);

    expect(commande('trackSiteSearch')[0]).toEqual(['trackSiteSearch', 'Marseille', false, 12]);
  });
});

// Retirer son accord doit tout arrêter et effacer ce qui a déjà été posé.
describe('retrait du consentement', () => {
  it('cesse d’enregistrer les vues', async () => {
    const { loadMatomo, disableMatomo, trackPageView } = await moduleNeuf();
    loadMatomo();
    disableMatomo();
    window._paq = [];

    trackPageView('/categorie');
    expect(commandes()).toHaveLength(0);
  });

  it('cesse d’enregistrer les recherches', async () => {
    const { loadMatomo, disableMatomo, trackSiteSearch } = await moduleNeuf();
    loadMatomo();
    disableMatomo();
    window._paq = [];

    trackSiteSearch('Marseille', 12);
    expect(commandes()).toHaveLength(0);
  });

  it('supprime les cookies déjà posés par Matomo', async () => {
    const { loadMatomo, disableMatomo } = await moduleNeuf();
    loadMatomo();
    document.cookie = '_pk_id.1.abcd=valeur; path=/';
    document.cookie = '_pk_ses.1.abcd=valeur; path=/';

    disableMatomo();

    expect(document.cookie).not.toContain('_pk_id');
    expect(document.cookie).not.toContain('_pk_ses');
  });

  it('épargne les cookies qui ne sont pas les siens', async () => {
    const { loadMatomo, disableMatomo } = await moduleNeuf();
    loadMatomo();
    document.cookie = 'sailingloc_lang=fr; path=/';

    disableMatomo();

    expect(document.cookie).toContain('sailingloc_lang');
  });

  it('ne fait rien si le traceur n’a jamais été chargé', async () => {
    const { disableMatomo } = await moduleNeuf();
    document.cookie = '_pk_id.1.abcd=valeur; path=/';

    disableMatomo();

    expect(document.cookie).toContain('_pk_id');
  });

  // Un utilisateur peut refuser puis se raviser dans le panneau de préférences.
  it('reprend les envois si l’accord est redonné', async () => {
    const { loadMatomo, disableMatomo, trackPageView } = await moduleNeuf();
    loadMatomo();
    disableMatomo();
    loadMatomo();
    window._paq = [];

    trackPageView('/categorie');
    expect(commande('trackPageView')).toHaveLength(1);
  });
});
