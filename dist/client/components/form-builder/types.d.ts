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
export type FieldType = 'text' | 'textarea' | 'number' | 'decimal' | 'currency' | 'date' | 'time' | 'datetime' | 'phone' | 'email' | 'url' | 'password' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'switch' | 'upload' | 'image' | 'rating' | 'slider' | 'color' | 'hidden' | 'divider' | 'heading' | 'info';
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type GridConfig = Partial<Record<Breakpoint, number>> & {
    offset?: Partial<Record<Breakpoint, number>>;
    newLine?: boolean;
    align?: 'start' | 'center' | 'end';
    order?: number;
};
export type SelectOption = {
    label: string;
    value: string;
};
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
export declare const FIELD_TYPE_LABELS: Record<FieldType, string>;
export declare const DEFAULT_GRID: GridConfig;
/** Field types that hold no value (layout only). */
export declare const NON_VALUE_TYPES: ReadonlySet<FieldType>;
/** Field types offering an option list. */
export declare const OPTION_TYPES: ReadonlySet<FieldType>;
export declare const KEY_REGEX: RegExp;
/** Slugify a label into a candidate `key` (lower snake, ascii). */
export declare function slugifyKey(label: string): string;
export declare function uid(prefix?: string): string;
export declare function createField(type: FieldType): FormField;
/** Effective output key for a field (falls back to id for not-yet-keyed drafts). */
export declare function fieldKey(field: Pick<FormField, 'key' | 'id'>): string;
/**
 * Collect key problems in a schema, keyed by field `id`:
 * empty key, invalid format, or duplicate. Consumed by `FormBuilder` to block
 * an invalid save.
 */
export declare function collectKeyIssues(schema: FormSchema): Record<string, string>;
//# sourceMappingURL=types.d.ts.map