import type { ResourceConfig } from '../types/resource-config';
/**
 * `ResourceConfig`s for the `pedidos` plugin tables, exposed through a consuming app's
 * `/api/resources/[resource]` proxy. Spread into the app's `postgrestResources` registry
 * (foco-total spreads `resourcePedidos` in `src/lib/server/resources/index.ts`, via
 * `resource-pedidos.ts`).
 *
 * Read-only through the generic route — every write goes through an RPC
 * (`fn_pedido_create` / `fn_pedido_add_servico` / `fn_pedido_servico_atualizar_status` /
 * `fn_pedido_cancelar`; see `kizuna-core/plugins/pedidos/0001_pedidos.sql`), the same split
 * `services` / `service_moderations` already use, so `mapInput` on both keys is `() => ({})`.
 */
export declare const resourcePedidos: Record<string, ResourceConfig>;
//# sourceMappingURL=pedidos.d.ts.map