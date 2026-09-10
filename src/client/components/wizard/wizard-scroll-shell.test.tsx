// @vitest-environment jsdom
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const submitResourceMock = vi.fn(async () => ({
  ok: true as const,
  data: { item: { id: '1' } },
}));
vi.mock('../../../lib/resource-submit', () => ({
  submitResource: (...args: unknown[]) => submitResourceMock(...args),
}));

import { defineWizard } from './define-wizard';
import { Wizard } from './wizard';
import { layoutStorageKey } from './wizard-layout';

beforeEach(() => {
  window.localStorage.clear();
  // jsdom has no layout engine
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  submitResourceMock.mockClear();
});

type S = { a?: boolean; b?: boolean };

const cfg = defineWizard<S>({
  resource: 'things',
  steps: ['a', 'b', 'c'],
  registry: {
    a: {
      key: 'a',
      label: 'Passo A',
      canContinue: (c) => c.state.a === true,
      persist: async (c) => {
        await c.persist({ a: true });
      },
      Component: (p) => (
        <button type="button" onClick={() => p.patch({ a: true })}>
          responder A
        </button>
      ),
    },
    b: {
      key: 'b',
      label: 'Passo B',
      canContinue: (c) => c.state.b === true,
      Component: (p) => (
        <button type="button" onClick={() => p.patch({ b: true })}>
          responder B
        </button>
      ),
    },
    c: {
      key: 'c',
      label: 'Passo C',
      Component: () => <p>conteudo C</p>,
    },
  },
  finishHrefByMode: { create: '/done' },
});

function renderScroll() {
  return render(
    <Wizard<S>
      config={cfg}
      mode="create"
      entities={{}}
      initialResourceId={null}
      variant="scroll"
    />,
  );
}

describe('<Wizard variant="scroll">', () => {
  it('reveals only the first step, then the next once it validates', async () => {
    renderScroll();

    expect(screen.getByRole('button', { name: /responder A/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /responder B/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /responder A/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /responder B/i })).not.toBeNull();
    });
    // step A's persist ran on advance
    expect(submitResourceMock).toHaveBeenCalled();
  });

  it('only shows Concluir, enabled at the last step', async () => {
    renderScroll();
    expect(screen.queryByRole('button', { name: /continuar/i })).toBeNull();
    const concluir = screen.getByRole('button', { name: /concluir/i });
    expect((concluir as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /responder A/i }));
    await screen.findByRole('button', { name: /responder B/i });
    fireEvent.click(screen.getByRole('button', { name: /responder B/i }));

    await waitFor(() => {
      expect(screen.queryByText('conteudo C')).not.toBeNull();
    });
    await waitFor(() => {
      expect((screen.getByRole('button', { name: /concluir/i }) as HTMLButtonElement).disabled).toBe(
        false,
      );
    });
  });

  it('renders the layout toggle and remembers the choice', async () => {
    renderScroll();
    const stepperOpt = screen.getByRole('radio', { name: /passo a passo/i });
    fireEvent.click(stepperOpt);
    await waitFor(() => {
      expect(window.localStorage.getItem(layoutStorageKey('things'))).toBe('stepper');
    });
    // switched to the stepper chrome
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeTruthy();
  });

  it('keeps the assist button reachable after advancing past the assist step', async () => {
    const assistant = {
      status: 'ready' as const,
      suggest: vi.fn(async () => ({ message: '', needsMore: false, patch: {} })),
    };
    const assistCfg = defineWizard<S>({
      resource: 'things',
      steps: ['a', 'b'],
      registry: {
        a: { ...(cfg.registry!.a as object), assist: true } as never,
        b: cfg.registry!.b as never,
      },
      finishHrefByMode: { create: '/done' },
    });
    render(
      <Wizard<S>
        config={assistCfg}
        mode="create"
        entities={{}}
        initialResourceId={null}
        variant="scroll"
        assistant={assistant}
      />,
    );
    expect(screen.getByRole('button', { name: /preencher com ia/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /responder A/i }));
    await screen.findByRole('button', { name: /responder B/i });
    // still there even though the current step is now 'b' (no assist flag)
    expect(screen.getByRole('button', { name: /preencher com ia/i })).toBeTruthy();
  });

  it('does not offer the scroll layout in edit mode', () => {
    render(
      <Wizard<S>
        config={cfg}
        mode="edit"
        entities={{}}
        initialResourceId="1"
        initialRecord={{ id: '1' }}
        variant="scroll"
      />,
    );
    expect(screen.queryByRole('radio', { name: /questionário/i })).toBeNull();
    // stepper chrome
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeTruthy();
  });
});
