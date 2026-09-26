'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AccountStatus, CanResult } from '../../../shared/account-levels';

export const ACCOUNT_LEVEL_ENDPOINT = '/api/account/level';

export type AccountLevelResponse = {
  status: AccountStatus;
  allowed: Record<string, boolean>;
  can?: CanResult;
};

/** Consulta pontual (ex.: no clique). Erro de rede → null (quem chama decide; o servidor barra). */
export async function fetchAccountLevel(
  action?: string,
  endpoint = ACCOUNT_LEVEL_ENDPOINT
): Promise<AccountLevelResponse | null> {
  try {
    const url = action ? `${endpoint}?action=${encodeURIComponent(action)}` : endpoint;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as AccountLevelResponse;
  } catch {
    return null;
  }
}

/**
 * Status de nível da conta atual. `allowed[acao]` serve para esconder/mostrar UI; a barreira real
 * é `canDoServer` no servidor.
 */
export function useAccountLevel(
  options: { initial?: AccountLevelResponse | null; endpoint?: string } = {}
) {
  const { initial = null, endpoint = ACCOUNT_LEVEL_ENDPOINT } = options;
  const [data, setData] = useState<AccountLevelResponse | null>(initial);
  const [loading, setLoading] = useState(!initial);

  const refresh = useCallback(async () => {
    setLoading(true);
    const next = await fetchAccountLevel(undefined, endpoint);
    if (next) setData(next);
    setLoading(false);
    return next;
  }, [endpoint]);

  useEffect(() => {
    if (!initial) void refresh();
  }, [initial, refresh]);

  return {
    status: data?.status ?? null,
    allowed: data?.allowed ?? {},
    loading,
    refresh,
  };
}
