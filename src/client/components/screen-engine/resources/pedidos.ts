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
export const resourcePedidos: Record<string, ResourceConfig> = {
  pedido: {
    schema: 'public',
    table: 'pedido',
    select:
      'id,uid,cliente_id,prestador_id,conversation_id,origem,status,created_at,updated_at,conversation:conversation_id(uid)',
    primaryKey: 'id',
    defaultOrder: '-created_at',
    searchableColumns: [],
    mapInput: () => ({}),
    mapOutput: (record) => ({
      id: String(record.id ?? ''),
      uid: record.uid ?? null,
      // `list-block.tsx` renders `item.title || item.name || 'Sem título'` — sem isso toda linha
      // da lista mostra o mesmo placeholder. Derivado só de colunas já presentes na row (sem
      // embed novo para nome da contraparte — ver nota de follow-up no report da bateria de fixes).
      title: `Pedido #${record.id ?? ''} — ${record.origem === 'anuncio' ? 'via anúncio' : 'via demanda'}`,
      clienteId: record.cliente_id ?? null,
      prestadorId: record.prestador_id ?? null,
      conversationUid: (record.conversation as { uid?: string } | null)?.uid ?? null,
      origem: record.origem ?? null,
      status: record.status ?? null,
      createdAt: record.created_at ?? record.createdAt,
      updatedAt: record.updated_at ?? record.updatedAt,
    }),
  },
  pedido_servico: {
    schema: 'public',
    table: 'pedido_servico',
    select:
      'id,uid,pedido_id,service_id,status,agenda_event_id,created_at,updated_at,service:service_id(id,title,extras)',
    primaryKey: 'id',
    defaultOrder: 'created_at',
    searchableColumns: [],
    mapInput: () => ({}),
    mapOutput: (record) => ({
      id: String(record.id ?? ''),
      uid: record.uid ?? null,
      pedidoId: record.pedido_id ?? null,
      serviceId: record.service_id ?? null,
      status: record.status ?? null,
      agendaEventId: record.agenda_event_id ?? null,
      service: record.service ?? null,
      createdAt: record.created_at ?? record.createdAt,
      updatedAt: record.updated_at ?? record.updatedAt,
    }),
  },
};
