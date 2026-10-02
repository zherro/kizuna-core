// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Função simples (não vi.fn): o rastreio de resultados do vitest deixa a rejeição sem tratamento.
const calls: number[] = [];
let impl: (days: number) => Promise<unknown> = async () => stats;
vi.mock('./analytics-api', () => ({
  fetchOwnerStats: (days: number) => {
    calls.push(days);
    return impl(days);
  },
}));

import { useOwnerStats } from './use-owner-stats';

const stats = { days: 7, from: 'a', to: 'b', metrics: {}, series: [], sources: [], entities: [] };

beforeEach(() => {
  calls.length = 0;
  impl = async () => stats;
});

describe('useOwnerStats', () => {
  it('carrega e devolve as estatísticas', async () => {
    const { result } = renderHook(() => useOwnerStats(7));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats).toBe(stats);
    expect(result.current.error).toBe(false);
  });

  it('sinaliza erro sem lançar', async () => {
    impl = () => Promise.reject(new Error('500'));
    const { result } = renderHook(() => useOwnerStats(30));
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.stats).toBeNull();
  });

  it('refaz a leitura quando o período muda', async () => {
    const { rerender } = renderHook(({ d }: { d: 7 | 30 }) => useOwnerStats(d), { initialProps: { d: 7 } });
    await waitFor(() => expect(calls).toEqual([7]));
    rerender({ d: 30 });
    await waitFor(() => expect(calls).toEqual([7, 30]));
  });
});
