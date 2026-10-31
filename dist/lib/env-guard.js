// Trava de ambiente: um projeto sobre o kizuna-core NÃO funciona sem PostgREST +
// segredo de JWT. `checkKizunaEnv()` roda no servidor (layout raiz) e, se faltar
// algo, o app renderiza `SetupRequiredScreen` no lugar de qualquer outra coisa.
/**
 * Variáveis SEM as quais o app não sobe. `POSTGREST_URL` tem um default de dev
 * no client, mas em runtime real é obrigatória — este projeto exige PostgREST.
 */
export function checkKizunaEnv(env = process.env) {
    const missing = [];
    if (!env.PGRST_JWT_SECRET && !env.JWT_SECRET) {
        missing.push({
            name: 'PGRST_JWT_SECRET',
            hint: 'Segredo HS256 do JWT de sessão — o MESMO que o PostgREST verifica. (aceita JWT_SECRET)',
        });
    }
    if (!env.POSTGREST_URL) {
        missing.push({
            name: 'POSTGREST_URL',
            hint: 'URL base do PostgREST, ex.: http://localhost:3001',
        });
    }
    return { ok: missing.length === 0, missing };
}
//# sourceMappingURL=env-guard.js.map