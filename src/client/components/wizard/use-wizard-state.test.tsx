// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { defineWizard } from './define-wizard';
import { useWizardState } from './use-wizard-state';

const step = (key: string, extra: Record<string, unknown> = {}) => ({
  key,
  label: key,
  Component: () => null,
  ...extra,
});

function makeConfig(over = {}) {
  return defineWizard<{ name: string }>({
    resource: 'x',
    steps: ['a', 'b', 'c'],
    registry: {
      a: step('a', { canContinue: (c: any) => (c.state.name ?? '').length >= 2 }),
      b: step('b', { persist: vi.fn(async () => {}) }),
      c: step('c'),
    },
    ...over,
  } as any);
}

afterEach(() => cleanup());

describe('useWizardState', () => {
  it('goContinue bloqueia quando canContinue é falso', async () => {
    const { result } = renderHook(() =>
      useWizardState({
        config: makeConfig(),
        mode: 'create',
        entities: {},
        initialState: { name: '' },
        initialResourceId: null,
      }),
    );
    await act(async () => {
      await result.current.goContinue();
    });
    expect(result.current.currentIndex).toBe(0);
  });

  it('goContinue roda persist e avança', async () => {
    const cfg = makeConfig();
    const { result } = renderHook(() =>
      useWizardState({
        config: cfg,
        mode: 'edit',
        entities: {},
        initialState: { name: 'ok' },
        initialResourceId: '1',
      }),
    );
    await act(async () => {
      await result.current.goContinue();
    }); // a -> b
    await act(async () => {
      await result.current.goContinue();
    }); // b -> c, roda persist de b
    expect(result.current.currentIndex).toBe(2);
    expect((cfg.registry!.b.persist as any)).toHaveBeenCalled();
  });

  it('jumpTo não passa de furthestIndex', async () => {
    const { result } = renderHook(() =>
      useWizardState({
        config: makeConfig(),
        mode: 'create',
        entities: {},
        initialState: { name: 'ok' },
        initialResourceId: '1',
      }),
    );
    await act(async () => {
      await result.current.jumpTo(2);
    });
    expect(result.current.currentIndex).toBe(0); // furthest ainda é 0
  });
});
