import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readLock, writeLock, emptyLock } from './lockfile.mjs';

it('readLock retorna null quando ausente', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kz-'));
  expect(readLock(dir)).toBeNull();
  rmSync(dir, { recursive: true, force: true });
});

it('round-trip preserva o objeto e termina com newline', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kz-'));
  const lock = emptyLock();
  lock.kizunaCore.version = '0.5.0';
  writeLock(dir, lock);
  expect(readFileSync(join(dir, 'kizuna.lock'), 'utf8').endsWith('}\n')).toBe(true);
  expect(readLock(dir)).toEqual(lock);
  rmSync(dir, { recursive: true, force: true });
});
