// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWizardConversation } from './use-wizard-conversation';
import type { WizardConversationAdapter } from './conversation-types';
import type { WizardStep, WizardStepContext } from './types';

type S = { title: string; note: string };

function makeCtx(over: Partial<WizardStepContext<S>> = {}): WizardStepContext<S> {
  return {
    state: { title: '', note: '' },
    patch: vi.fn(),
    entities: {},
    resourceId: null,
    mode: 'create',
    persist: vi.fn().mockResolvedValue({ ok: true, item: null }),
    persistExtras: vi.fn().mockResolvedValue({ ok: true }),
    touched: new Set<keyof S>(),
    ...over,
  };
}

const steps: WizardStep<S>[] = [
  { key: 'start', label: 'Início', Component: () => null },
  { key: 'more', label: 'Mais', Component: () => null },
];

function makeAdapter(over: Partial<WizardConversationAdapter> = {}): WizardConversationAdapter {
  return {
    status: 'ready',
    greeting: 'oi',
    converse: vi.fn().mockResolvedValue({
      message: 'E o que você faz?',
      choices: [{ label: 'Eletricista' }],
      patch: { title: 'Eletricista' },
      advance: 'hold',
      needsMore: true,
    }),
    ...over,
  };
}

const baseOpts = {
  steps,
  currentIndex: 0,
  goContinue: vi.fn(),
  submitting: false,
  canContinue: true,
  isLastStep: false,
};

describe('useWizardConversation', () => {
  it('adapter ausente / unavailable → inativo', () => {
    const a = renderHook(() =>
      useWizardConversation({ ...baseOpts, adapter: undefined, ctx: makeCtx() })
    );
    expect(a.result.current.active).toBe(false);
    const b = renderHook(() =>
      useWizardConversation({
        ...baseOpts,
        adapter: makeAdapter({ status: 'unavailable' }),
        ctx: makeCtx(),
      })
    );
    expect(b.result.current.active).toBe(false);
  });

  it('send anexa turnos e aplica patch só em campo vazio', async () => {
    const patch = vi.fn();
    const ctx = makeCtx({
      patch,
      state: { title: '', note: 'meu' },
      touched: new Set<keyof S>(['note']),
    });
    const adapter = makeAdapter({
      converse: vi.fn().mockResolvedValue({
        message: 'ok',
        choices: [],
        patch: { title: 'X', note: 'sobrescrito' },
        advance: 'hold',
        needsMore: false,
      }),
    });
    const { result } = renderHook(() => useWizardConversation({ ...baseOpts, adapter, ctx }));
    await act(async () => {
      await result.current.send('oi');
    });
    expect(result.current.turns.map((t) => t.role)).toEqual(['user', 'assistant']);
    expect(patch).toHaveBeenCalledWith({ title: 'X' });
  });

  it('advance:ask NÃO avança sozinha — só oferece a tag "Pode seguir"', async () => {
    const goContinue = vi.fn().mockResolvedValue(undefined);
    const adapter = makeAdapter({
      converse: vi.fn().mockResolvedValue({
        message: 'Categoria definida!',
        choices: [{ label: 'x' }],
        patch: {},
        advance: 'ask',
        needsMore: false,
      }),
    });
    const { result } = renderHook(() =>
      useWizardConversation({ ...baseOpts, adapter, ctx: makeCtx(), goContinue })
    );
    await act(async () => {
      await result.current.send('pronto');
    });
    expect(goContinue).not.toHaveBeenCalled();
    expect(result.current.choices.map((c) => c.value)).toContain('__advance__');
  });

  it('pickChoice "Pode seguir" chama goContinue; tag comum envia o valor', async () => {
    const goContinue = vi.fn().mockResolvedValue(undefined);
    const converse = vi.fn().mockResolvedValue({
      message: 'ok',
      choices: [],
      patch: {},
      advance: 'hold',
      needsMore: false,
    });
    const adapter = makeAdapter({ converse });
    const { result } = renderHook(() =>
      useWizardConversation({ ...baseOpts, adapter, ctx: makeCtx(), goContinue })
    );
    await act(async () => {
      result.current.pickChoice({ label: 'Pode seguir', value: '__advance__' });
    });
    expect(goContinue).toHaveBeenCalled();

    await act(async () => {
      result.current.pickChoice({ label: 'No cliente', value: 'no_cliente' });
    });
    await waitFor(() =>
      expect(converse).toHaveBeenCalledWith(expect.objectContaining({ userText: 'no_cliente' }))
    );
  });

  it('passo avança pra frente (rodapé ou tag) → confirm-advance abre a pergunta do passo novo', async () => {
    const converse = vi.fn().mockResolvedValue({
      message: 'Agora a categoria?',
      choices: [],
      patch: {},
      advance: 'hold',
    });
    const adapter = makeAdapter({ converse });
    const { result, rerender } = renderHook(
      ({ ci }) => useWizardConversation({ ...baseOpts, adapter, ctx: makeCtx(), currentIndex: ci }),
      { initialProps: { ci: 0 } }
    );
    // a pessoa já conversou — só aí a Naví acompanha o avanço
    await act(async () => {
      await result.current.send('sou eletricista');
    });
    await act(async () => {
      rerender({ ci: 1 });
    });
    await waitFor(() =>
      expect(converse).toHaveBeenLastCalledWith(
        expect.objectContaining({ intent: 'confirm-advance', stepKey: 'more' })
      )
    );
  });

  it('avançar sem ter conversado NÃO invoca a Naví', async () => {
    const converse = vi
      .fn()
      .mockResolvedValue({ message: 'x', choices: [], patch: {}, advance: 'hold' });
    const adapter = makeAdapter({ converse });
    const { rerender } = renderHook(
      ({ ci }) => useWizardConversation({ ...baseOpts, adapter, ctx: makeCtx(), currentIndex: ci }),
      { initialProps: { ci: 0 } }
    );
    await act(async () => {
      rerender({ ci: 1 });
    });
    expect(converse).not.toHaveBeenCalled();
  });

  it('voltar um passo (currentIndex menor) NÃO dispara confirm-advance', async () => {
    const converse = vi
      .fn()
      .mockResolvedValue({ message: 'x', choices: [], patch: {}, advance: 'hold' });
    const adapter = makeAdapter({ converse });
    const { result, rerender } = renderHook(
      ({ ci }) => useWizardConversation({ ...baseOpts, adapter, ctx: makeCtx(), currentIndex: ci }),
      { initialProps: { ci: 1 } }
    );
    await act(async () => {
      await result.current.send('oi');
    });
    converse.mockClear();
    await act(async () => {
      rerender({ ci: 0 });
    });
    expect(converse).not.toHaveBeenCalled();
  });
});
