// Trava de ambiente: um projeto sobre o kizuna-core NÃO funciona sem PostgREST +
// segredo de JWT. `checkKizunaEnv()` roda no servidor (layout raiz) e, se faltar
// algo, o app renderiza `SetupRequiredScreen` no lugar de qualquer outra coisa.

export type MissingEnv = { name: string; hint: string };
export type EnvCheck = { ok: boolean; missing: MissingEnv[] };

/**
 * Variáveis SEM as quais o app não sobe. `POSTGREST_URL` tem um default de dev
 * no client, mas em runtime real é obrigatória — este projeto exige PostgREST.
 */
/** Valores de exemplo que já circularam em `.env.example` — quem os usa tem um segredo público. */
const EXAMPLE_JWT_SECRETS = ['this_is_a_super_secret_key_1234567890'];
const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Segredo HS256 que qualquer um pode adivinhar: curto ou copiado do exemplo. Com ele dá para
 * forjar JWT de qualquer usuário (inclusive `is_root`), no app e direto no PostgREST.
 */
export function isWeakJwtSecret(secret: string): boolean {
  return secret.length < MIN_JWT_SECRET_LENGTH || EXAMPLE_JWT_SECRETS.includes(secret);
}

export function checkKizunaEnv(env: NodeJS.ProcessEnv = process.env): EnvCheck {
  const missing: MissingEnv[] = [];
  const jwtSecret = env.PGRST_JWT_SECRET || env.JWT_SECRET;

  if (!jwtSecret) {
    missing.push({
      name: 'PGRST_JWT_SECRET',
      hint: 'Segredo HS256 do JWT de sessão — o MESMO que o PostgREST verifica. (aceita JWT_SECRET)',
    });
  } else if (env.NODE_ENV === 'production' && isWeakJwtSecret(jwtSecret)) {
    // Em dev só avisa (o `.env` local costuma vir do exemplo); em produção não sobe.
    missing.push({
      name: 'PGRST_JWT_SECRET',
      hint: `Segredo fraco ou igual ao do .env.example. Gere um com ${MIN_JWT_SECRET_LENGTH}+ bytes aleatórios (openssl rand -hex 32) e use o mesmo no PostgREST.`,
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
