import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readDotEnv, resolveDbUrl } from './dotenv.mjs';

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
