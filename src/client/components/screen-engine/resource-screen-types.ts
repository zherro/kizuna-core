/**
 * JSON config for the generic `ResourceScreen` block (see
 * `src/components/screen-engine/resource-screen.tsx`). Drives a standard
 * "form + searchable/paginated list" CRUD screen against one entry of
 * `postgrestResources` (`src/lib/server/resources/index.ts`) —
 * no per-screen component needed for this shape anymore.
 *
 * Only ONE `relation` field is supported per screen. That is a deliberate
 * simplification, not an oversight: supporting N relation fields would mean
 * calling `useResourceOptions` a variable number of times, which breaks
 * the rules of hooks. A screen with more than one relationship (e.g. the
 * group → category → subcategory → tag tree in taxonomia) is a genuinely
 * different shape — build/register a dedicated component for it instead of
 * stretching this one.
 */
export type ResourceScreenFieldBase = {
  name: string;
  label: string;
  /** Defaults to true for text/relation. Not applicable to switch. */
  required?: boolean;
};

export type ResourceScreenTextField = ResourceScreenFieldBase & {
  type: 'text';
  placeholder?: string;
};

export type ResourceScreenTextareaField = ResourceScreenFieldBase & {
  type: 'textarea';
  placeholder?: string;
  maxLength?: number;
  rows?: number;
};

export type ResourceScreenSwitchField = ResourceScreenFieldBase & {
  type: 'switch';
  defaultValue?: boolean;
};

export type ResourceScreenRelationField = ResourceScreenFieldBase & {
  type: 'relation';
  /** Resource to load options from, e.g. "categories". */
  optionsResource: string;
  /** Field on each option item used as its display label. Default "name". */
  optionsLabelField?: string;
  optionsFilter?: Record<string, string | number | boolean>;
  placeholder?: string;
};

/** Static enum picker — options are fixed at config time, not loaded from a resource. Use `relation` instead when the options come from another table. */
export type ResourceScreenSelectField = ResourceScreenFieldBase & {
  type: 'select';
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
};

export type ResourceScreenField =
  | ResourceScreenTextField
  | ResourceScreenTextareaField
  | ResourceScreenSwitchField
  | ResourceScreenRelationField
  | ResourceScreenSelectField;

export type ResourceScreenListConfig = {
  /** Field shown as the row's title. */
  primaryField: string;
  /** Field shown as a small uppercase tag under the title, e.g. slug. */
  secondaryField?: string;
  /** Boolean field rendered as "ATIVO"/"INATIVO". */
  statusField?: string;
  /** Long-text field rendered under the row's metadata. */
  descriptionField?: string;
  /** Label prefix for the resolved relation option, e.g. "Categoria: ". Requires a `relation` field in `fields`. */
  relationLabelPrefix?: string;
};

export type ResourceScreenMessages = {
  saveError?: string;
  saveSuccess?: string;
  connectionError?: string;
  deleteError?: string;
  deleteSuccess?: string;
};

export type ResourceScreenConfig = {
  /** Key in `postgrestResources`. */
  resource: string;
  /** Lowercase singular, used in generated headings ("Nova categoria"). */
  entitySingular: string;
  entityPlural: string;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Block create/edit and show a warning while the relation options list is empty. */
  requireRelationToCreate?: boolean;
  fields: ResourceScreenField[];
  list: ResourceScreenListConfig;
  messages?: ResourceScreenMessages;
};
