'use client';

import { useEffect, useState } from 'react';
import type { OwnerStats, PeriodDays } from '../../shared/analytics';
import { fetchOwnerStats } from './analytics-api';

type OwnerStatsState = { stats: OwnerStats | null; loading: boolean; error: boolean };

/**
 * Estatísticas do anunciante logado para o período; refaz a leitura quando `days` muda.
 * Com `tenantId`, também agrega por categoria e traz o título dos anúncios.
 */
export function useOwnerStats(days: PeriodDays, opts: { tenantId?: string } = {}): OwnerStatsState {
  const [state, setState] = useState<OwnerStatsState>({ stats: null, loading: true, error: false });
  const { tenantId } = opts;

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: false }));
    fetchOwnerStats(days, controller.signal, { tenantId })
      .then((stats) => setState({ stats, loading: false, error: false }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ stats: null, loading: false, error: true });
      });
    return () => controller.abort();
  }, [days, tenantId]);

  return state;
}
