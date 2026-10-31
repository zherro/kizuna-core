import type { ResourceScreenConfig } from '../../../../types/resource-screen';
/**
 * `ResourceScreenConfig` for the `holidays` postgrestResource (master
 * holiday catalog, ADMIN-managed).
 *
 * NOT wired into any `screens/*.ts` yet — `/painel/administracao/feriados`
 * (+ `/novo`, `/[id]`) still runs on hand-rolled `HolidaysTable`/
 * `HolidaysForm` (`src/components/agenda/holidays-*.tsx`), not this config.
 * This file exists purely as the documented field/label shape of the
 * `holidays` resource, so a future UI builder (or a real migration to
 * `resource-screen`) has a source of truth to read instead of re-deriving
 * it from the legacy components.
 *
 * Two gaps block wiring this into `resource-screen` today (see
 * `.claude/libs/screen-engine.md`, "Erros que já aconteceram aqui" / manual
 * §3.4):
 * - `scope` drives conditional fields in the real form (`stateCode` only
 *   for state/city, `cityIbge` only for city) — `ResourceScreenField` has
 *   no `visibleWhen` yet, so below they're modeled as always-visible.
 * - `stateCode` is a `select` populated from `/api/agenda/ufs` (a fixed
 *   BR-UF list), not a `postgrestResource` — `relation` can only load from
 *   `postgrestResources`, so it can't express that endpoint. Modeled as
 *   free `text` here instead.
 */
export declare const HOLIDAYS_RESOURCE: ResourceScreenConfig;
//# sourceMappingURL=holidays.d.ts.map