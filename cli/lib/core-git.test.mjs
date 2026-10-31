import { it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { head, readVersion, logRange } from './core-git.mjs';

const CORE = resolve(fileURLToPath(import.meta.url), '..', '..', '..');

it('head retorna 40 hex do repo kizuna-core', () => {
  expect(head(CORE)).toMatch(/^[0-9a-f]{40}$/);
});

it('readVersion cai para 0.0.0 quando VERSION ausente', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kz-cg-'));
  expect(readVersion(dir)).toBe('0.0.0');
  writeFileSync(join(dir, 'VERSION'), '1.2.3\n');
  expect(readVersion(dir)).toBe('1.2.3');
  rmSync(dir, { recursive: true, force: true });
});

it('logRange com sha inválido retorna ""', () => {
  expect(logRange(CORE, 'nao-e-um-sha-valido')).toBe('');
});
