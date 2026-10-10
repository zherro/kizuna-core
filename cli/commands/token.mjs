// `kizuna token service` — imprime o JWT do papel `service_role` (sql/0117) assinado com
// PGRST_JWT_SECRET (env ou .env do projeto). Cole em POSTGREST_SERVICE_TOKEN. Só servidor:
// nunca em variável NEXT_PUBLIC_*. HS256 com node:crypto — o CLI não tem dependências.

import { createHmac } from 'node:crypto';
import { readDotEnv } from '../lib/dotenv.mjs';

const base64url = (value) => Buffer.from(value).toString('base64url');

export function signServiceToken(secret) {
  if (!secret) throw new Error('PGRST_JWT_SECRET ausente (env ou .env do projeto).');
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({ role: 'service_role', iat: Math.floor(Date.now() / 1000) })
  );
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export async function run(ctx) {
  if (ctx.args[0] !== 'service') {
    console.error('uso: kizuna token service');
    return 1;
  }
  const secret = process.env.PGRST_JWT_SECRET || readDotEnv(ctx.paths.projectDir, 'PGRST_JWT_SECRET');
  console.log(signServiceToken(secret));
  return 0;
}
