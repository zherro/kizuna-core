import { it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findOrphans, removeOrphans } from './prune.mjs';

it('findOrphans: paths antigos que sumiram do manifesto e existem no disco', () => {
  const d = mkdtempSync(join(tmpdir(), 'kz-'));
  mkdirSync(join(d, 'app'), { recursive: true });
  writeFileSync(join(d, 'app', 'page.tsx'), 'x');
  const orphans = findOrphans(d, ['app/page.tsx', 'app/layout.tsx'], ['src/app/page.tsx']);
  expect(orphans).toEqual(['app/page.tsx']); // layout.tsx não existe no disco → não é órfão
  rmSync(d, { recursive: true, force: true });
});

it('removeOrphans apaga o arquivo e a pasta vazia', () => {
  const d = mkdtempSync(join(tmpdir(), 'kz-'));
  mkdirSync(join(d, 'app', 'painel'), { recursive: true });
  writeFileSync(join(d, 'app', 'painel', 'page.tsx'), 'x');
  removeOrphans(d, ['app/painel/page.tsx']);
  expect(existsSync(join(d, 'app', 'painel'))).toBe(false);
  expect(existsSync(join(d, 'app'))).toBe(false);
  rmSync(d, { recursive: true, force: true });
});
