export type TaxonomyGroup = {
  id: string | number;
  name: string;
  slug: string;
  description: string;
  tags: string;
  icon: string;
  sortOrder: number;
  active: boolean;
};

export type TaxonomyCategory = {
  id: string | number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  /** form_key of an active `public.forms` row (forms plugin). When set, the service wizard shows
   * the dynamic form step for services in this category. App-level column, not owned by taxonomy.
   * This is the form filled by the entity's PROVIDER. */
  formKey?: string | null;
  /** form_key of an active `public.forms` row (forms plugin) used for the BUYER's quote/order-request
   * flow for entities in this category. Buyer-facing sibling of `formKey`. */
  requestFormKey?: string | null;
  categoryGroupId: string | number | null;
  active: boolean;
};

export type TaxonomySubcategory = {
  id: string | number;
  name: string;
  slug: string;
  description: string;
  categoryId: string | number;
  active: boolean;
};

export type TaxonomyTag = {
  id: string | number;
  name: string;
  slug: string;
  description: string;
  categoryId: string | number;
  categorySubId: string | number;
  active: boolean;
};

export type TaxonomyLevel = 'group' | 'category' | 'subcategory' | 'tag';

export type TaxonomyItem = TaxonomyGroup | TaxonomyCategory | TaxonomySubcategory | TaxonomyTag;

export type TaxonomyEditTarget =
  | { level: 'group'; item: TaxonomyGroup | null; defaultSortOrder?: number }
  | { level: 'category'; item: TaxonomyCategory | null }
  | {
      level: 'subcategory';
      item: TaxonomySubcategory | null;
      defaultCategoryId?: string | number;
    }
  | {
      level: 'tag';
      item: TaxonomyTag | null;
      defaultCategoryId?: string | number;
      defaultCategorySubId?: string | number;
    };

export const TAXONOMY_RESOURCE_BY_LEVEL: Record<TaxonomyLevel, string> = {
  group: 'categories_group',
  category: 'categories',
  subcategory: 'subcategories',
  tag: 'categories_sub_tags',
};

export const TAXONOMY_LEVEL_LABEL: Record<TaxonomyLevel, string> = {
  group: 'grupo',
  category: 'categoria',
  subcategory: 'especialidade',
  tag: 'tag',
};

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
