/**
 * Root screen: lists `auth.root_access_log` — one row per time a root account entered a tenant it
 * doesn't own (`auth.fun_auth__root_enter_tenant`, `kizuna-core/sql/0102_fun_auth_has_perm_and_root.sql`).
 * RLS on the table (`kizuna-core/sql/0101_rbac_permissions_and_overrides.sql`) restricts SELECT to
 * `root_user_id = auth.fun_auth_user_id()` — a root account only ever sees its own entries here,
 * never another root's. Generic — reads only core tables — registered under slug
 * `root-access-log`, group `security`, in `root-screens/registry.ts`. The `is_root` gate lives
 * once in `root-screens/resolver.tsx`, not here.
 */
export declare function RootAccessLogScreen(): Promise<import("react/jsx-runtime").JSX.Element>;
//# sourceMappingURL=root-access-log-screen.d.ts.map