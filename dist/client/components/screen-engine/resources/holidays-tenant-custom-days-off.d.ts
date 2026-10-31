import type { ResourceScreenConfig } from '../../../../types/resource-screen';
/**
 * `ResourceScreenConfig` for the `holidays_tenant_custom_days_off`
 * postgrestResource (tenant-owned custom days off, full CRUD).
 *
 * NOT wired into any `screens/*.ts` yet — this is one of two tabs on
 * `/painel/agenda/feriados` (`CustomDaysOffTab` in
 * `src/app/painel/agenda/feriados/page.tsx`), which stays hand-rolled
 * (`useForm`/`useTenantResource`) because the page as a whole crosses two
 * other resources (`holidays` + `holidays_tenant`) in its second tab — a
 * shape the engine doesn't compose today (one `resource-screen`/`list` per
 * resource; see `.claude/libs/screen-engine.md`, same category as
 * `taxonomia`). This file documents just this tab's CRUD shape, in
 * isolation, as a source of truth for a future UI builder.
 *
 * Two gaps vs. the real form (see file header of `resources/holidays.ts`
 * for the shared rationale):
 * - `date_interval` conditionally reveals `date_interval_end` in the real
 *   form — no `visibleWhen` yet, modeled as always-visible below.
 * - No `date` field type — `date` and `date_interval_end` modeled as `text`.
 */
export declare const HOLIDAYS_CUSTOM_DAYS_OFF_RESOURCE: ResourceScreenConfig;
//# sourceMappingURL=holidays-tenant-custom-days-off.d.ts.map