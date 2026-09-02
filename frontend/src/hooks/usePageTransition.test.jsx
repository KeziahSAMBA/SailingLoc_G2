import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const navigate = vi.fn();
let chemin = '/contact';
let cle = 'abc123';
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: chemin, key: cle }),
}));

// Seules les fonctions à effet de bord sont remplacées : le module exporte
// aussi les durées et les courbes d'animation, dont slide() a besoin pour
// composer ses styles.
const transition = {
  lockScroll: vi.fn(),
  unlockScroll: vi.fn(),
  smoothScrollToTop: vi.fn(() => Promise.resolve()),
  setTransitionPayload: vi.fn(),
  prefersReducedMotion: vi.fn(() => false),
};
vi.mock('./useCategoryTransition.js', async (importOriginal) => ({
  ...(await importOriginal()),
  ...transition,
}));

const P = await import('./usePageTransition.js');

const demanderSortie = (detail) =>
  act(() => {
    window.dispatchEvent(new window.CustomEvent('sailingloc:page-exit-transition', { detail }));
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  chemin = '/contact';
  cle = 'abc123';
  transition.smoothScrollToTop.mockResolvedValue(undefined);
  transition.prefersReducedMotion.mockReturnValue(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('pages à sortie animée', () => {
  it('couvre le contact, à propos et les pages légales', () => {
    expect(P.EXIT_TRANSITION_PAGES).toEqual([
      '/contact',
      '/a-propos',
      '/cgu',
      '/cgv',
      '/politique-de-confidentialite',
      '/mentions-legales',
    ]);
  });
});

describe('reconnaissance des tableaux de bord', () => {
  it.each(['/proprietaire', '/locataire', '/admin'])('reconnaît %s', (base) => {
    expect(P.isOnDashboardPage(base)).toBe(true);
  });

  it('reconnaît une sous-route de tableau de bord', () => {
    expect(P.isOnDashboardPage('/proprietaire/compte')).toBe(true);
  });

  // /admin/login est une route autonome, sans layout persistant : l'inclure
  // ferait intercepter ses liens sans personne pour rejouer la transition.
  it('exclut la page de connexion administrateur', () => {
    expect(P.isOnDashboardPage('/admin/login')).toBe(false);
  });

  it.each(['/', '/categorie', '/contact', '/product/42'])('ne confond pas %s', (p) => {
    expect(P.isOnDashboardPage(p)).toBe(false);
  });
});

describe('abonnement aux demandes de sortie', () => {
  it('transmet la destination puis se désabonne', () => {
    const handler = vi.fn();
    const stop = P.onPageExitRequest(handler);

    demanderSortie({ to: '/categorie' });
    expect(handler).toHaveBeenCalledWith({ to: '/categorie' });

    stop();
    demanderSortie({ to: '/' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('navigation avec sortie animée', () => {
  const ecouter = () => {
    const vu = vi.fn();
    window.addEventListener('sailingloc:page-exit-transition', (e) => vu(e.detail));
    return vu;
  };

  it('délègue la sortie depuis une page qui l’anime', () => {
    chemin = '/contact';
    const vu = ecouter();
    const { result } = renderHook(() => P.usePageExitNavigate());

    act(() => result.current('/a-propos'));

    expect(vu).toHaveBeenCalledWith({ to: '/a-propos', options: undefined });
    expect(navigate).not.toHaveBeenCalled();
  });

  // Un lien vers la page déjà affichée ne doit ni empiler d'historique ni
  // jouer une sortie : sans cette garde, la page resterait figée à mi-course.
  it('remonte en haut plutôt que de naviguer vers soi-même', () => {
    chemin = '/contact';
    window.scrollTo = vi.fn();
    const { result } = renderHook(() => P.usePageExitNavigate());

    act(() => result.current('/contact'));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigue directement depuis une page sans sortie animée', () => {
    chemin = '/messagerie';
    const { result } = renderHook(() => P.usePageExitNavigate());

    act(() => result.current('/contact'));

    expect(navigate).toHaveBeenCalledWith('/contact', undefined);
  });

  // Les pages qui gèrent leur propre sortie ne l'animent que vers une
  // destination connue : la modale de connexion, elle, laisse la page de fond
  // montée et resterait glissée hors écran.
  it('n’anime que vers une destination reconnue', () => {
    chemin = '/categorie';
    const { result } = renderHook(() => P.usePageExitNavigate());

    act(() => result.current('/login'));

    expect(navigate).toHaveBeenCalledWith('/login', undefined);
  });

  it('anime depuis la catégorie vers une page statique', () => {
    chemin = '/categorie';
    const vu = ecouter();
    const { result } = renderHook(() => P.usePageExitNavigate());

    act(() => result.current('/contact'));

    expect(vu).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('transmet les options de navigation', () => {
    chemin = '/contact';
    const vu = ecouter();
    const { result } = renderHook(() => P.usePageExitNavigate());

    act(() => result.current('/cgu', { replace: true }));

    expect(vu).toHaveBeenCalledWith({ to: '/cgu', options: { replace: true } });
  });

  it('ne détourne pas les liens de la connexion administrateur', () => {
    chemin = '/admin/login';
    const { result } = renderHook(() => P.usePageExitNavigate());

    act(() => result.current('/contact'));

    expect(navigate).toHaveBeenCalledWith('/contact', undefined);
  });
});

// Le hook n'expose pas son état : il expose slide(), la fonction de style que
// les blocs de la page appliquent. C'est donc par elle qu'on observe l'entrée
// et la sortie.
describe('animation d’entrée', () => {
  // react-router ne donne la clé « default » qu'au tout premier chargement :
  // il n'y a alors aucune page quittée, donc rien à faire entrer.
  it('ne joue rien sur un accès direct ou une actualisation', () => {
    cle = 'default';
    expect(
      renderHook(() => P.usePageSlideTransition(1200)).result.current.slide(0)
    ).toBeUndefined();
  });

  it('joue l’entrée après une navigation interne', () => {
    cle = 'xyz789';
    const style = renderHook(() => P.usePageSlideTransition(1200)).result.current.slide(0);
    expect(style.animation).toContain('categorySlideInLeft');
  });

  it('glisse depuis la droite quand on le demande', () => {
    const style = renderHook(() => P.usePageSlideTransition(1200)).result.current.slide(0, 'right');
    expect(style.animation).toContain('categorySlideInRight');
  });

  // Départs décalés, arrivée commune : le retard de chaque bloc est retranché
  // de sa durée pour que toute la cascade atterrisse ensemble.
  it('décale les blocs sans décaler leur arrivée', () => {
    const { result } = renderHook(() => P.usePageSlideTransition(1200));
    const premier = result.current.slide(0);
    const second = result.current.slide(2);

    expect(premier.animation).toContain('1200ms');
    expect(premier.animation).toContain('0ms both');
    expect(second.animation).toContain('1140ms');
    expect(second.animation).toContain('60ms both');
  });

  it('respecte la préférence d’animations réduites', () => {
    transition.prefersReducedMotion.mockReturnValue(true);
    expect(
      renderHook(() => P.usePageSlideTransition(1200)).result.current.slide(0)
    ).toBeUndefined();
  });

  // Les onglets légaux naviguent librement entre eux sans transition.
  it('se tait quand la page d’origine demande de sauter l’entrée', () => {
    const { result } = renderHook(() => P.usePageSlideTransition(1200, { skipEnter: true }));
    expect(result.current.slide(0)).toBeUndefined();
  });

  it('referme la fenêtre d’entrée une fois la cascade terminée', () => {
    const { result } = renderHook(() => P.usePageSlideTransition(1200));

    act(() => vi.advanceTimersByTime(1500));

    expect(result.current.slide(0)).toBeUndefined();
  });

  // Une transition interrompue ailleurs ne doit pas laisser la page verrouillée.
  it('libère un verrou de défilement resté posé', () => {
    renderHook(() => P.usePageSlideTransition(1200));
    expect(transition.unlockScroll).toHaveBeenCalled();
  });
});

describe('séquence de sortie', () => {
  it('verrouille, remonte, puis navigue à la fin de la cascade', async () => {
    const { result } = renderHook(() => P.usePageSlideTransition(1200));

    await act(async () => {
      window.dispatchEvent(
        new window.CustomEvent('sailingloc:page-exit-transition', { detail: { to: '/cgu' } })
      );
    });

    expect(transition.lockScroll).toHaveBeenCalled();
    expect(transition.smoothScrollToTop).toHaveBeenCalled();
    expect(result.current.slide(0).animation).toContain('categorySlideOutLeft');
    expect(navigate).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1200));
    expect(navigate).toHaveBeenCalledWith('/cgu', undefined);
    expect(transition.unlockScroll).toHaveBeenCalled();
  });

  it('ignore une seconde demande pendant la sortie', async () => {
    renderHook(() => P.usePageSlideTransition(1200));

    await act(async () => {
      window.dispatchEvent(
        new window.CustomEvent('sailingloc:page-exit-transition', { detail: { to: '/cgu' } })
      );
      window.dispatchEvent(
        new window.CustomEvent('sailingloc:page-exit-transition', { detail: { to: '/cgv' } })
      );
    });

    expect(transition.lockScroll).toHaveBeenCalledTimes(1);
  });

  // Le fond fait un crossfade vers l'image de la page cible, qui l'utilise
  // nativement : le raccord est invisible à son montage.
  it('prépare le fond de la destination statique', async () => {
    const { result } = renderHook(() =>
      P.usePageSlideTransition(1200, { staticBgTargets: { '/cgu': 'legal.webp' } })
    );

    await act(async () => {
      window.dispatchEvent(
        new window.CustomEvent('sailingloc:page-exit-transition', { detail: { to: '/cgu' } })
      );
    });

    expect(result.current.exitBgSrc).toBe('legal.webp');
  });

  it('reconnaît une sous-route de tableau de bord par son préfixe', async () => {
    const { result } = renderHook(() =>
      P.usePageSlideTransition(1200, { dashboardBg: 'dashboard.webp' })
    );

    await act(async () => {
      window.dispatchEvent(
        new window.CustomEvent('sailingloc:page-exit-transition', {
          detail: { to: '/proprietaire/compte' },
        })
      );
    });

    expect(result.current.exitBgSrc).toBe('dashboard.webp');
  });

  // L'accueil a un fond vidéo, sans équivalent statique : c'est à elle de
  // fondre depuis notre image, transmise par le relais de module.
  it('confie notre fond à l’accueil', async () => {
    renderHook(() => P.usePageSlideTransition(1200, { ownBg: 'contact.webp' }));

    await act(async () => {
      window.dispatchEvent(
        new window.CustomEvent('sailingloc:page-exit-transition', { detail: { to: '/' } })
      );
    });
    act(() => vi.advanceTimersByTime(1200));

    expect(transition.setTransitionPayload).toHaveBeenCalledWith('home', { bg: 'contact.webp' });
  });

  it('laisse le fond intact vers une destination sans image déclarée', async () => {
    const { result } = renderHook(() =>
      P.usePageSlideTransition(1200, { staticBgTargets: { '/cgu': 'legal.webp' } })
    );

    await act(async () => {
      window.dispatchEvent(
        new window.CustomEvent('sailingloc:page-exit-transition', { detail: { to: '/contact' } })
      );
    });

    expect(result.current.exitBgSrc).toBeNull();
  });

  it('cesse d’écouter au démontage', async () => {
    const { unmount } = renderHook(() => P.usePageSlideTransition(1200));
    unmount();

    await act(async () => {
      window.dispatchEvent(
        new window.CustomEvent('sailingloc:page-exit-transition', { detail: { to: '/cgu' } })
      );
    });

    expect(transition.lockScroll).not.toHaveBeenCalled();
  });
});
