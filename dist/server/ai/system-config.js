import { pgrstTable } from '../postrest/conn';
/**
 * Lê um valor de `auth.system_config` pela chave.
 *
 * A coluna `value` é jsonb — o PostgREST devolve o valor já parseado, então
 * `rows[0].value` já é o valor JS diretamente (string, objeto, etc.).
 * Retorna `null` quando a chave não existe ou em qualquer falha.
 */
export async function readSystemConfig(key) {
    try {
        const res = await pgrstTable(`/system_config?key=eq.${encodeURIComponent(key)}&select=value`, { headers: { 'Accept-Profile': 'auth' } }, { auth: null });
        if (!res.ok)
            return null;
        const rows = (await res.json());
        return rows.length > 0 ? rows[0].value : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=system-config.js.map