export type MissingEnv = {
    name: string;
    hint: string;
};
export type EnvCheck = {
    ok: boolean;
    missing: MissingEnv[];
};
/**
 * Variáveis SEM as quais o app não sobe. `POSTGREST_URL` tem um default de dev
 * no client, mas em runtime real é obrigatória — este projeto exige PostgREST.
 */
export declare function checkKizunaEnv(env?: NodeJS.ProcessEnv): EnvCheck;
//# sourceMappingURL=env-guard.d.ts.map