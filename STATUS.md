# kizuna-core

Reusable core for new projects: auth (JWT + RBAC), multi-tenancy, a generic PostgREST resource
layer, a JSON-driven screen-engine, and a UI kit. Genuinely independent of any one app — no
project-specific env var names, no app-specific imports. `sql/` + `plugins/` is the DB side;
`src/` is the TS side. Consumed via a tsconfig path alias (`@kizuna/core/*`), not an npm package.

## CLI + template/ (starter)

O core não é só biblioteca: ele carrega a **casca base** de um app Next.js e um **CLI Node** que
a materializa num projeto e mantém projeto ↔ core alinhados. Ver **`docs/CLI.md`**.

- `VERSION` — string semver única (hoje `0.5.0`); sinal do version-gate. Bumpa só em mudança
  relevante pro consumidor (`template/`, shell de plugin, migration nova, API pública). `git log`
  é o changelog — sem `CHANGELOG`.
- `cli/` — `index.mjs` (dispatcher) + `commands/{install,update,sync,lock,check,adopt,plugin,db}.mjs`
  - `lib/*.mjs`. Zero deps, ESM, Node ≥ 20. Testes: `npx vitest run cli/`.
- `template/` — `kizuna.manifest.json` (21 paths: `managed` / `seed` / `merge`) + os arquivos da
  casca base.
- `plugins/<n>/shell/` — fragmento de casca por plugin (rotas limpas + registry): hoje
  `storage`, `location`, `pages`, `onboarding`, `agenda`.
- `kizuna.lock` (no projeto consumidor, não aqui) — hashes + versões do que foi instalado.

## Docs

- `docs/CLI.md` — o CLI (`install`/`update`/`sync`/`plugin`/`lock`/`check`/`adopt`/`db`), o `kizuna.lock`, managed/seed/merge, regra de bump do `VERSION`.
- `docs/ARCHITECTURE.md` — folder layout, `ResourceConfig`/`ScreenConfig` split, context refs.
- `docs/AUTH.md` — JWT/session, login/register/logout, `is_root`, RBAC, route protection (proxy).
- `docs/PLUGINS.md` — what a plugin is, the plugins that exist today, how to activate them.
- `docs/COMPONENTS.md` — map of `ui/`, `ui-better-soft/`, `screen-engine/`, `showcase/`, hooks, providers.
- `docs/SCHEMAS.md` — worked examples of `ResourceConfig` and `ScreenConfig`.
- `docs/API.md` — PostgREST layer, the generic `/api/resources/[resource]` route, `ResourceConfig`/`RpcConfig` type, client hooks, error handling.
- `docs/SCREEN-ENGINE.md` — full screen-engine manual (pt): `createScreenPage`, context refs, `ResourceScreen`, `DynamicField`, limits, worked examples.
- `docs/STORAGE.md` — `getStorageService()`, bytea, `optimizeImageBuffer`, routes, env.
- `docs/UTILS.md` — `lib/utils`, `api-error-message`, `temporal-global`, BR helpers (UFs, currency mask, CPF/CNPJ).
- `docs/EMAIL.md` — nodemailer transport in the core (`@kizuna/core/server` → `sendEmail` / `EmailTemplate`); templates stay in the app.
- `docs/AI.md` — "no SDK, template fallback" pattern + env.
- `docs/WIZARD.md` — engine de wizard multi-step (contrato de step, `defineWizard`, persistência read-merge-write, chrome layout-foco, slot de IA).

`STATUS.md` is still the only doc index — it needs the "índice curto" restructure (pending, `docs/PENDENCIAS.md`).

## Public API

- `@kizuna/core` → `./types` + `./client`
- `@kizuna/core/types`: `ResourceConfig`, `RpcConfig`, `parseActive`, `makeSlug`, `ScreenBlock`,
  `ScreenConfig`, `ScreenContext`, `ResourceScreenConfig` (+ field variants), `UserSession`,
  `AuthContext`, `LoginCredentials`, `RegisterData`, `AuthResponse`, `PermissionCheck`,
  `PermissionResult`, `PermissionMap`
- `@kizuna/core/client`: `AuthProvider`, `useAuth`, `AuthUser`, `PublicSession`,
  `LoginPageContent`, `RegisterPageContent`, `ProtectedRoute`, `useTable`, `useForm`, `useDelete`,
  `useResourceOptions`, `useToggleActive`
- `@kizuna/core/client/components/screen-engine/*`: `RenderScreen`, `createScreenPage`,
  `ResourceScreen`, `ListBlock`, `PageHeaderBlock`, `DynamicField`, `DynamicStepForm`, `screens/*`,
  `resources/forms`, `resources/form-results`, `resources/pages`, `resources/taxonomy`
  (`resourceTaxonomy` — `categories` / `categories_group` / `subcategories` / `categories_sub_tags`
  - `*_public` read variants; the `taxonomy` plugin owns them, a consuming project just spreads
    `resourceTaxonomy` into its `postgrestResources`), `resources/reviews` (`resourceReviews` —
    `reviews` / `review_tags` / `review_moderation_requests` / `review_moderation_events` /
    `review_stats`; the `reviews` plugin owns them). Registry also has the `review-moderation` block.
    `resources/services` (`resourceServices` — `services` / `service_categories_sub` /
    `service_moderations`; the `services` plugin owns them, writes to `service_moderations` go
    through the `fn_service_moderate` RPC).
    `resources/agenda-config` (`resourceAgendaConfig` — `agenda_schedule` / `agenda_schedule_hours` /
    `agenda_booking_preferences` / `agenda_notification_preferences`; the `agenda` plugin v1.1.0 owns
    them, a consuming project spreads `resourceAgendaConfig` into its `postgrestResources`).
- `@kizuna/core/client/components/agenda-config/*`: `AgendaConfigPage` (tenant agenda
  configuration screen — schedule list + booking rules + notification preferences),
  `useAgendaSchedules`, `ScheduleSheet`, `ScheduleForm`, `ScheduleCard`, `SchedulesEmptyState`,
  and pure helpers `summarizeSchedule` / `suggestScheduleName` / `validateSchedule` /
  `crossesMidnight` / `hmToMinutes`. Backed by the `agenda` plugin v1.1.0.
- `@kizuna/core/client/components/form-builder/*`: `FormBuilder`, `FormRenderer`, `FieldEditor`,
  `FormResultViewer`, `validate`, `collectOutput`, `isFieldVisible`, `evalVisibleWhen`, plus the
  schema model types (`FormSchema`, `FormField`, `FieldType`, `VisibleWhen`, `OptionsSource`,
  `createField`, `FIELD_TYPE_LABELS`, `DEFAULT_GRID`, …). Engine only — persistence is the `forms` plugin.
- `@kizuna/core/client/components/forms/*`: `FormsAdmin`, `FormResultsPanel`, `DynamicFormStep`
  (`DynamicFormStepHandle`), `useFormAnswers`. Backed by the `forms` plugin
  (`public.forms` / `public.form_results` / `fn_form_result_upsert`).
- `@kizuna/core/client/components/pages/*`: `PageView` (server component), `PagesAdmin`,
  `DEFAULT_RESERVED_SLUGS`, `isReservedSlug`, `slugify`. Backed by the `pages` plugin (`public.pages`,
  - `0002_pages_seed.sql` project-neutral default pages: `sobre` / `quem-somos` / `termos-de-uso`).
- `@kizuna/core/client/components/reviews/*`: `RatingInput`, `RatingDisplay`, `ReviewTags`,
  `ReviewSummary`, `ReviewCard`, `ReviewList`, `ReviewModal`, `ReviewModerationRequestModal`,
  `ReviewModerationTable`; hooks `useReviewStats` / `useReviewList` / `useReviewTags` / `useMyReview`
  - `submitReview` / `requestModeration` / `moderateReview` / `coerceReview`; types `ReviewView`,
    `ReviewStats`, `ReviewTagOption`, `ReviewStatus`, `ModerationAction`, `ReviewModerationEvent`,
    … (re-exported from the folder barrel; NOT yet in the `@kizuna/core/types` barrel). Backed by the
    `reviews` plugin (`public.reviews` + 5 sibling tables + `fn_review_*` RPCs, incl.
    `fn_review_moderate`). The `services` wizard writes moderation decisions through the
    `fn_service_moderate` RPC (see `docs/PLUGINS.md`).
- `@kizuna/core/client/components/wizard/*`: `Wizard`, `defineWizard`, `useWizardState`,
  `resolveSteps`, `applyAssistPatch`, `createResourcePersister`, plus the contract types
  `WizardStep`, `WizardStepProps`, `WizardStepContext`, `WizardConfig`, `WizardMode`,
  `WizardEntities`, `WizardAssistant`. Generic config-driven multi-step engine against ONE
  PostgREST resource (read-merge-write persistence, layout-foco chrome, optional AI slot).
  Domain-agnostic — see `docs/WIZARD.md`.
- `@kizuna/core/client/components/services/*`: `ServiceConfigSummary`, and from `service-type`
  the helpers/types `defaultPriceUnitForCategory`, `SERVICE_PRICE_UNIT_OPTIONS`,
  `ServiceWizardState` (+ `SERVICE_WIZARD_INITIAL_STATE`, price/status/location labels).
  `wizard-steps/*` exports `SERVICE_WIZARD_STEPS` — the ready-made 8-step registry for the
  services wizard (`start` / `category` / `location` / `price` / `images` / `description` /
  `dynamic-form` / `moderation`; `images` needs the app's image manager injected). Backed by the
  `services` plugin.
- `@kizuna/core/client/components/showcase/*`: `ShowcaseShell`, `ShowcaseSectionPage`,
  `showcase-sections` (`SHOWCASE_SECTIONS`, `DEFAULT_SHOWCASE_SECTION`, `normalizeShowcaseSection`)
- `@kizuna/core/client/components/ui/*` and `ui-better-soft/*` — see `docs/COMPONENTS.md`
- `@kizuna/core/server`: `SESSION_COOKIE_NAME`, `signSession`, `verifySession`,
  `getTokenFromCookies`, `getAuthHeaderFromCookies`, `getServiceAuthHeader`, `getSession`,
  `maskEmail`, `getDisplayNameFromEmail`, `isValidEmail`, `getDisplayName`, `isConfigError`,
  `createLoginHandler`, `createRegisterHandler`, `createLogoutHandler`, `pgrstTable`, `pgrstRpc`,
  `getStorageService`, `apiError`, `PermissionMap`, `isOnboardingCompletedServer`, `sendEmail`,
  `EmailTemplate`
- `@kizuna/core/server/ai/*`: `runSkill`, `registerSkill`, `getSkill`, `listSkillContexts`,
  `AiSkill`, `AiSkillContext`, `AiProvider` (+ `AiStructuredRequest`), `resolveProvider`,
  `AiUnavailableError`, `classifyAiError`, `isRecoverableAiError`, `checkRateLimit`,
  `readSystemConfig`. Server-only mechanism for the `ai_assistant` plugin — provider abstraction
  (`GeminiProvider` real; `openai`/`claude` = `NotImplementedProvider`), `runSkill` orchestrator
  (context toggle + rate limit + graceful degradation via `AiUnavailableError` → route returns
  503 `{ fallback, reason }`). Skills live in the consuming app.
- `@kizuna/core/client/components/ai-assistant`: `AiAssistantConfigPage` (+ `AiAssistantConfigPageProps`,
  `AiAssistantConfigValue`) — provider/model/contexts config form; core does NOT touch
  `system_config`, takes `value` + `onSave` by prop.
- `@kizuna/core/client/hooks/use-ai-degradation`: `useAiDegradation(contextKey)` →
  `{ status: 'ready'|'degraded'|'unavailable', report, retry, reset }` — sticky per-session
  degradation state machine.
- `@kizuna/core/shared/ai-error`: `classifyAiError`, `AiUnavailableReason` — isomorphic
  (server + client) AI error classifier.
- `@kizuna/core/lib/utils`: `cn`, `isShowcaseEnabled`
- `@kizuna/core/lib/temporal-global`: side-effect import, polyfills `globalThis.Temporal`
- `@kizuna/core/lib/api-error-message`: `translateApiErrorMessage` (PostgREST/DB message → pt-BR)
- `@kizuna/core/lib/resource-submit`: `submitResource()` — generic create/update against
  `/api/resources/:resource` with default error/success feedback (wraps `translateApiErrorMessage`)
- `@kizuna/core/lib/ui-tone`: `ThemeTone` + `TONE_BORDER_L` / `TONE_BG` / `TONE_BADGE` /
  `TONE_BADGE_OUTLINE` / `TONE_TEXT` — theme-token-backed semantic row/badge colors for `/painel`
- `@kizuna/core/lib/validate-doc`: `validateCpf`, `validateCnpj`, `validateDocument` (BR CPF/CNPJ)

## Shell components (added Fase A — promoted from foco-total)

- `@kizuna/core/client/components/panel-shell`: `PanelShellBase` (+ `PanelNavGroup`, `PanelNavItem`,
  `PanelNavIcon`, `PanelShellBranding`, `PanelShellBaseProps`). Generic `/painel` chrome — sidebar,
  collapse, mobile drawer, `permResource`/`rootOnly`/`devOnly` gating via `useAuth`, topbar with
  user card + logout. Consumer passes `navGroups`, `branding`, optional `isFullBleedRoute`,
  `renderItemBadge`, `enforcePagePermission`. Consumer keeps its own nav list + any badge fetching.
- `@kizuna/core/client/components/topbar`: `Topbar` — public-site top bar (brand, home/dashboard
  links, `LocationTrigger`, auth actions, theme toggle). Hidden on `/painel`. Labels from
  `useAppPreferences().messages`.
- `@kizuna/core/client/components/preferences-fab`: `PreferencesFab` — floating theme / accent /
  language switcher over the `account_preferences` plugin.
- `@kizuna/core/client/components/login-page` / `register-page`: `LoginPageContent` /
  `RegisterPageContent` are now full working forms (formik + Yup + `useForm`, `POST
/api/auth/{login,register}`, themed `ui/` components). Props: `redirectTo`, `onLoginSuccess` /
  `onRegisterSuccess`, `loginEndpoint` / `registerEndpoint`, `registerHref` / `loginHref` /
  `termsHref`. A consuming project renders them directly inside its own page wrapper.
- `@kizuna/core/server/proxy`: `createKizunaProxy({ protectedPrefixes, authPages, loginPath,
panelPath, sessionCookie })` → a Next 16 `proxy` function. The consumer's `src/proxy.ts` is this
  call plus a static `export const config = { matcher: [...] }`.

## PostgREST layer

`pgrstTable(path, init?, opts?)` / `pgrstRpc(name, body, opts?)` (`server/postrest/conn.ts`) —
thin fetch wrappers, no query-builder abstraction; `path`/`name` build PostgREST's own querystring
filter syntax directly (`?select=...&id=eq.5`). A project's own `ResourceConfig` registry powers
the generic `/api/resources/[resource]` route via `listResource`/`createResource`/
`updateResource`/`deleteResource` (`server/postgrest-crud.ts`).

## SQL side

`sql/0001-0110` (auth schema, RBAC, plugin registry — apply in numeric order), all `SECURITY
DEFINER` functions in `auth` pinning `SET search_path = auth, public`. Recreate the whole thing
from scratch on a scratch DB any time — nothing here targets a live migration history, it's a
from-zero installer (`scripts/install.sh`).

## Open decisions (not core's to make alone)

- When to cut over the legacy jsonb permission tables to the RBAC ones, and what to do with
  `auth.fun_auth__has_permission` (legacy, superseded, still live).
