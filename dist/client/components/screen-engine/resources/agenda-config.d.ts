/**
 * Server-side `postgrestResources` configs for the `agenda` plugin's *configuration* tables
 * (plugins/agenda/0002_agenda_config.sql): named weekly schedules, their weekday rows, and the
 * two per-tenant singletons (booking rules + notification preferences).
 *
 * Shaped to be spread straight into a consuming project's `postgrestResources` registry — the
 * same contract as `resourceForms` / `resourceReviews`. Everything is snake_case in and out
 * (no camelCase mapping): the tenant config UI (`components/agenda-config/`) and
 * `useTenantResource` consume these column names directly, matching foco-total's original
 * `business_hours` / `business_preferences` configs.
 *
 * `tenant_id` / `created_by` are resolved by column DEFAULT from the JWT (see the plugin SQL) —
 * never sent by the client, never in `mapInput`.
 *
 * Local `PostgrestResourceConfig` type mirrors foco-total's `ResourceConfig`
 * (`src/lib/server/resources/resource-types.ts`) structurally so kizuna-core type-checks it
 * without importing from a consumer. Same approach as `resources/forms.ts`.
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
export declare const AGENDA_SCHEDULE_RESOURCE: PostgrestResourceConfig;
export declare const AGENDA_SCHEDULE_HOURS_RESOURCE: PostgrestResourceConfig;
export declare const AGENDA_BOOKING_PREFERENCES_RESOURCE: PostgrestResourceConfig;
export declare const AGENDA_NOTIFICATION_PREFERENCES_RESOURCE: PostgrestResourceConfig;
export declare const resourceAgendaConfig: Record<string, PostgrestResourceConfig>;
//# sourceMappingURL=agenda-config.d.ts.map