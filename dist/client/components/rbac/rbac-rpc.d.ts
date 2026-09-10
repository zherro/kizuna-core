/**
 * Thin client wrapper over the consuming app's RPC proxy (`POST /api/postgrest/rpc`,
 * see foco-total's `src/app/api/postgrest/rpc/route.ts`) for the `auth.fn_rbac__*`
 * mutation functions from `kizuna-core/sql/0111_rbac_admin_delegation.sql`.
 * Every write still passes RLS server-side — a rejected grant comes back as an error here.
 */
export declare function callRbacRpc(functionName: string, params: Record<string, unknown>): Promise<{
    ok: boolean;
    message?: string;
    payload?: unknown;
}>;
//# sourceMappingURL=rbac-rpc.d.ts.map