// Leitura mínima do `.env` do projeto (sem dependência): o CLI usa para achar DATABASE_URL e
// PGRST_JWT_SECRET sem obrigar a passar flag ou exportar variável a cada comando.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
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

/**
 * Garante `APP_ENCRYPTION_KEY` (32 bytes, base64url) no `.env` do projeto — a chave geral de
 * criptografia do app (links de e-mail etc., ver src/server/app-crypto.ts). Só age se o `.env`
 * existe e a chave falta ou está vazia; nunca troca uma chave existente (invalidaria links).
 * Devolve true se criou.
 */
export function ensureAppEncryptionKey(projectDir) {
  const file = join(projectDir, '.env');
  if (!existsSync(file)) return false;
  if (readDotEnv(projectDir, 'APP_ENCRYPTION_KEY')) return false;
  const key = randomBytes(32).toString('base64url');
  const content = readFileSync(file, 'utf8');
  const line = `APP_ENCRYPTION_KEY=${key}`;
  const next = /^APP_ENCRYPTION_KEY=.*$/m.test(content)
    ? content.replace(/^APP_ENCRYPTION_KEY=.*$/m, line)
    : `${content}${content.endsWith('\n') || content === '' ? '' : '\n'}\n# Chave geral de criptografia do app (gerada pelo kizuna CLI). Não troque: invalida links já enviados.\n${line}\n`;
  writeFileSync(file, next);
  return true;
}
