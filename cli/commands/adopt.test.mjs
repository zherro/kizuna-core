import { it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './adopt.mjs';

let core;
let proj;

function fakeCore() {
  const dir = mkdtempSync(join(tmpdir(), 'kz-core-'));
  mkdirSync(join(dir, 'template'), { recursive: true });
  mkdirSync(join(dir, 'plugins'), { recursive: true });
  writeFileSync(join(dir, 'VERSION'), '0.5.0\n');
  writeFileSync(
    join(dir, 'template', 'kizuna.manifest.json'),
    JSON.stringify({
      owner: 'base',
      files: {},
      merge: { 'package.json': 'package.kizuna.json' },
    })
  );
  writeFileSync(
    join(dir, 'template', 'package.kizuna.json'),
    JSON.stringify({ dependencies: { jsonwebtoken: '^9.0.3' } })
  );
  return dir;
}

afterEach(() => {
  if (core) rmSync(core, { recursive: true, force: true });
  if (proj) rmSync(proj, { recursive: true, force: true });
  vi.restoreAllMocks();
});

it('adopt registra em ownedKeys as deps que o package.kizuna.json contribui e o projeto já tem iguais', async () => {
  core = fakeCore();
  proj = mkdtempSync(join(tmpdir(), 'kz-proj-'));
  writeFileSync(
    join(proj, 'package.json'),
    JSON.stringify({ name: 'p', dependencies: { jsonwebtoken: '^9.0.3', next: '16.2.6' } })
  );
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  const code = await run({ paths: { projectDir: proj, coreDir: core } });
  expect(code).toBe(0);

  const lock = JSON.parse(readFileSync(join(proj, 'kizuna.lock'), 'utf8'));
  expect(lock.packageJson.ownedKeys.dependencies.jsonwebtoken).toBe('^9.0.3');
  // `next` não é contribuído pelo package.kizuna.json do fake core → fica de fora
  expect(lock.packageJson.ownedKeys.dependencies.next).toBeUndefined();
});
