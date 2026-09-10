import type { ResourceConfig } from '../types/resource-config';
/**
 * `ResourceConfig` for the `pages` plugin table (`public.pages`), exposed through the consuming
 * app's `/api/resources/[resource]` proxy. Spread into the app's `postgrestResources` registry
 * (foco-total spreads `PAGES_RESOURCE` directly in `src/lib/server/resources/index.ts`).
 *
 * pk `id` (bigserial), searchable by `slug`/`title`, soft-deleted via `active = false`.
 * `mapInput`/`mapOutput` translate camelCase (client) <-> snake_case (Postgres). `tenant_id`,
 * `created_by`, timestamps are all DB-defaulted and never accepted from the client body.
 */
export declare const PAGES_RESOURCE: Record<string, ResourceConfig>;
//# sourceMappingURL=pages.d.ts.map