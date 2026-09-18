import type { ResourceConfig } from '../types/resource-config';
/**
 * `ResourceConfig`s for the `demandas` plugin tables, exposed through a consuming app's
 * `/api/resources/[resource]` proxy. Spread into the app's `postgrestResources` registry
 * (foco-total spreads `resourceDemandas` in `src/lib/server/resources/index.ts`, via
 * `resource-demandas.ts`).
 *
 * `demanda` INSERT is RLS-permitted directly (fn_demanda_create is SECURITY INVOKER — see
 * plugins/demandas/0001_demandas.sql), but the app only ever creates demandas through that RPC
 * (it also writes form_results atomically) — mapInput stays `() => ({})` here, same read-only
 * split `pedido` uses even though its writes are all SECURITY DEFINER RPCs instead.
 */
export declare const resourceDemandas: Record<string, ResourceConfig>;
//# sourceMappingURL=demandas.d.ts.map