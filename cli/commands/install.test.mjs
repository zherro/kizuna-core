import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './install.mjs';
import { makePrompt } from '../lib/prompt.mjs';
import { hashFile } from '../lib/hash.mjs';

let core;
let proj;

function fakeCore() {
  const dir = mkdtempSync(join(tmpdir(), 'kz-core-'));
  mkdirSync(join(dir, 'template', 'app'), { recursive: true });
  mkdirSync(join(dir, 'sql'), { recursive: true });
  mkdirSync(join(dir, 'plugins'), { recursive: true });
  writeFileSync(join(dir, 'sql', '0001_init.sql'), 'select 1;\n');
  writeFileSync(join(dir, 'VERSION'), '1.2.3\n');
  writeFileSync(join(dir, 'template', 'kizuna.manifest.json'), JSON.stringify({
    owner: 'base',
    files: { 'app/proxy.ts': 'managed', 'app/page.tsx': 'seed' },
    merge: { 'package.json': 'package.kizuna.json' },
  }));
  writeFileSync(join(dir, 'template', 'app', 'proxy.ts'), 'export const proxy = 1;\n');
  writeFileSync(join(dir, 'template', 'app', 'page.tsx'), 'export default () => null;\n');
  writeFileSync(join(dir, 'template', 'package.kizuna.json'), JSON.stringify({
    scripts: { kizuna: 'node kizuna-core/cli', predev: 'npm run kizuna -- check' },
  }));
  return dir;
}

beforeEach(() => {
  core = fakeCore();
  proj = mkdtempSync(join(tmpdir(), 'kz-proj-'));
  writeFileSync(join(proj, 'package.json'), JSON.stringify({ name: 'p', scripts: { dev: 'next dev' } }));
});

afterEach(() => {
  rmSync(core, { recursive: true, force: true });
  rmSync(proj, { recursive: true, force: true });
});

it('install limpo: materializa casca, escreve lock, faz merge de scripts', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const code = await run({
    paths: {
      projectDir: proj,
      coreDir: core,
      lockPath: join(proj, 'kizuna.lock'),
      pluginsFilePath: join(proj, 'kizuna.plugins.json'),
    },
    args: [],
    prompt: makePrompt({ noInput: true }),
    flags: { skipDb: true, input: false },
  });
  expect(code).toBe(0);

  const proxy = join(proj, 'app', 'proxy.ts');
  expect(existsSync(proxy)).toBe(true);

  const lock = JSON.parse(readFileSync(join(proj, 'kizuna.lock'), 'utf8'));
  expect(lock.template.files['app/proxy.ts']).toBe(hashFile(proxy));
  expect(lock.kizunaCore.version).toBe('1.2.3');

  const pkg = JSON.parse(readFileSync(join(proj, 'package.json'), 'utf8'));
  expect(pkg.scripts.kizuna).toBe('node kizuna-core/cli');
  expect(pkg.scripts.predev).toBe('npm run kizuna -- check');
  expect(pkg.scripts.dev).toBe('next dev');
  vi.restoreAllMocks();
});
