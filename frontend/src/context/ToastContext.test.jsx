import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';
import ToastContext, { ToastProvider } from './ToastContext.jsx';

const DUREE_MS = 4000;

const monter = () => renderHook(() => useContext(ToastContext), { wrapper: ToastProvider });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('affichage', () => {
  it('affiche le message demandé', () => {
    const { result } = monter();

    act(() => result.current.showToast('Vous êtes connecté.', 'success'));

    expect(screen.getByText('Vous êtes connecté.')).toBeInTheDocument();
  });

  it('n’affiche rien au départ', () => {
    render(<ToastProvider>page</ToastProvider>);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('empile plusieurs messages', () => {
    const { result } = monter();

    act(() => {
      result.current.showToast('Premier');
      result.current.showToast('Second');
    });

    expect(screen.getAllByRole('status')).toHaveLength(2);
  });

  // Chaque notification doit avoir sa propre identité, sinon React réutiliserait
  // le même nœud et le minuteur de la première fermerait la suivante.
  it('donne un identifiant distinct à chaque message', () => {
    const { result } = monter();

    let a, b;
    act(() => {
      a = result.current.showToast('Premier');
      b = result.current.showToast('Second');
    });

    expect(a).not.toBe(b);
  });

  it.each(['success', 'error', 'info', 'warning'])('accepte le type %s', (type) => {
    const { result } = monter();

    act(() => result.current.showToast('Message', type));

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('disparition', () => {
  it('reste affiché avant l’échéance', () => {
    const { result } = monter();
    act(() => result.current.showToast('Message'));

    act(() => vi.advanceTimersByTime(DUREE_MS - 500));

    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('s’efface au bout de quatre secondes', () => {
    const { result } = monter();
    act(() => result.current.showToast('Message'));

    act(() => vi.advanceTimersByTime(DUREE_MS));

    expect(screen.queryByText('Message')).not.toBeInTheDocument();
  });

  it('ferme chaque message à sa propre échéance', () => {
    const { result } = monter();

    act(() => result.current.showToast('Premier'));
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.showToast('Second'));
    act(() => vi.advanceTimersByTime(2000));

    expect(screen.queryByText('Premier')).not.toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('se ferme au clic sur le bouton', async () => {
    const utilisateur = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { result } = monter();
    act(() => result.current.showToast('Message'));

    await utilisateur.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(screen.queryByText('Message')).not.toBeInTheDocument();
  });

  it('se ferme par appel direct', () => {
    const { result } = monter();

    let id;
    act(() => {
      id = result.current.showToast('Message');
    });
    act(() => result.current.dismiss(id));

    expect(screen.queryByText('Message')).not.toBeInTheDocument();
  });

  it('ne ferme que le message visé', () => {
    const { result } = monter();

    let premier;
    act(() => {
      premier = result.current.showToast('Premier');
      result.current.showToast('Second');
    });
    act(() => result.current.dismiss(premier));

    expect(screen.queryByText('Premier')).not.toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});

// Les notifications portent des informations que l'utilisateur doit pouvoir
// percevoir sans les voir — une connexion réussie, une erreur d'envoi.
describe('accessibilité', () => {
  it('annonce la zone aux lecteurs d’écran sans interrompre', () => {
    const { container } = render(<ToastProvider>page</ToastProvider>);
    const zone = container.querySelector('[aria-live]');

    expect(zone).toHaveAttribute('aria-live', 'polite');
    expect(zone).toHaveAttribute('aria-atomic', 'false');
  });

  it('donne au bouton de fermeture un nom accessible', () => {
    const { result } = monter();
    act(() => result.current.showToast('Message'));

    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
  });
});

describe('valeur par défaut du contexte', () => {
  it('expose une fonction inerte sans fournisseur', () => {
    const { result } = renderHook(() => useContext(ToastContext));
    expect(() => result.current.showToast('Message')).not.toThrow();
  });
});
