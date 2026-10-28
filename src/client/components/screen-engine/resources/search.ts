import type { RpcConfig } from '@kizuna/core/types';
import { withProjectRegionCities } from '../../../../server/regions';

/**
 * RPC do plugin `search`, exposta por `POST /api/resources/fn_search_services`. Um projeto que
 * ativa o plugin faz spread de `rpcSearch` no seu `postgrestRpcs`. Pública (sem sessão): a função
 * é `SECURITY DEFINER` e só devolve colunas públicas do serviço. `mapParams`: filtro por uma cidade
 * inclui as irmãs dela (`regions` do kizuna.config.json) — busca, swipe e qualquer tela que chame a
 * RPC pelo proxy.
 */
export const rpcSearch: Record<string, RpcConfig> = {
  fn_search_services: { schema: 'public', requiresAuth: false, mapParams: withProjectRegionCities },
  // Mapa (search 0012): pinos por raio, leves, e o detalhe de um anúncio sob demanda. Públicas.
  fn_map_pins: { schema: 'public', requiresAuth: false },
  fn_map_place: { schema: 'public', requiresAuth: false },
};
