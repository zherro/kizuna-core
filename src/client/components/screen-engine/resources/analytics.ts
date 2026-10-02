import type { ResourceConfig } from '../types/resource-config';
import type { RpcConfig } from '@kizuna/core/types';

/**
 * Plugin `analytics`. Spread em `postgrestResources` / `postgrestRpcs` do projeto.
 *
 * - `analytics_events`: leitura das linhas do tenant (RLS pelo dono do anúncio). Só GET é usado;
 *   a escrita NÃO passa pelo CRUD genérico (exige login) e sim pela RPC abaixo.
 * - `fn_analytics_track`: escrita pública (visitante anônimo), sessão opcional — o INSERT é
 *   protegido por RLS/CHECK/UNIQUE no banco (plugins/analytics/0001_analytics.sql).
 */
export const resourceAnalytics: Record<string, ResourceConfig> = {
  analytics_events: {
    schema: 'public',
    table: 'analytics_events',
    select: 'entity_id,visitor_hash,day,event_type,source',
    primaryKey: 'id',
    defaultOrder: 'id',
    searchableColumns: [],
    maxPageSize: 1000,
    returnCountPreferDisabled: true,
  },
};

export const rpcAnalytics: Record<string, RpcConfig> = {
  fn_analytics_track: { schema: 'public', requiresAuth: false, optionalAuth: true },
};
