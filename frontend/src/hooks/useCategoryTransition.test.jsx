import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const navigate = vi.fn();
let chemin = '/';
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: chemin }),
}));

const T = await import('./useCategoryTransition.js');

const reduitLesAnimations = (valeur) => {
  window.matchMedia = (query) => ({
    matches: valeur,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  chemin = '/';
  reduitLesAnimations(false);
  T.clearTransitionPayload();
  T.unlockScroll();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// La position de la barre de recherche doit survivre au démontage de la page de
// départ pour que l'animation FLIP reprenne où elle en était : un état React
// n'y survivrait pas, d'où ce relais au niveau du module.
describe('relais de position entre deux pages', () => {
  it('restitue la donnée à la page destinataire', () => {
    T.setTransitionPayload('categorie', { rect: { top: 10 } });
    expect(T.readTransitionPayload('categorie')).toMatchObject({
      target: 'categorie',
      rect: { top: 10 },
    });
  });

  it('ne livre rien à une autre page que la destinataire', () => {
    T.setTransitionPayload('categorie', { rect: {} });
    expect(T.readTransitionPayload('home')).toBeNull();
  });

  it('ne livre rien quand aucune transition n’est en cours', () => {
    expect(T.readTransitionPayload('categorie')).toBeNull();
  });

  // Une transition interrompue laisserait sinon un relais périmé, rejoué à une
  // visite ultérieure sans rapport.
  it('périme le relais au bout de cinq secondes', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-02T10:00:00Z'));
    T.setTransitionPayload('categorie', { rect: {} });

    vi.advanceTimersByTime(5001);
    expect(T.readTransitionPayload('categorie')).toBeNull();
  });

  it('le conserve juste avant l’échéance', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-02T10:00:00Z'));
    T.setTransitionPayload('categorie', { rect: {} });

    vi.advanceTimersByTime(4000);
    expect(T.readTransitionPayload('categorie')).not.toBeNull();
  });

  // La lecture sert d'initialiseur à useState, que StrictMode appelle deux
  // fois : elle doit donc rester sans effet de bord.
  it('la lecture ne consomme pas le relais', () => {
    T.setTransitionPayload('categorie', { rect: {} });
    T.readTransitionPayload('categorie');
    expect(T.readTransitionPayload('categorie')).not.toBeNull();
  });

  it('la purge explicite l’efface', () => {
    T.setTransitionPayload('categorie', { rect: {} });
    T.clearTransitionPayload();
    expect(T.readTransitionPayload('categorie')).toBeNull();
  });
});

describe('préférence d’animations réduites', () => {
  it.each([
    ['respectée', true],
    ['non demandée', false],
  ])('reflète la préférence système : %s', (_label, valeur) => {
    reduitLesAnimations(valeur);
    expect(T.prefersReducedMotion()).toBe(valeur);
  });
});

describe('abonnements des pages', () => {
  it.each([
    ['catégorie', 'onCategoryTransitionRequest', 'sailingloc:category-transition'],
    ['accueil', 'onHomeTransitionRequest', 'sailingloc:home-transition'],
    ['produit', 'onProductTransitionRequest', 'sailingloc:product-transition'],
  ])('transmet le détail de la demande vers la page %s', (_label, methode, evenement) => {
    const handler = vi.fn();
    const stop = T[methode](handler);

    window.dispatchEvent(new window.CustomEvent(evenement, { detail: { to: '/x' } }));
    expect(handler).toHaveBeenCalledWith({ to: '/x' });

    stop();
    window.dispatchEvent(new window.CustomEvent(evenement, { detail: { to: '/y' } }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// Depuis une page animée, la navigation est déléguée à la page courante pour
// qu'elle joue sa sortie ; sinon on navigue directement.
describe('navigation animée ou directe', () => {
  const ecouter = (evenement) => {
    const vu = vi.fn();
    window.addEventListener(evenement, (e) => vu(e.detail));
    return vu;
  };

  it('délègue vers la catégorie depuis l’accueil', () => {
    chemin = '/';
    const vu = ecouter('sailingloc:category-transition');
    const { result } = renderHook(() => T.useCategoryNavigate());

    act(() => result.current());

    expect(vu).toHaveBeenCalledWith({ to: '/categorie' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('délègue vers l’accueil depuis la catégorie', () => {
    chemin = '/categorie';
    const vu = ecouter('sailingloc:home-transition');
    const { result } = renderHook(() => T.useHomeNavigate());

    act(() => result.current());

    expect(vu).toHaveBeenCalledWith({ to: '/' });
  });

  it('navigue directement depuis une page non animée', () => {
    chemin = '/contact';
    const { result } = renderHook(() => T.useCategoryNavigate());

    act(() => result.current('/categorie'));

    expect(navigate).toHaveBeenCalledWith('/categorie');
  });

  it('navigue directement vers une destination hors périmètre', () => {
    chemin = '/';
    const { result } = renderHook(() => T.useCategoryNavigate());

    act(() => result.current('/contact'));

    expect(navigate).toHaveBeenCalledWith('/contact');
  });

  it('navigue directement si l’utilisateur réduit les animations', () => {
    chemin = '/';
    reduitLesAnimations(true);
    const { result } = renderHook(() => T.useCategoryNavigate());

    act(() => result.current());

    expect(navigate).toHaveBeenCalledWith('/categorie');
  });

  // La page produit est paramétrée : la reconnaissance se fait par préfixe.
  it('reconnaît la page produit malgré son identifiant', () => {
    chemin = '/product/42';
    const vu = ecouter('sailingloc:category-transition');
    const { result } = renderHook(() => T.useCategoryNavigate());

    act(() => result.current());

    expect(vu).toHaveBeenCalled();
  });

  // Le nom du bateau accompagne la demande pour que la page d'arrivée
  // l'affiche dès son premier rendu, sans attendre l'API.
  it('joint les détails supplémentaires à la demande', () => {
    chemin = '/categorie';
    const vu = ecouter('sailingloc:product-transition');
    const { result } = renderHook(() => T.useProductNavigate());

    act(() => result.current('/product/42', { name: 'Pen Duick' }));

    expect(vu).toHaveBeenCalledWith({ to: '/product/42', name: 'Pen Duick' });
  });

  it('navigue directement d’une fiche produit à une autre', () => {
    chemin = '/product/42';
    const { result } = renderHook(() => T.useProductNavigate());

    act(() => result.current('/product/43'));

    expect(navigate).toHaveBeenCalledWith('/product/43');
  });
});

// Les sections sous la ligne de flottaison sont montées en différé : un
// défilement pendant l'animation montrerait du vide.
describe('verrou de défilement', () => {
  const molette = () => {
    const e = new Event('wheel', { cancelable: true });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  };

  const touche = (key, target) => {
    const e = new window.KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
    (target ?? window).dispatchEvent(e);
    return e.defaultPrevented;
  };

  it('bloque la molette une fois posé', () => {
    T.lockScroll();
    expect(molette()).toBe(true);
  });

  it('libère la molette au déverrouillage', () => {
    T.lockScroll();
    T.unlockScroll();
    expect(molette()).toBe(false);
  });

  it.each(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])(
    'bloque la touche %s',
    (key) => {
      T.lockScroll();
      expect(touche(key)).toBe(true);
    }
  );

  it('laisse passer les autres touches', () => {
    T.lockScroll();
    expect(touche('a')).toBe(false);
  });

  // Bloquer la barre d'espace dans un champ de saisie empêcherait d'écrire.
  it('laisse écrire dans un champ de saisie', () => {
    T.lockScroll();
    const champ = document.createElement('input');
    document.body.appendChild(champ);

    expect(touche(' ', champ)).toBe(false);
    champ.remove();
  });

  it('reste sans effet si posé deux fois', () => {
    T.lockScroll();
    T.lockScroll();
    T.unlockScroll();
    expect(molette()).toBe(false);
  });

  it('tolère un déverrouillage sans verrou', () => {
    expect(() => T.unlockScroll()).not.toThrow();
  });

  // Une transition interrompue ne doit jamais laisser la page figée.
  it('se libère tout seul au bout de quinze secondes', () => {
    vi.useFakeTimers();
    T.lockScroll();

    act(() => vi.advanceTimersByTime(15000));
    expect(molette()).toBe(false);
  });
});

describe('remontée en haut de page', () => {
  it('se résout aussitôt si la page est déjà en haut', async () => {
    window.scrollY = 0;
    await expect(T.smoothScrollToTop()).resolves.toBeUndefined();
  });

  it('attend d’avoir atteint le haut', async () => {
    vi.useFakeTimers();
    window.scrollY = 800;
    window.scrollTo = vi.fn();

    const promesse = T.smoothScrollToTop();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    window.scrollY = 0;
    await act(async () => vi.advanceTimersByTime(100));
    await expect(promesse).resolves.toBeUndefined();
  });

  // Aucun événement de fin de défilement n'est fiable partout : sans ce
  // garde-fou, la transition resterait suspendue.
  it('renonce au bout de deux secondes et demie', async () => {
    vi.useFakeTimers();
    window.scrollY = 800;
    window.scrollTo = vi.fn();

    const promesse = T.smoothScrollToTop();
    await act(async () => vi.advanceTimersByTime(2500));

    await expect(promesse).resolves.toBeUndefined();
  });
});

describe('chronologie de l’intro', () => {
  it('marque l’intro comme vue', () => {
    T.markIntroSeen();
    expect(window.sessionStorage.getItem('sailingloc:intro-seen')).toBe('1');
  });

  it('émet la révélation et la mémorise', () => {
    const vu = vi.fn();
    window.addEventListener('sailingloc:intro-reveal', vu);

    T.emitIntroReveal();

    expect(vu).toHaveBeenCalled();
    expect(window.sessionStorage.getItem('sailingloc:intro-revealed')).toBe('1');
  });

  it('ne rejoue pas l’intro une fois vue', () => {
    T.markIntroSeen();
    expect(T.shouldPlayIntro()).toBe(false);
  });

  it('ne joue pas l’intro si l’utilisateur réduit les animations', () => {
    reduitLesAnimations(true);
    expect(T.shouldPlayIntro()).toBe(false);
  });

  it('cale la révélation du header sur la somme de ses paliers', () => {
    expect(T.INTRO_HEADER_REVEAL_DELAY_MS).toBe(
      T.INTRO_BLACK_MS + T.HERO_EXIT_DURATION + T.INTRO_WELCOME_HOLD_MS + T.INTRO_REVEAL_LAG_MS
    );
  });
});

describe('révélation du header', () => {
  it('reste visible quand aucune intro n’est attendue', () => {
    window.sessionStorage.setItem('sailingloc:intro-revealed', '1');
    expect(renderHook(() => T.useIntroHeaderReveal()).result.current).toBe(false);
  });

  it('reste visible si l’utilisateur réduit les animations', () => {
    reduitLesAnimations(true);
    expect(renderHook(() => T.useIntroHeaderReveal()).result.current).toBe(false);
  });
});

// Chaque cascade doit atterrir d'un seul coup : départs décalés, arrivée
// commune. Une constante désaccordée ferait arriver les blocs en ordre
// dispersé.
describe('durées d’animation', () => {
  it('fait atterrir la cascade d’entrée au même instant', () => {
    expect(T.CATEGORY_ENTER_TOTAL).toBe(
      T.CATEGORY_ENTER_DURATION + T.CATEGORY_ENTER_LAST_ORDER * T.CATEGORY_ENTER_STAGGER
    );
  });

  it('réserve un rythme plus court à l’aller-retour catégorie / produit', () => {
    expect(T.CATEGORY_PRODUCT_NAV_TOTAL).toBeLessThan(T.NAV_ENTER_TOTAL);
  });

  it('aligne la durée de la home sur la navigation courante', () => {
    expect(T.HOME_NAV_DURATION).toBe(T.NAV_ENTER_TOTAL);
  });

  it('déclare les animations partagées par les pages à cascade', () => {
    expect(T.PAGE_SLIDE_CSS).toContain('@keyframes categorySlideInLeft');
    expect(T.PAGE_SLIDE_CSS).toContain('@keyframes categorySlideInRight');
  });
});
