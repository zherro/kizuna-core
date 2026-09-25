import type { RpcConfig } from '@kizuna/core/types';

/**
 * RPCs do plugin `swipe`. Spread em `postgrestRpcs` do projeto. `fn_swipe_deck` é pública mas
 * recebe a sessão quando existe (`optionalAuth`) — logado, o deck exclui o que ele já decidiu.
 */
export const rpcSwipe: Record<string, RpcConfig> = {
  fn_swipe_deck: { schema: 'public', requiresAuth: false, optionalAuth: true },
  fn_swipe_record: { schema: 'public' },
  fn_swipe_liked: { schema: 'public' },
};
