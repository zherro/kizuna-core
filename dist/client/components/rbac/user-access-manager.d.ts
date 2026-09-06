/**
 * Admin screen: per-user access inside the current tenant — base role (`auth.user_roles`),
 * allow/deny overrides (`auth.user_tenant_permissions`), and "copy access from another user".
 * An admin can only grant (allow) a permission they themselves hold and can only assign a role
 * whose grants are all within that ceiling — enforced by RLS + `auth.fn_auth_can_grant` /
 * `auth.fn_auth_can_assign_role` in `kizuna-core/sql/0111_rbac_admin_delegation.sql`. Reaching
 * this screen requires `tenant_member.view`; every write requires `tenant_member.manage`.
 *
 * Not a ROOT-only screen — the consuming project routes it from its own admin page and does the
 * `tenant_member` permission check there (see foco-total `src/app/painel/administracao/acessos`).
 */
export declare function UserAccessManagerScreen(): Promise<import("react/jsx-runtime").JSX.Element>;
//# sourceMappingURL=user-access-manager.d.ts.map