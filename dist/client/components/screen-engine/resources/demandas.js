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
export const resourceDemandas = {
    demanda: {
        schema: 'public',
        table: 'demanda',
        select: 'id,uid,cliente_id,category_id,status,created_at,updated_at,category:category_id(id,name,icon)',
        primaryKey: 'id',
        defaultOrder: 'created_at',
        searchableColumns: [],
        mapInput: () => ({}),
        mapOutput: (record) => {
            const category = record.category;
            return {
                id: String(record.id ?? ''),
                uid: record.uid ?? null,
                title: category?.name ? `Demanda — ${category.name}` : `Demanda #${record.id ?? ''}`,
                clienteId: record.cliente_id ?? null,
                categoryId: record.category_id ?? null,
                category: category ?? null,
                status: record.status ?? null,
                createdAt: record.created_at ?? record.createdAt,
                updatedAt: record.updated_at ?? record.updatedAt,
            };
        },
    },
    demanda_moderacao: {
        schema: 'public',
        table: 'demanda_moderacao',
        select: 'id,uid,demanda_id,decision,decision_note,rejection_reason,decided_at,created_at,updated_at',
        primaryKey: 'id',
        defaultOrder: 'created_at',
        searchableColumns: [],
        mapInput: () => ({}),
        mapOutput: (record) => ({
            id: String(record.id ?? ''),
            uid: record.uid ?? null,
            demandaId: record.demanda_id ?? null,
            decision: record.decision ?? null,
            decisionNote: record.decision_note ?? null,
            rejectionReason: record.rejection_reason ?? null,
            decidedAt: record.decided_at ?? record.decidedAt,
            createdAt: record.created_at ?? record.createdAt,
            updatedAt: record.updated_at ?? record.updatedAt,
        }),
    },
    demanda_proposta: {
        schema: 'public',
        table: 'demanda_proposta',
        select: 'id,uid,demanda_id,prestador_id,mensagem,status,created_at,updated_at,demanda:demanda_id(uid,cliente_id,category_id)',
        primaryKey: 'id',
        defaultOrder: 'created_at',
        searchableColumns: [],
        mapInput: () => ({}),
        mapOutput: (record) => {
            const demanda = record.demanda;
            return {
                id: String(record.id ?? ''),
                uid: record.uid ?? null,
                demandaId: record.demanda_id ?? null,
                demandaUid: demanda?.uid ?? null,
                demandaClienteId: demanda?.cliente_id ?? null,
                prestadorId: record.prestador_id ?? null,
                mensagem: record.mensagem ?? null,
                status: record.status ?? null,
                createdAt: record.created_at ?? record.createdAt,
                updatedAt: record.updated_at ?? record.updatedAt,
            };
        },
    },
    demanda_proposta_servico: {
        schema: 'public',
        table: 'demanda_proposta_servico',
        select: 'id,uid,proposta_id,service_id,created_at,updated_at,service:service_id(id,title,extras)',
        primaryKey: 'id',
        defaultOrder: 'created_at',
        searchableColumns: [],
        mapInput: () => ({}),
        mapOutput: (record) => ({
            id: String(record.id ?? ''),
            uid: record.uid ?? null,
            propostaId: record.proposta_id ?? null,
            serviceId: record.service_id ?? null,
            service: record.service ?? null,
            createdAt: record.created_at ?? record.createdAt,
            updatedAt: record.updated_at ?? record.updatedAt,
        }),
    },
};
//# sourceMappingURL=demandas.js.map