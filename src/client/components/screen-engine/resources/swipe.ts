import type { RpcConfig } from '@kizuna/core/types';
import type { ResourceConfig } from '../types/resource-config';

/**
 * RPCs do plugin `swipe`. Spread em `postgrestRpcs` do projeto. `fn_swipe_deck` é pública mas
 * recebe a sessão quando existe (`optionalAuth`) — logado, o deck exclui o que ele já decidiu.
 */
export const rpcSwipe: Record<string, RpcConfig> = {
  fn_swipe_deck: { schema: 'public', requiresAuth: false, optionalAuth: true },
  fn_swipe_record: { schema: 'public' },
  fn_swipe_liked: { schema: 'public' },
};

/**
 * Resource `service_reactions` — a linha do usuário logado em `service_user_favorites` (RLS por
 * dono). Gostei = `action 'like'`; favorito implica gostei (`favorite ⇒ action = 'like'`).
 * Leitura exige login (default). Spread em `postgrestResources` do projeto.
 */
export const resourceServiceReactions: Record<string, ResourceConfig> = {
  service_reactions: {
    schema: 'public',
    table: 'service_user_favorites',
    select: 'uid,service_uid,action,favorite',
    primaryKey: 'uid',
    defaultOrder: 'updated_at.desc',
    searchableColumns: [],
    requiredFields: ['service_uid'],
    mapInput: (input) => {
      const favorite = input.favorite === true;
      const liked = favorite || input.liked === true;
      return { service_uid: input.serviceUid, action: liked ? 'like' : 'skip', favorite };
    },
    mapOutput: (r) => ({
      uid: String(r.uid ?? ''),
      serviceUid: String(r.service_uid ?? ''),
      liked: r.action === 'like',
      favorite: Boolean(r.favorite),
    }),
  },
};
