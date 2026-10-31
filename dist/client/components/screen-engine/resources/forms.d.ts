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
export type PostgrestResourceConfig = {
    schema?: string;
    table: string;
    listRequiresAuth?: boolean;
    returnRepresentation?: boolean;
    returnCountPreferDisabled?: boolean;
    select: string;
    primaryKey: string;
    defaultOrder?: string;
    searchableColumns: string[];
    maxPageSize?: number;
    requiredFields?: string[];
    softDeleteField?: string;
    mapInput?: (input: Record<string, unknown>) => Record<string, unknown>;
    mapOutput?: (record: Record<string, unknown>) => Record<string, unknown>;
};
export declare const FORMS_RESOURCE: PostgrestResourceConfig;
export declare const resourceForms: Record<string, PostgrestResourceConfig>;
//# sourceMappingURL=forms.d.ts.map