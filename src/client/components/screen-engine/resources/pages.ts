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
export const PAGES_RESOURCE: Record<string, ResourceConfig> = {
  pages: {
    schema: 'public',
    table: 'pages',
    returnRepresentation: true,
    select: 'id,uid,slug,title,description,content,status,active,created_by,created_at,updated_at',
    primaryKey: 'id',
    defaultOrder: 'title',
    searchableColumns: ['slug', 'title'],
    requiredFields: ['slug', 'title'],
    // No `softDeleteField`: that mechanism expects a flag that is *truthy* when deleted, but
    // pages soft-delete by setting `active = false` (opposite polarity). PagesAdmin issues the
    // PATCH `{ active: false }` itself. A raw DELETE would 403 anyway (plugin REVOKEs DELETE).
    mapInput: (input) => {
      const out: Record<string, unknown> = {};
      if (input.title !== undefined) out.title = String(input.title ?? '').trim();
      if (input.slug !== undefined) out.slug = String(input.slug ?? '').trim().toLowerCase();
      if (input.description !== undefined)
        out.description = String(input.description ?? '').trim() || null;
      if (input.content !== undefined) out.content = String(input.content ?? '');
      if (input.status !== undefined) {
        const status = String(input.status ?? '').trim().toLowerCase();
        out.status = status === 'published' ? 'published' : 'draft';
      }
      if (input.active !== undefined) {
        out.active =
          typeof input.active === 'boolean'
            ? input.active
            : String(input.active ?? 'true').trim().toLowerCase() !== 'false';
      }
      return out;
    },
    mapOutput: (record) => ({
      id: record.id,
      uid: record.uid,
      slug: record.slug,
      title: record.title,
      description: record.description ?? '',
      content: record.content ?? '',
      status: record.status ?? 'draft',
      active:
        typeof record.active === 'boolean' ? record.active : record.active !== 'false',
      createdBy: record.created_by ?? record.createdBy ?? null,
      createdAt: record.created_at ?? record.createdAt,
      updatedAt: record.updated_at ?? record.updatedAt,
    }),
  },
};
