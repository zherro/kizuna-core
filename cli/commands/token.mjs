// `kizuna token service` — imprime o JWT do papel `service_role` (sql/0117) assinado com
// PGRST_JWT_SECRET (env ou .env do projeto). Cole em POSTGREST_SERVICE_TOKEN. Só servidor:
// nunca em variável NEXT_PUBLIC_*. HS256 com node:crypto — o CLI não tem dependências.

import { createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

function secretFromDotEnv(projectDir) {
  const file = join(projectDir, '.env');
  if (!existsSync(file)) return '';
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('PGRST_JWT_SECRET='));
  return line ? line.slice('PGRST_JWT_SECRET='.length).trim() : '';
}

export async function run(ctx) {
  if (ctx.args[0] !== 'service') {
    console.error('uso: kizuna token service');
    return 1;
  }
  const secret = process.env.PGRST_JWT_SECRET || secretFromDotEnv(ctx.paths.projectDir);
  console.log(signServiceToken(secret));
  return 0;
}
