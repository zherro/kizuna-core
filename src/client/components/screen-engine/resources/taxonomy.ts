import { makeSlug, parseActive } from '../utils/resource-utils';
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
export const resourceTaxonomy: Record<string, ResourceConfig> = {
  categories: {
    schema: 'public',
    table: 'categories',
    select:
      'id,name,slug,description,icon,form_key,request_form_key,category_group_id,active,created_at,updated_at',
    primaryKey: 'id',
    defaultOrder: 'name',
    searchableColumns: ['name', 'description', 'slug'],
    requiredFields: ['name'],
    maxPageSize: 500,
    mapInput: (input) => {
      const name = String(input.name ?? '').trim();
      const description = String(input.description ?? '').trim();
      const icon = String(input.icon ?? '').trim();
      const active = parseActive(input.active);
      const rawSlug = String(input.slug ?? '').trim();
      const slug = makeSlug(rawSlug || name);
      const groupIdRaw = input.categoryGroupId ?? input.category_group_id;
      const categoryGroupId = Number(groupIdRaw);
      const formKey = String(input.formKey ?? input.form_key ?? '').trim();
      const requestFormKey = String(input.requestFormKey ?? input.request_form_key ?? '').trim();

      return {
        name,
        description,
        slug,
        icon,
        form_key: formKey || null,
        request_form_key: requestFormKey || null,
        category_group_id: Number.isFinite(categoryGroupId) ? categoryGroupId : null,
        active,
      };
    },
    mapOutput: (record) => ({
      id: record.id,
      name: record.name,
      slug: record.slug,
      description: record.description ?? '',
      icon: record.icon ?? '',
      formKey: record.form_key ?? record.formKey ?? null,
      requestFormKey: record.request_form_key ?? record.requestFormKey ?? null,
      categoryGroupId: record.category_group_id ?? record.categoryGroupId ?? null,
      active: parseActive(record.active),
      createdAt: record.created_at ?? record.createdAt,
      updatedAt: record.updated_at ?? record.updatedAt,
    }),
  },
  categories_group: {
    schema: 'public',
    table: 'categories_group',
    select: 'id,name,slug,description,tags,icon,sort_order,active,created_at,updated_at',
    primaryKey: 'id',
    defaultOrder: 'sort_order',
    searchableColumns: ['name', 'description', 'slug', 'tags'],
    requiredFields: ['name'],
    maxPageSize: 100,
    mapInput: (input) => {
      const name = String(input.name ?? '').trim();
      const description = String(input.description ?? '').trim();
      const tags = String(input.tags ?? '').trim();
      const icon = String(input.icon ?? '').trim();
      const active = parseActive(input.active);
      const rawSlug = String(input.slug ?? '').trim();
      const slug = makeSlug(rawSlug || name);
      const sortOrderRaw = input.sortOrder ?? input.sort_order;
      const sortOrder = Number(sortOrderRaw);

      return {
        name,
        description,
        slug,
        tags,
        icon,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        active,
      };
    },
    mapOutput: (record) => ({
      id: record.id,
      name: record.name,
      slug: record.slug,
      description: record.description ?? '',
      icon: record.icon ?? '',
      tags: record.tags ?? '',
      sortOrder: Number(record.sort_order ?? record.sortOrder ?? 0),
      active: parseActive(record.active),
      createdAt: record.created_at ?? record.createdAt,
      updatedAt: record.updated_at ?? record.updatedAt,
    }),
  },
  subcategories: {
    schema: 'public',
    table: 'categories_sub',
    select: 'id,name,slug,description,category_id,active,created_at,updated_at',
    primaryKey: 'id',
    defaultOrder: 'name',
    searchableColumns: ['name', 'description', 'slug'],
    requiredFields: ['name', 'category_id'],
    maxPageSize: 500,
    mapInput: (input) => {
      const name = String(input.name ?? '').trim();
      const description = String(input.description ?? '').trim();
      const categoryIdRaw = input.categoryId ?? input.category_id;
      const categoryId = Number(categoryIdRaw);
      const active = parseActive(input.active);
      const rawSlug = String(input.slug ?? '').trim();
      const slug = makeSlug(rawSlug || name);

      return {
        name,
        slug,
        description,
        category_id: Number.isFinite(categoryId) ? categoryId : null,
        active,
      };
    },
    mapOutput: (record) => ({
      id: record.id,
      name: record.name,
      slug: record.slug,
      description: record.description ?? '',
      categoryId: record.category_id ?? record.categoryId,
      active: parseActive(record.active),
      createdAt: record.created_at ?? record.createdAt,
      updatedAt: record.updated_at ?? record.updatedAt,
    }),
  },
  categories_sub_tags: {
    schema: 'public',
    table: 'categories_sub_tags',
    select: 'id,name,slug,description,category_id,category_sub_id,active,created_at,updated_at',
    primaryKey: 'id',
    defaultOrder: 'name',
    searchableColumns: ['name', 'description', 'slug'],
    requiredFields: ['name', 'category_id', 'category_sub_id'],
    maxPageSize: 1000,
    mapInput: (input) => {
      const name = String(input.name ?? '').trim();
      const description = String(input.description ?? '').trim();
      const categoryIdRaw = input.categoryId ?? input.category_id;
      const categoryId = Number(categoryIdRaw);
      const categorySubIdRaw = input.categorySubId ?? input.category_sub_id;
      const categorySubId = Number(categorySubIdRaw);
      const active = parseActive(input.active);
      const rawSlug = String(input.slug ?? '').trim();
      const slug = makeSlug(rawSlug || name);

      return {
        name,
        slug,
        description,
        category_id: Number.isFinite(categoryId) ? categoryId : null,
        category_sub_id: Number.isFinite(categorySubId) ? categorySubId : null,
        active,
      };
    },
    mapOutput: (record) => ({
      id: record.id,
      name: record.name,
      slug: record.slug,
      description: record.description ?? '',
      categoryId: record.category_id ?? record.categoryId,
      categorySubId: record.category_sub_id ?? record.categorySubId,
      active: parseActive(record.active),
      createdAt: record.created_at ?? record.createdAt,
      updatedAt: record.updated_at ?? record.updatedAt,
    }),
  },
  categories_public: {
    schema: 'public',
    table: 'categories',
    listRequiresAuth: false,
    select: 'id,name,slug,description,active,created_at,updated_at',
    primaryKey: 'id',
    defaultOrder: 'name',
    searchableColumns: ['name', 'description', 'slug'],
    mapOutput: (record) => ({
      id: record.id,
      name: record.name,
      slug: record.slug,
      description: record.description ?? '',
      active: parseActive(record.active),
      createdAt: record.created_at ?? record.createdAt,
      updatedAt: record.updated_at ?? record.updatedAt,
    }),
  },
  subcategories_public: {
    schema: 'public',
    table: 'categories_sub',
    listRequiresAuth: false,
    select: 'id,name,slug,description,category_id,active,created_at,updated_at',
    primaryKey: 'id',
    defaultOrder: 'name',
    searchableColumns: ['name', 'description', 'slug'],
    mapOutput: (record) => ({
      id: record.id,
      name: record.name,
      slug: record.slug,
      description: record.description ?? '',
      categoryId: record.category_id ?? record.categoryId,
      active: parseActive(record.active),
      createdAt: record.created_at ?? record.createdAt,
      updatedAt: record.updated_at ?? record.updatedAt,
    }),
  },
};
