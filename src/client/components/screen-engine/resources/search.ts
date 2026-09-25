import type { RpcConfig } from '@kizuna/core/types';

/**
 * RPC do plugin `search`, exposta por `POST /api/resources/fn_search_services`. Um projeto que
 * ativa o plugin faz spread de `rpcSearch` no seu `postgrestRpcs`. Pública (sem sessão): a função
 * é `SECURITY DEFINER` e só devolve colunas públicas do serviço.
 */
export const rpcSearch: Record<string, RpcConfig> = {
  fn_search_services: { schema: 'public', requiresAuth: false },
};
