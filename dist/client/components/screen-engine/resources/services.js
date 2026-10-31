import { parseActive } from '../utils/resource-utils';
/**
 * `ResourceConfig`s for the `services` plugin tables, exposed through a consuming app's
 * `/api/resources/[resource]` proxy. A consuming project imports `resourceServices` and
 * spreads it into its own `postgrestResources` registry.
 *
 * - `services` — the provider's service listing. `mapInput` is a clean snake-only projection:
 *   it reads camelCase or snake_case aliases for every field and returns only snake_case
 *   columns, never spreading the raw `input` (which would leak camelCase keys to PostgREST).
 *   `tenant_id` / `created_by` are never emitted — DB defaults own them.
 * - `service_categories_sub` — the `services` <-> taxonomy join table.
 * - `service_moderations` — one row per moderation decision. The route NEVER writes it
 *   (`mapInput: () => ({})`); all writes go through the `fn_service_moderate` RPC, which inserts
 *   the moderation row and derives `services.status` atomically.
 */
export const resourceServices = {
    services: {
        schema: 'public',
        table: 'services',
        returnRepresentation: true,
        select: 'id,uid,title,category_group:categories_group(id, name, slug, active, icon),category:categories(id, name, slug, icon),category_id,description,starting_price,price_unit,urgent_available,extras,status,sponsored,service_location,active,created_by,created_at,updated_at',
        primaryKey: 'id',
        defaultOrder: 'created_at',
        searchableColumns: ['title', 'description'],
        requiredFields: ['title', 'category_id'],
        mapInput: (input) => {
            const title = String(input.title ?? '').trim();
            // categories_group.id/categories.id/categories_sub.id are bigserial (migrated from uuid
            // 2026-08-31) — category_group_id/category_id are bigint FKs, back to Number().
            const categoryIdRaw = input.categoryId ?? input.category_id;
            const categoryId = Number(categoryIdRaw);
            const categoryGroupIdRaw = input.categoryGroupId ?? input.category_group_id;
            const categoryGroupId = Number(categoryGroupIdRaw);
            const startingPriceRaw = input.startingPrice ?? input.starting_price;
            const startingPrice = Number(startingPriceRaw);
            const extras = input.extras && typeof input.extras === 'object' ? input.extras : (input.extras ?? {});
            // service_location has a CHECK constraint (no_cliente|no_estabelecimento|remoto) that
            // rejects '' — only NULL or one of those values passes, so an unanswered step must send
            // null, never the empty-string default a not-yet-selected form field starts with.
            const serviceLocation = String(input.serviceLocation ?? input.service_location ?? '').trim();
            return {
                title,
                category_group_id: Number.isFinite(categoryGroupId) ? categoryGroupId : null,
                category_id: Number.isFinite(categoryId) ? categoryId : null,
                description: input.description ?? null,
                starting_price: Number.isFinite(startingPrice) ? startingPrice : 0,
                price_unit: input.priceUnit ?? input.price_unit ?? 'quote',
                urgent_available: parseActive(input.urgentAvailable ?? input.urgent_available ?? false),
                extras,
                status: input.status ?? 'pending',
                sponsored: parseActive(input.sponsored ?? false),
                service_location: serviceLocation || null,
                active: parseActive(input.active ?? true),
            };
        },
        mapOutput: (record) => {
            const categoryGroup = record.category_group && typeof record.category_group === 'object'
                ? record.category_group
                : null;
            const category = record.category && typeof record.category === 'object'
                ? record.category
                : null;
            return {
                id: String(record.id ?? ''),
                uid: record.uid,
                title: String(record.title ?? ''),
                categoryGroup,
                categoryGroupId: categoryGroup?.id ? String(categoryGroup.id) : null,
                category,
                categoryId: record.category_id ? String(record.category_id) : '',
                description: String(record.description ?? ''),
                startingPrice: record.starting_price ?? 0,
                priceUnit: String(record.price_unit ?? 'quote'),
                urgentAvailable: parseActive(record.urgent_available),
                extras: record.extras && typeof record.extras === 'object' ? record.extras : {},
                status: String(record.status ?? 'pending'),
                sponsored: parseActive(record.sponsored),
                serviceLocation: record.service_location ?? null,
                active: parseActive(record.active),
                createdBy: record.created_by ? String(record.created_by) : null,
                createdAt: record.created_at ?? record.createdAt,
                updatedAt: record.updated_at ?? record.updatedAt,
            };
        },
    },
    // `services` <-> taxonomy join table (a service can list multiple category/subcategory pairs).
    service_categories_sub: {
        schema: 'public',
        table: 'service_categories_sub',
        returnRepresentation: true,
        select: 'id,service_id,category_group_id,category_id,category_sub_id,active,created_at,updated_at',
        primaryKey: 'id',
        defaultOrder: 'created_at',
        searchableColumns: [],
        requiredFields: ['service_id', 'category_id', 'category_sub_id'],
        maxPageSize: 200,
        mapInput: (input) => {
            const serviceIdRaw = input.serviceId ?? input.service_id;
            const serviceId = Number(serviceIdRaw);
            const categoryIdRaw = input.categoryId ?? input.category_id;
            const categoryId = Number(categoryIdRaw);
            const categorySubIdRaw = input.categorySubId ?? input.category_sub_id;
            const categorySubId = Number(categorySubIdRaw);
            const categoryGroupIdRaw = input.categoryGroupId ?? input.category_group_id;
            const categoryGroupId = Number(categoryGroupIdRaw);
            return {
                service_id: Number.isFinite(serviceId) ? serviceId : null,
                category_group_id: Number.isFinite(categoryGroupId) ? categoryGroupId : null,
                category_id: Number.isFinite(categoryId) ? categoryId : null,
                category_sub_id: Number.isFinite(categorySubId) ? categorySubId : null,
                active: parseActive(input.active ?? true),
            };
        },
        mapOutput: (record) => ({
            id: String(record.id ?? ''),
            serviceId: record.service_id ? String(record.service_id) : '',
            categoryGroupId: record.category_group_id ?? record.categoryGroupId ?? null,
            categoryId: record.category_id ? String(record.category_id) : '',
            categorySubId: record.category_sub_id ? String(record.category_sub_id) : '',
            active: parseActive(record.active),
            createdAt: record.created_at ?? record.createdAt,
            updatedAt: record.updated_at ?? record.updatedAt,
        }),
    },
    // One row per moderation decision — never updated, always inserted, and only ever by the
    // `fn_service_moderate` RPC (which also derives `services.status`). The generic route must not
    // write it, hence `mapInput: () => ({})`. Who moderated is tracked via `created_by` (DB
    // default), same as `tenant_id`; there is no `reviewer_id` column.
    service_moderations: {
        schema: 'public',
        table: 'service_moderations',
        returnRepresentation: true,
        select: 'id,uid,service_id,priority,decision,decision_note,rejection_reason,decided_at,auto_approved,active,created_by,created_at,updated_at',
        primaryKey: 'id',
        defaultOrder: 'created_at',
        searchableColumns: ['decision_note', 'rejection_reason'],
        requiredFields: ['service_id', 'decision'],
        mapInput: () => ({}),
        mapOutput: (record) => ({
            id: String(record.id ?? ''),
            uid: record.uid,
            serviceId: record.service_id != null ? String(record.service_id) : '',
            reviewerId: record.created_by ?? null,
            priority: Number(record.priority ?? 2),
            decision: record.decision ?? null,
            decisionNote: record.decision_note ?? '',
            rejectionReason: record.rejection_reason ?? null,
            decidedAt: record.decided_at ?? null,
            autoApproved: parseActive(record.auto_approved),
            active: parseActive(record.active),
            createdAt: record.created_at ?? record.createdAt,
            updatedAt: record.updated_at ?? record.updatedAt,
        }),
    },
};
//# sourceMappingURL=services.js.map