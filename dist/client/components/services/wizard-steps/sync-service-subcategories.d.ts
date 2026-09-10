import type { ServiceSubcategoryLink } from '../service-type';
/**
 * Reconcile the `service_categories_sub` join rows for a service — the DELETE/POST-per-link diff
 * ported from the old `service-wizard.tsx` `syncSubcategoryLinks` (346-434).
 *
 * `prevLinks` is the set of links known to exist server-side. Steps never fetch, so:
 *  - create mode: `prevLinks` is `[]` → this is effectively forward-only (adds only).
 *  - edit/review mode: the page (Task 14) loads the existing links into
 *    `ctx.entities.serviceSubcategoryLinks` and passes them here → full reconcile.
 *
 * Returns the new link list on success; throws on any failure.
 */
export declare function syncServiceSubcategories(serviceId: string, groupId: string, categoryId: string, subIds: string[], prevLinks: ServiceSubcategoryLink[]): Promise<ServiceSubcategoryLink[]>;
//# sourceMappingURL=sync-service-subcategories.d.ts.map