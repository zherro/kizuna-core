// Leitura mínima do `.env` do projeto (sem dependência): o CLI usa para achar DATABASE_URL e
// PGRST_JWT_SECRET sem obrigar a passar flag ou exportar variável a cada comando.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Valor de `key` no `.env` do projeto ('' se não houver). Aceita aspas simples/duplas. */
export function readDotEnv(projectDir, key) {
  const file = join(projectDir, '.env');
  if (!existsSync(file)) return '';
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  if (!line) return '';
  const value = line.slice(key.length + 1).trim();
  return value.replace(/^(['"])(.*)\1$/, '$2');
}

/** URL do Postgres: `--db-url` > `$DATABASE_URL` > `DATABASE_URL` do `.env` do projeto. */
export function resolveDbUrl(flags, projectDir) {
  return flags.dbUrl || process.env.DATABASE_URL || readDotEnv(projectDir, 'DATABASE_URL');
}
