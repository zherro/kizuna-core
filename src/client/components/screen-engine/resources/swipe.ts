import type { RpcConfig } from '@kizuna/core/types';
import type { ResourceConfig } from '../types/resource-config';

/**
 * RPCs do plugin `swipe`. Spread em `postgrestRpcs` do projeto. `fn_swipe_deck` e
 * `fn_service_reaction_state` são públicas mas recebem a sessão quando existe (`optionalAuth`) —
 * logado, o deck exclui o que ele já decidiu e o estado traz o Gostei/Favorito dele.
 */
export const rpcSwipe: Record<string, RpcConfig> = {
  fn_swipe_deck: { schema: 'public', requiresAuth: false, optionalAuth: true },
  fn_swipe_record: { schema: 'public' },
  fn_swipe_liked: { schema: 'public' },
  fn_service_reaction_state: { schema: 'public', requiresAuth: false, optionalAuth: true },
  fn_service_react: { schema: 'public' },
};

/**
 * Resource `service_reactions` — as linhas do usuário logado em `service_user_favorites` (RLS por
 * dono), uma por (anúncio, kind): `like` (gostei), `favorite` (favorito) ou `skip` (passou no
 * swipe). Remover é `active = false`, nunca DELETE. Somente leitura na prática — gravar é pelas
 * RPCs `fn_service_react` / `fn_swipe_record`, que mantêm os totais em `services`.
 * Spread em `postgrestResources` do projeto.
 */
export const resourceServiceReactions: Record<string, ResourceConfig> = {
  service_reactions: {
    schema: 'public',
    table: 'service_user_favorites',
    select: 'uid,service_uid,kind,active,created_at,updated_at',
    primaryKey: 'uid',
    defaultOrder: 'updated_at.desc',
    searchableColumns: [],
    mapOutput: (r) => ({
      uid: String(r.uid ?? ''),
      serviceUid: String(r.service_uid ?? ''),
      kind: String(r.kind ?? ''),
      active: Boolean(r.active),
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    }),
  },
};
