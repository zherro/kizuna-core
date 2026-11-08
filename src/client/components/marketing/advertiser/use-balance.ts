'use client';
import { fetchPage } from './data';
import { EMPTY_BALANCE, type Balance } from './types';
import { useLoad } from './use-load';

/** Saldo da conta (view `vw_wallet_balance`; a RLS já limita à conta logada). Sem cache. */
export function useBalance(tenantId: string) {
  return useLoad<Balance>(async () => {
    const r = await fetchPage<Balance>('vw_wallet_balance', { pageSize: 1, filters: { tenant_id: tenantId } });
    return r.items[0] ?? { ...EMPTY_BALANCE, tenantId };
  }, [tenantId]);
}
