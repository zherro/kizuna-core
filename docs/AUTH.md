# Auth & Permissions

JWT-based session + RBAC. Two RPCs in the project's Postgres schema drive login/register; the
core wraps them into route handlers and client hooks.

## Session

- JWT signed/verified server-side (`server/auth.ts`): `signSession`, `verifySession`,
  `getSession`, `getTokenFromCookies`, `getAuthHeaderFromCookies`.
- Env var: `PGRST_JWT_SECRET` (preferred) or `JWT_SECRET` — must match the secret PostgREST itself
  verifies JWTs with.
- Cookie: `SESSION_COOKIE_NAME`, `httpOnly`, `sameSite: 'lax'`, `secure` in production, `path: '/'`.
- JWT payload: `user_id`, `tenant_id`, `tenant_type?`, `role?`, `login?`, `display_name?`,
  `perms?` (`PermissionMap`), `is_root?`.

## Login / register / logout

Real, dogfooded factories in `server/auth-handlers.ts` — a project wires them directly, no
copy-paste:

```ts
// src/app/api/auth/login/route.ts
import { createLoginHandler, pgrstRpc } from '@kizuna/core/server';
export const POST = createLoginHandler(pgrstRpc);
```

`createRegisterHandler` and `createLogoutHandler()` follow the same shape for
`/api/auth/register` and `/api/auth/logout`.

Requires two RPCs in the project's Postgres schema:

- `fun_auth__login_with_perms(p_login, p_password)` — validates the password, returns
  `{ user_id, tenant_id, tenant_type, perms, is_root }` (see `sql/0010_login_functions.sql`). It
  calls `fun_auth__login_verify` internally, which since `sql/0110_login_checks_active.sql`
  rejects an inactive account (`auth.users.is_active = false`, or `NULL`) exactly like a wrong
  password — no session is issued, no distinct error surfaced.
- `fun_auth__signup_bootstrap(p_login, p_password)` — creates the user + tenant row.

Client side: `AuthProvider` (wraps the app, takes `initialUser` from `getSession()`), `useAuth()`
→ `{ user, logout, setUser }`, `ProtectedRoute` (client-side route gate by permission).
`LoginPageContent`/`RegisterPageContent` are **unstyled layout templates only** — no `onSubmit`,
no state wiring; a project either extends them or writes its own page calling
`POST /api/auth/login` + `useAuth().setUser(data.user)`.

## `is_root`

`auth.users.is_root` marks a super-admin. `fun_auth_has_perm` (see below) short-circuits to `true`
for any resource/action the moment `is_root = true` is on the JWT — no `role_grants` row needed.
Root can manage any plugin's data as soon as that plugin's permission exists in the catalog.

Only ever set automatically once: `fun_auth__signup_bootstrap` makes the very first user created
in the database root (`auth.users` empty at signup time); every signup after that gets
`is_root = false` (still ADMIN of the tenant they create, a separate axis). Self-signup can never
mint a second root — granting it to anyone else is a deliberate `UPDATE auth.users SET is_root =
true` by whoever administers the project.

## RBAC

Normalized permission model:

- `auth.permissions` — resource/action catalog (e.g. `onboarding_steps.manage`). Existing here
  does not grant it to anyone — it's just a declared, gate-able permission.
- `auth.role_grants` — role → permission. Granting a catalog permission to a role (tenant ADMIN,
  a new role, etc.) is a decision for whoever installs/administers the consuming project — nothing
  in the core or in a plugin inserts into `role_grants` automatically.
- `auth.user_tenant_permissions` — per-user allow/deny override on top of the role grant. A deny
  here is subtracted last and always wins.

Both this RBAC layer and a legacy jsonb layer (`auth.group_permissions` /
`auth.role_permissions` / `auth.tenant_role_permissions`) are aggregated by
`auth.get_auth__effective_permissions()` into the JWT's `perms` claim at login. The two coexist —
see `STATUS.md` for the open decision on cutover.

## Enforcement: UI-only vs real

- **Real**: `auth.fun_auth_has_perm(resource, action)` — reads `perms`/`is_root` straight from JWT
  claims, no query. Used inside RLS policies; this is the actual authorization boundary. The
  legacy `auth.fun_auth__has_permission` (jsonb, does a live query) still exists in parallel,
  superseded but not removed.
- **UI-only**: client `user.hasPerm(resource, action = 'view')` — plain object lookup against the
  JWT's `perms`, no network call. Controls nav/step visibility only. A resource with no
  `permResource` configured in nav is implicitly visible to any authenticated user (fail-open by
  design) — never rely on a hidden nav item as real protection. Real enforcement is always RLS +
  `fun_auth_has_perm`.
