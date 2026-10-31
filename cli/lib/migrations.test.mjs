import { it, expect, describe } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countMigrations, listMigrationFiles } from './migrations.mjs';

const CORE = resolve(fileURLToPath(import.meta.url), '..', '..', '..');

it('countMigrations contra o kizuna-core real', () => {
  expect(countMigrations(CORE, 'agenda')).toBe(2);
  expect(countMigrations(CORE, 'messaging')).toBe(1);
  // brief citava ">= 30"; o layout real do repo tem ~25 arquivos em sql/
  expect(countMigrations(CORE, 'core')).toBeGreaterThanOrEqual(20);
});

it('listMigrationFiles ordena 0001 antes de 0002', () => {
  const files = listMigrationFiles(CORE, 'agenda');
  expect(files).toHaveLength(2);
  expect(files[0]).toMatch(/0001_/);
  expect(files[1]).toMatch(/0002_/);
});

it('plugin inexistente → lista vazia', () => {
  expect(listMigrationFiles(CORE, 'nao-existe')).toEqual([]);
});

import { resolvePsql } from './migrations.mjs';

describe('resolvePsql', () => {
  it('default é psql', () => {
    delete process.env.KIZUNA_PSQL;
    expect(resolvePsql()).toEqual({ cmd: 'psql', args: [] });
  });
  it('quebra um comando com args (docker exec)', () => {
    expect(resolvePsql('docker exec -i pg psql -U myuser')).toEqual({
      cmd: 'docker',
      args: ['exec', '-i', 'pg', 'psql', '-U', 'myuser'],
    });
  });
  it('caminho único existente com espaços vira cmd sem args', () => {
    const self = fileURLToPath(import.meta.url); // este arquivo existe
    expect(resolvePsql(self)).toEqual({ cmd: self, args: [] });
    expect(resolvePsql(`"${self}"`)).toEqual({ cmd: self, args: [] });
  });
  it('respeita aspas na tokenização', () => {
    expect(resolvePsql('psql "-U" "meu user"')).toEqual({
      cmd: 'psql',
      args: ['-U', 'meu user'],
    });
  });
  it('flag explícita ganha do env', () => {
    process.env.KIZUNA_PSQL = 'from-env';
    expect(resolvePsql('from-flag').cmd).toBe('from-flag');
    delete process.env.KIZUNA_PSQL;
  });
});
