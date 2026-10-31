'use client';
/**
 * Thin client wrapper over the consuming app's RPC proxy (`POST /api/postgrest/rpc`,
 * see foco-total's `src/app/api/postgrest/rpc/route.ts`) for the `auth.fn_rbac__*`
 * mutation functions from `kizuna-core/sql/0111_rbac_admin_delegation.sql`.
 * Every write still passes RLS server-side — a rejected grant comes back as an error here.
 */
export async function callRbacRpc(functionName, params) {
    try {
        const res = await fetch('/api/postgrest/rpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schema: 'auth', functionName, params }),
        });
        const data = (await res.json().catch(() => null));
        if (!res.ok) {
            return { ok: false, message: data?.message || 'Não foi possível salvar a alteração.' };
        }
        return { ok: true, payload: data?.payload };
    }
    catch {
        return { ok: false, message: 'Falha de conexão ao salvar.' };
    }
}
//# sourceMappingURL=rbac-rpc.js.map