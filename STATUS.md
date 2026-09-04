# kizuna-core

Reusable core for new projects: auth (JWT + RBAC), multi-tenancy, a generic PostgREST resource
layer, a JSON-driven screen-engine, and a UI kit. Genuinely independent of any one app — no
project-specific env var names, no app-specific imports. `sql/` + `plugins/` is the DB side;
`src/` is the TS side. Consumed via a tsconfig path alias (`@kizuna/core/*`), not an npm package.

## Docs

- `docs/ARCHITECTURE.md` — folder layout, `ResourceConfig`/`ScreenConfig` split, context refs.
- `docs/AUTH.md` — JWT/session, login/register/logout, `is_root`, RBAC, route protection (proxy).
- `docs/PLUGINS.md` — what a plugin is, the plugins that exist today, how to activate them.
- `docs/COMPONENTS.md` — map of `ui/`, `ui-better-soft/`, `screen-engine/`, `showcase/`, hooks, providers.
- `docs/SCHEMAS.md` — worked examples of `ResourceConfig` and `ScreenConfig`.
- `docs/API.md` — PostgREST layer, the generic `/api/resources/[resource]` route, `ResourceConfig`/`RpcConfig` type, client hooks, error handling.
- `docs/SCREEN-ENGINE.md` — full screen-engine manual (pt): `createScreenPage`, context refs, `ResourceScreen`, `DynamicField`, limits, worked examples.
- `docs/STORAGE.md` — `getStorageService()`, bytea, `optimizeImageBuffer`, routes, env.
- `docs/UTILS.md` — `lib/utils`, `api-error-message`, `temporal-global`, BR helpers (UFs, currency mask, CPF/CNPJ).
- `docs/EMAIL.md` — nodemailer pattern + env (no core impl yet — Fase A promotion target).
- `docs/AI.md` — "no SDK, template fallback" pattern + env.

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
  + `*_public` read variants; the `taxonomy` plugin owns them, a consuming project just spreads
  `resourceTaxonomy` into its `postgrestResources`)
- `@kizuna/core/client/components/form-builder/*`: `FormBuilder`, `FormRenderer`, `FieldEditor`,
  `FormResultViewer`, `validate`, `collectOutput`, `isFieldVisible`, `evalVisibleWhen`, plus the
  schema model types (`FormSchema`, `FormField`, `FieldType`, `VisibleWhen`, `OptionsSource`,
  `createField`, `FIELD_TYPE_LABELS`, `DEFAULT_GRID`, …). Engine only — persistence is the `forms` plugin.
- `@kizuna/core/client/components/forms/*`: `FormsAdmin`, `FormResultsPanel`, `DynamicFormStep`
  (`DynamicFormStepHandle`), `useFormAnswers`. Backed by the `forms` plugin
  (`public.forms` / `public.form_results` / `fn_form_result_upsert`).
- `@kizuna/core/client/components/pages/*`: `PageView` (server component), `PagesAdmin`,
  `DEFAULT_RESERVED_SLUGS`, `isReservedSlug`, `slugify`. Backed by the `pages` plugin (`public.pages`,
  + `0002_pages_seed.sql` project-neutral default pages: `sobre` / `quem-somos` / `termos-de-uso`).
- `@kizuna/core/client/components/showcase/*`: `ShowcaseShell`, `ShowcaseSectionPage`,
  `showcase-sections` (`SHOWCASE_SECTIONS`, `DEFAULT_SHOWCASE_SECTION`, `normalizeShowcaseSection`)
- `@kizuna/core/client/components/ui/*` and `ui-better-soft/*` — see `docs/COMPONENTS.md`
- `@kizuna/core/server`: `SESSION_COOKIE_NAME`, `signSession`, `verifySession`,
  `getTokenFromCookies`, `getAuthHeaderFromCookies`, `getServiceAuthHeader`, `getSession`,
  `maskEmail`, `getDisplayNameFromEmail`, `isValidEmail`, `getDisplayName`, `isConfigError`,
  `createLoginHandler`, `createRegisterHandler`, `createLogoutHandler`, `pgrstTable`, `pgrstRpc`,
  `getStorageService`, `apiError`, `PermissionMap`
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
