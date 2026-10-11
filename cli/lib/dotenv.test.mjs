import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureAppEncryptionKey, readDotEnv, resolveDbUrl } from './dotenv.mjs';
import { readFileSync } from 'node:fs';

function project(env) {
  const dir = mkdtempSync(join(tmpdir(), 'kz-env-'));
  if (env !== undefined) writeFileSync(join(dir, '.env'), env);
  return dir;
}

describe('readDotEnv', () => {
  it('lê a chave, tira aspas e ignora CRLF', () => {
    const dir = project('A=1\r\nDATABASE_URL="postgresql://u:p@h:5432/db"\r\n');
    expect(readDotEnv(dir, 'DATABASE_URL')).toBe('postgresql://u:p@h:5432/db');
  });
  it('sem .env ou sem a chave → vazio', () => {
    expect(readDotEnv(project(), 'X')).toBe('');
    expect(readDotEnv(project('Y=1\n'), 'X')).toBe('');
  });
});

describe('resolveDbUrl', () => {
  const saved = process.env.DATABASE_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = saved;
  });

  it('flag > env > .env', () => {
    const dir = project('DATABASE_URL=from-file\n');
    delete process.env.DATABASE_URL;
    expect(resolveDbUrl({}, dir)).toBe('from-file');
    process.env.DATABASE_URL = 'from-env';
    expect(resolveDbUrl({}, dir)).toBe('from-env');
    expect(resolveDbUrl({ dbUrl: 'from-flag' }, dir)).toBe('from-flag');
  });
});

describe('ensureAppEncryptionKey', () => {
  it('cria quando falta, preservando o resto do .env', () => {
    const dir = project('A=1\r\nB=2');
    expect(ensureAppEncryptionKey(dir)).toBe(true);
    const env = readFileSync(join(dir, '.env'), 'utf8');
    expect(env.startsWith('A=1\r\nB=2\n')).toBe(true);
    expect(readDotEnv(dir, 'APP_ENCRYPTION_KEY')).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('preenche a linha vazia do .env.example', () => {
    const dir = project('APP_ENCRYPTION_KEY=\nX=1\n');
    expect(ensureAppEncryptionKey(dir)).toBe(true);
    const env = readFileSync(join(dir, '.env'), 'utf8');
    expect(env.match(/APP_ENCRYPTION_KEY=/g)).toHaveLength(1);
    expect(env).toContain('X=1');
  });

  it('nunca troca chave existente e não cria .env', () => {
    const dir = project('APP_ENCRYPTION_KEY=existente\n');
    expect(ensureAppEncryptionKey(dir)).toBe(false);
    expect(readDotEnv(dir, 'APP_ENCRYPTION_KEY')).toBe('existente');
    expect(ensureAppEncryptionKey(project())).toBe(false);
  });
});
