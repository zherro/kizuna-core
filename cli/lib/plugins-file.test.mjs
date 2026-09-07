import { it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEnabled, addEnabled, listAvailable } from './plugins-file.mjs';

const CORE = resolve(fileURLToPath(import.meta.url), '..', '..', '..');

it('round-trip preserva _comment_taxonomy e adiciona plugin', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kz-pf-'));
  writeFileSync(
    join(dir, 'kizuna.plugins.json'),
    JSON.stringify(
      {
        _comment_taxonomy: 'ordem importa',
        plugins: ['storage'],
      },
      null,
      2
    ) + '\n'
  );
  addEnabled(dir, 'agenda');
  const raw = readFileSync(join(dir, 'kizuna.plugins.json'), 'utf8');
  expect(raw).toContain('_comment_taxonomy');
  expect(readEnabled(dir)).toEqual(['storage', 'agenda']);
  rmSync(dir, { recursive: true, force: true });
});

it('addEnabled é idempotente', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kz-pf-'));
  addEnabled(dir, 'agenda');
  addEnabled(dir, 'agenda');
  expect(readEnabled(dir)).toEqual(['agenda']);
  rmSync(dir, { recursive: true, force: true });
});

it('readEnabled retorna [] quando ausente', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kz-pf-'));
  expect(readEnabled(dir)).toEqual([]);
  rmSync(dir, { recursive: true, force: true });
});

it('listAvailable inclui agenda e messaging, exclui dir sem SQL', () => {
  const list = listAvailable(CORE);
  expect(list).toContain('agenda');
  expect(list).toContain('messaging');
});
