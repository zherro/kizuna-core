# kizuna-core

Reusable core for new projects: auth (JWT + RBAC), multi-tenancy, a generic PostgREST resource
layer, a JSON-driven screen-engine, and a UI kit. Genuinely independent of any one app — no
project-specific env var names, no app-specific imports. `kizuna-core/sql/` + `plugins/` is the DB
side; `kizuna-core/src/` is the TS side.

Consumed via a tsconfig path alias, not an npm package:

```json
"@kizuna/core/*": ["./kizuna-core/src/*"],
"@kizuna/core": ["./kizuna-core/src"]
```

## Public API

- `@kizuna/core` → `./types` + `./client`
- `@kizuna/core/types`: `ResourceConfig`, `RpcConfig`, `parseActive`, `makeSlug`, `ScreenBlock`,
  `ScreenConfig`, `ScreenContext`, `ResourceScreenConfig` (+ field variants), `UserSession`,
  `AuthContext`, `LoginCredentials`, `RegisterData`, `AuthResponse`, `PermissionCheck`,
  `PermissionResult`, `PermissionMap`
- `@kizuna/core/client`: `AuthProvider`, `useAuth`, `AuthUser`, `PublicSession`,
  `LoginPageContent`, `RegisterPageContent` (unstyled templates — see Auth below),
  `ProtectedRoute`, `useTable`, `useForm`, `useDelete`, `useResourceOptions`, `useToggleActive`
  - `useResourceOptions({ resource, labelField?, filter? })` → `{ options, loading, error, getLabel }`.
    Self-fetching on mount, no manual `load()`, no per-call endpoint override.
- `@kizuna/core/client/components/screen-engine/*`: `RenderScreen`, `createScreenPage`,
  `ResourceScreen`, `ListBlock`, `PageHeaderBlock`, `DynamicField`, `DynamicStepForm`,
  `screens/*` (per-screen `ScreenConfig` configs — project-specific, ship your own)
- `@kizuna/core/client/components/showcase/*`: `ShowcaseShell`, `ShowcaseSectionPage`,
  `showcase-sections` (`SHOWCASE_SECTIONS`, `DEFAULT_SHOWCASE_SECTION`, `normalizeShowcaseSection`)
- `@kizuna/core/client/components/ui/*`: shadcn-style kit — `Button`, `Card` (+`CardHeader/Title/
Description/Content/Footer`), `Input`, `Label`, `Badge`, `Switch`, `Table`, `Textarea`,
  `Typography`, `Progress`, `Grid`, etc.
- `@kizuna/core/client/components/ui-better-soft/*`: richer domain-flavored components (forms,
  headers, lists, overlays)
- `@kizuna/core/server`: `SESSION_COOKIE_NAME`, `signSession`, `verifySession`,
  `getTokenFromCookies`, `getAuthHeaderFromCookies`, `getServiceAuthHeader`, `getSession`,
  `maskEmail`, `getDisplayNameFromEmail`, `isValidEmail`, `getDisplayName`, `isConfigError`,
  `createLoginHandler`, `createRegisterHandler`, `createLogoutHandler`, `pgrstTable`, `pgrstRpc`,
  `getStorageService`, `apiError`, `PermissionMap`
- `@kizuna/core/lib/utils`: `cn`, `isShowcaseEnabled`
- `@kizuna/core/lib/temporal-global`: side-effect import, polyfills `globalThis.Temporal`

## Auth — login/register/logout

Real, dogfooded factories (`createLoginHandler`/`createRegisterHandler`/`createLogoutHandler` in
`server/auth-handlers.ts`) — a new project wires them directly, no copy-paste:

```ts
// src/app/api/auth/login/route.ts
import { createLoginHandler, pgrstRpc } from '@kizuna/core/server';
export const POST = createLoginHandler(pgrstRpc);
```

Requires two RPCs in the project's Postgres schema: `fun_auth__login_with_perms(p_login,
p_password)` and `fun_auth__signup_bootstrap(p_login, p_password)` — see `sql/0010_login_functions.sql`.

Env vars: `PGRST_JWT_SECRET` (preferred) or `JWT_SECRET` — must match whatever secret PostgREST
itself verifies JWTs with. No project-specific fallback names; a project needing back-compat with
an old env var name handles that in its own `.env`, not in the lib.

`LoginPageContent`/`RegisterPageContent` (`@kizuna/core/client`) are **unstyled layout templates
only** — no `onSubmit`, no state wiring. A new project either extends them or writes its own page
calling `POST /api/auth/login` + `useAuth().setUser(data.user)` directly.

## Permissions

Two systems coexist by design (additive, no cutover yet — see Open decisions):

- **Legacy (jsonb)**: `auth.group_permissions`/`auth.role_permissions`/`auth.tenant_role_permissions`.
- **RBAC (normalized)**: `auth.permissions` (resource/action catalog) + `auth.role_grants`
  (role → permission) + `auth.user_tenant_permissions` (per-user allow/deny override) +
  `auth.users.is_root`.

Both are aggregated by `auth.get_auth__effective_permissions()` into the JWT's `perms` claim at
login (`fun_auth__login_with_perms`, which also now sets `is_root`). Deny overrides in
`user_tenant_permissions` are subtracted last and always win over a role grant. Runtime check:
`auth.fun_auth_has_perm(resource, action)` (reads `perms`/`is_root` straight from JWT claims —
no query) for RLS policies; the legacy `auth.fun_auth__has_permission` (reads the jsonb tables
directly, does a live query) still exists in parallel, superseded but not removed.

Client: `user.hasPerm(resource, action = 'view')` — plain object lookup against the JWT's `perms`,
no network call. **This is a UI convenience only** (controls nav/step visibility), not a real
authorization boundary — actual enforcement is RLS + `fun_auth_has_perm` in policies. A resource
with no `permResource` configured in nav is implicitly visible to any authenticated user
(fail-open by design) — never rely on a hidden nav item as the real protection.

## Plugin registry

`auth.plugin_registry (name PK, version, installed_at)` — each plugin's `0001_*.sql` inserts its
own row (idempotent), plus its own permissions into `auth.permissions`/`role_grants` for anything
it exposes that an admin should manage (e.g. `onboarding` registers `onboarding_steps.manage`).
Plugins with no admin-manageable surface (self-service tables, backend-only inserts) register
themselves but no permissions — see `plugins/README.md` for the convention and the per-plugin
reasoning.

foco-total's `user_data`/`onboarding` tables now run these plugin versions directly (migrated off
a divergent legacy schema it used to keep in its own `migrations/0001_initial_schema.sql`) — the
handful of columns the plugin deliberately trims (`status`, `email_verification_code`) live in
foco-total's own `sql/user_data_add_*.sql`, not here.

## Screen-engine

`ScreenConfig` = ordered list of `{ component, props }` blocks resolved against
`SCREEN_COMPONENT_REGISTRY` and rendered by `RenderScreen` (Server Component). `ResourceScreen` =
generic CRUD form+list block driven by `ResourceScreenConfig`. `DynamicStepForm` = the step-level
counterpart for wizards (see a consuming project's `novo-wizard` skill for the persistence
pattern). Fully implemented — no known gaps as of this doc.

## Data fetching (client hooks)

`useResourceOptions({ resource, labelField?, filter? })` — 1 resource, 1 combobox; use it too when
a combobox's `filter` depends on another field's value (it re-fetches on its own when `filter`
changes, without blocking the rest of the screen). `useResourceMap(entries: ResourceMapEntry[])` —
N independent resources fetched in parallel for one bespoke block, merged into one `data` object;
each entry resolves and writes its own slice of `data` as soon as it responds (never waits for the
slowest one — no dependency graph, no `Promise.all` gating the merge). Both fetch through the same
`/api/resources/[resource]` route via the shared `fetchResourceList` helper
(`client/hooks/shared/fetch-resource.ts`). Example:

```ts
const { data, loading, errors } = useResourceMap([
  { resource: 'categorias', map: [{ from: 'nome', to: 'categorias' }] },
  { resource: 'grupos', map: [{ from: 'nome', to: 'grupos' }] },
]);
// data.categorias may be populated while data.grupos is still undefined.
```

## PostgREST layer

`pgrstTable(path, init?, opts?)` / `pgrstRpc(name, body, opts?)` (`server/postrest/conn.ts`) —
thin fetch wrappers, no query-builder abstraction. `path`/`name` build PostgREST's own querystring
filter syntax directly (`?select=...&id=eq.5`). `ResourceConfig` (a project's own
`postgrestResources`) powers a generic `/api/resources/[resource]` route via
`listResource`/`createResource`/`updateResource`/`deleteResource` (`server/postgrest-crud.ts`).

## SQL side

`sql/0001-0108` (auth schema, RBAC, plugin registry — apply in numeric order) +
`plugins/{user_data,onboarding,account_preferences,notifications}` (optional, independent of each
other, each a single idempotent `.sql` file — see `plugins/README.md`). All `SECURITY DEFINER`
functions in `auth` pin `SET search_path = auth, public`. Recreate the whole thing from scratch on
a scratch DB any time — nothing here targets a live migration history, it's a from-zero installer.

## Open decisions (not core's to make alone)

- When to cut over the legacy jsonb permission tables to the RBAC ones, and what to do with
  `auth.fun_auth__has_permission` (legacy, superseded, still live).
- Whether `user_data`/`account_preferences` should get an admin-manageable permission (today
  strictly self-service by design) — product decision, not technical.
