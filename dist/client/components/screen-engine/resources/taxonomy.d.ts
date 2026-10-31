import type { ResourceConfig } from '../types/resource-config';
/**
 * Server-side `postgrestResources` configs for the `taxonomy` plugin
 * (`categories_group` -> `categories` -> `categories_sub` -> `categories_sub_tags`),
 * shaped to be spread straight into a consuming project's `postgrestResources`
 * registry. The `taxonomy` plugin owns these resources — the `taxonomy-manager` /
 * `taxonomy-edit-panel` components in kizuna-core already expect resources named
 * `categories_group` / `categories` / `subcategories` / `categories_sub_tags` to
 * exist, so they ship from here, not from each project.
 *
 * A consuming project imports `resourceTaxonomy` and spreads it into its own
 * registry; anything project-specific (extra columns, views, embedded counts)
 * goes into a separate resource with a different name in that project.
 *
 * `categories` / `categories_sub` are the consuming project's own base tables —
 * the plugin only ALTERs columns onto them (`category_group_id`, `icon`,
 * `description`, `form_key`, `request_form_key`, `tenant_id`, `created_by`).
 * `form_key` is the provider-filled form, `request_form_key` the buyer-filled
 * quote/order-request form. `categories_group` and
 * `categories_sub_tags` are created by the plugin.
 */
export declare const resourceTaxonomy: Record<string, ResourceConfig>;
//# sourceMappingURL=taxonomy.d.ts.map