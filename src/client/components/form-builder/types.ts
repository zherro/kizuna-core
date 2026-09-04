/**
 * Form Builder engine — schema model (framework-free, no React).
 *
 * Migrated from the external template `form-builder/types.ts` with 4 additive
 * model changes (see the plugin-1 design doc):
 *   1. `FormField.key` — required, slug format, unique within a schema.
 *   2. `FormField.visibleWhen` — conditional visibility.
 *   3. `FormField.optionsSource` — resource-backed options.
 *   4. Appearance polish (`icon`, `helpText`, `tooltip` already existed).
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'decimal'
  | 'currency'
  | 'date'
  | 'time'
  | 'datetime'
  | 'phone'
  | 'email'
  | 'url'
  | 'password'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'switch'
  | 'upload'
  | 'image'
  | 'rating'
  | 'slider'
  | 'color'
  | 'hidden'
  | 'divider'
  | 'heading'
  | 'info';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export type GridConfig = Partial<Record<Breakpoint, number>> & {
  offset?: Partial<Record<Breakpoint, number>>;
  newLine?: boolean;
  align?: 'start' | 'center' | 'end';
  order?: number;
};

export type SelectOption = { label: string; value: string };

export type FieldValidation = {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  regex?: string;
  message?: string;
};

export type FieldBehavior = {
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  defaultValue?: unknown;
};

export type FieldAppearance = {
  icon?: string;
  helpText?: string;
  tooltip?: string;
};

/** Conditional-visibility rule — evaluated against the current form values. */
export type VisibleWhen = {
  /** another field's `key` (only backward references are offered in the builder) */
  field: string;
  op: 'eq' | 'ne' | 'in' | 'gt' | 'lt' | 'truthy';
  /** omitted for `truthy` */
  value?: unknown;
};

/** Resource-backed options for `select` / `multiselect` / `radio`. */
export type OptionsSource = {
  /** a registered postgrest resource name */
  resource: string;
  labelField: string;
  valueField: string;
  /** static PostgREST filter fragments */
  filter?: Record<string, string>;
};

export type FormField = {
  /** React key / internal only — stays random */
  id: string;
  /** required, slug format `^[a-z][a-z0-9_]*$`, unique within a schema */
  key: string;
  /** kept for template parity — defaults to `key` */
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  grid: GridConfig;
  behavior: FieldBehavior;
  validation: FieldValidation;
  appearance: FieldAppearance;
  options?: SelectOption[];
  optionsSource?: OptionsSource;
  visibleWhen?: VisibleWhen;
  min?: number;
  max?: number;
  step?: number;
};

export type FormSchema = {
  title: string;
  description?: string;
  fields: FormField[];
};

export type FormValues = Record<string, unknown>;

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto',
  textarea: 'Texto Longo',
  number: 'Número',
  decimal: 'Decimal',
  currency: 'Moeda',
  date: 'Data',
  time: 'Hora',
  datetime: 'Data e Hora',
  phone: 'Telefone',
  email: 'Email',
  url: 'URL',
  password: 'Senha',
  select: 'Select',
  multiselect: 'Multi Select',
  radio: 'Radio',
  checkbox: 'Checkbox',
  switch: 'Switch',
  upload: 'Upload',
  image: 'Upload de Imagens',
  rating: 'Rating',
  slider: 'Slider',
  color: 'Color Picker',
  hidden: 'Hidden',
  divider: 'Divider',
  heading: 'Heading',
  info: 'Texto Informativo',
};

export const DEFAULT_GRID: GridConfig = { xs: 12, sm: 12, md: 6, lg: 6, xl: 6, '2xl': 6 };

/** Field types that hold no value (layout only). */
export const NON_VALUE_TYPES: ReadonlySet<FieldType> = new Set<FieldType>([
  'divider',
  'heading',
  'info',
]);

/** Field types offering an option list. */
export const OPTION_TYPES: ReadonlySet<FieldType> = new Set<FieldType>([
  'select',
  'multiselect',
  'radio',
]);

export const KEY_REGEX = /^[a-z][a-z0-9_]*$/;

/** Slugify a label into a candidate `key` (lower snake, ascii). */
export function slugifyKey(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .replace(/_+$/g, '');
}

let counter = 0;
export function uid(prefix = 'f') {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export function createField(type: FieldType): FormField {
  const base: FormField = {
    id: uid(),
    key: '',
    name: '',
    type,
    label: FIELD_TYPE_LABELS[type],
    placeholder: '',
    description: '',
    grid: { ...DEFAULT_GRID },
    behavior: {},
    validation: {},
    appearance: {},
  };
  if (OPTION_TYPES.has(type)) {
    base.options = [
      { label: 'Opção 1', value: 'opcao_1' },
      { label: 'Opção 2', value: 'opcao_2' },
    ];
  }
  if (type === 'slider' || type === 'rating') {
    base.min = 0;
    base.max = type === 'rating' ? 5 : 100;
    base.step = 1;
  }
  if (type === 'heading') base.label = 'Título da seção';
  if (type === 'info') base.label = 'Texto informativo';
  if (type === 'divider') base.label = '';
  return base;
}

/** Effective output key for a field (falls back to id for not-yet-keyed drafts). */
export function fieldKey(field: Pick<FormField, 'key' | 'id'>): string {
  return field.key || field.id;
}

/**
 * Collect key problems in a schema, keyed by field `id`:
 * empty key, invalid format, or duplicate. Consumed by `FormBuilder` to block
 * an invalid save.
 */
export function collectKeyIssues(schema: FormSchema): Record<string, string> {
  const issues: Record<string, string> = {};
  const seen = new Map<string, string>();
  for (const f of schema.fields) {
    if (!f.key) {
      issues[f.id] = 'Defina uma chave para este campo.';
      continue;
    }
    if (!KEY_REGEX.test(f.key)) {
      issues[f.id] = 'Chave inválida (use letras minúsculas, números e _).';
      continue;
    }
    const prev = seen.get(f.key);
    if (prev) {
      issues[f.id] = `Chave duplicada: "${f.key}".`;
      issues[prev] = `Chave duplicada: "${f.key}".`;
      continue;
    }
    seen.set(f.key, f.id);
  }
  return issues;
}
