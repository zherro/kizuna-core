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
    // Lista explícita: auth_user NÃO tem SELECT em `ip` (bruto) — `select=*` daria permission denied.
    // `channel` exige a analytics 0005.
    select:
      'entity_id,visitor_hash,day,event_type,source,device,region_city,region_uf,ip_masked,ip_key,channel',
    primaryKey: 'id',
    defaultOrder: 'id',
    searchableColumns: [],
    maxPageSize: 1000,
    returnCountPreferDisabled: true,
  },
};

export const rpcAnalytics: Record<string, RpcConfig> = {
  fn_analytics_track: { schema: 'public', requiresAuth: false, optionalAuth: true },
  // Visitas do site agregadas (analytics 0005). Login obrigatório; a RLS só deixa ver quem tem
  // `analytics/site` (root sempre). Body: { p_from: 'YYYY-MM-DD', p_to: 'YYYY-MM-DD' }.
  fn_analytics_page_view_summary: { schema: 'public' },
};
