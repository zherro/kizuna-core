# kizuna-core

Reusable core for new projects: auth (JWT + RBAC), multi-tenancy, a generic PostgREST resource
layer, a JSON-driven screen-engine, and a UI kit. Genuinely independent of any one app — no
project-specific env var names, no app-specific imports. `sql/` + `plugins/` is the DB side;
`src/` is the TS side. Consumed via a tsconfig path alias (`@kizuna/core/*`), not an npm package.

## Docs

- `docs/ARCHITECTURE.md` — folder layout, `ResourceConfig`/`ScreenConfig` split, context refs.
- `docs/AUTH.md` — JWT/session, login/register/logout, `is_root`, RBAC, UI-only vs real enforcement.
- `docs/PLUGINS.md` — what a plugin is, the 9 that exist today, how to activate them.
- `docs/COMPONENTS.md` — map of `ui/`, `ui-better-soft/`, `screen-engine/`, `showcase/`, hooks.
- `docs/SCHEMAS.md` — worked examples of `ResourceConfig` and `ScreenConfig`.

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
  `ResourceScreen`, `ListBlock`, `PageHeaderBlock`, `DynamicField`, `DynamicStepForm`, `screens/*`
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
