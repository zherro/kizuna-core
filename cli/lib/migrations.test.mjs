import { it, expect } from 'vitest';
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
