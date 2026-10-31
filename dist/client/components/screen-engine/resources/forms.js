/**
 * Server-side `postgrestResources` config for the `forms` plugin table (config rows), shaped to
 * be spread straight into a consuming project's `postgrestResources` registry (foco-total spreads
 * `resourceForms` + `resourceFormResults` directly in `src/lib/server/resources/index.ts`). Keyed
 * by resource name, camel <-> snake
 * in mapInput/mapOutput, `schema` (the FormSchema jsonb from the form-builder engine) passed
 * through untouched.
 *
 * Not a `ResourceScreenConfig` (that is the screen-engine's client-side shape) — this is the
 * generic CRUD-route resource config. The local `PostgrestResourceConfig` type mirrors
 * foco-total's `ResourceConfig` (`src/lib/server/resources/resource-types.ts`) structurally so
 * kizuna-core can type-check it without importing from the consumer.
 */
function toBool(value, fallback = true) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value === 1;
    if (typeof value === 'string') {
        const n = value.trim().toLowerCase();
        return n === '1' || n === 'true' || n === 't';
    }
    return fallback;
}
function toSchema(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value;
    }
    return {};
}
export const FORMS_RESOURCE = {
    schema: 'public',
    table: 'forms',
    returnRepresentation: true,
    select: 'id,uid,form_key,title,description,schema,version,is_reusable,active,created_by,created_at,updated_at',
    primaryKey: 'id',
    defaultOrder: 'title',
    searchableColumns: ['form_key', 'title', 'description'],
    requiredFields: ['form_key', 'title'],
    maxPageSize: 200,
    mapInput: (input) => {
        const formKey = String(input.formKey ?? input.form_key ?? '').trim();
        const title = String(input.title ?? '').trim();
        const description = String(input.description ?? '').trim();
        const payload = {
            form_key: formKey,
            title,
            description: description || null,
            schema: toSchema(input.schema),
            is_reusable: toBool(input.isReusable ?? input.is_reusable, true),
            active: toBool(input.active, true),
        };
        return payload;
    },
    mapOutput: (record) => ({
        id: record.id,
        uid: record.uid,
        formKey: record.form_key ?? record.formKey ?? '',
        title: record.title ?? '',
        description: record.description ?? '',
        schema: toSchema(record.schema),
        version: Number(record.version ?? 1),
        isReusable: toBool(record.is_reusable ?? record.isReusable, true),
        active: toBool(record.active, true),
        createdBy: record.created_by ?? record.createdBy ?? null,
        createdAt: record.created_at ?? record.createdAt,
        updatedAt: record.updated_at ?? record.updatedAt,
    }),
};
export const resourceForms = {
    forms: FORMS_RESOURCE,
};
//# sourceMappingURL=forms.js.map