import type { ResourceConfig } from '../types/resource-config';
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
export declare const resourceServices: Record<string, ResourceConfig>;
//# sourceMappingURL=services.d.ts.map