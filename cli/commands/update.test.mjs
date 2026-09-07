import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run as install } from './install.mjs';
import { run as update } from './update.mjs';
import { makePrompt } from '../lib/prompt.mjs';
import { hashFile } from '../lib/hash.mjs';

let core;
let proj;

function fakeCore(proxyBody, version) {
  mkdirSync(join(core, 'template', 'app'), { recursive: true });
  mkdirSync(join(core, 'sql'), { recursive: true });
  mkdirSync(join(core, 'plugins'), { recursive: true });
  writeFileSync(join(core, 'VERSION'), `${version}\n`);
  writeFileSync(
    join(core, 'template', 'kizuna.manifest.json'),
    JSON.stringify({
      owner: 'base',
      files: { 'app/proxy.ts': 'managed' },
    })
  );
  writeFileSync(join(core, 'template', 'app', 'proxy.ts'), proxyBody);
}

function ctx(flags) {
  return {
    paths: {
      projectDir: proj,
      coreDir: core,
      lockPath: join(proj, 'kizuna.lock'),
      pluginsFilePath: join(proj, 'kizuna.plugins.json'),
    },
    args: [],
    prompt: makePrompt({ noInput: true }),
    flags,
  };
}

beforeEach(async () => {
  core = mkdtempSync(join(tmpdir(), 'kz-core-'));
  proj = mkdtempSync(join(tmpdir(), 'kz-proj-'));
  writeFileSync(join(proj, 'package.json'), JSON.stringify({ name: 'p' }));
  fakeCore('export const proxy = 1;\n', '1.0.0');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  await install(ctx({ skipDb: true, input: false }));
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(core, { recursive: true, force: true });
  rmSync(proj, { recursive: true, force: true });
});

it('fast-forward: bump do core atualiza arquivo, versão e hash no lock', async () => {
  fakeCore('export const proxy = 2;\n', '1.1.0');
  const code = await update(ctx({ pull: false, skipDb: true, input: false }));
  expect(code).toBe(0);

  const proxy = join(proj, 'app', 'proxy.ts');
  expect(readFileSync(proxy, 'utf8')).toContain('proxy = 2');
  const lock = JSON.parse(readFileSync(join(proj, 'kizuna.lock'), 'utf8'));
  expect(lock.kizunaCore.version).toBe('1.1.0');
  expect(lock.template.files['app/proxy.ts']).toBe(hashFile(proxy));
});

it('conflito mantido: arquivo do projeto intacto, lock não avança', async () => {
  const proxy = join(proj, 'app', 'proxy.ts');
  const lockBefore = JSON.parse(readFileSync(join(proj, 'kizuna.lock'), 'utf8'));
  const lockedHash = lockBefore.template.files['app/proxy.ts'];

  writeFileSync(proxy, 'export const proxy = 999; // local\n');
  fakeCore('export const proxy = 2;\n', '1.1.0');

  const c = ctx({ pull: false, skipDb: true });
  c.prompt = { confirm: vi.fn(), choose: vi.fn().mockResolvedValue('mantém') };
  const report = await update(c);
  expect(report).toBe(0);

  expect(readFileSync(proxy, 'utf8')).toContain('proxy = 999');
  const lockAfter = JSON.parse(readFileSync(join(proj, 'kizuna.lock'), 'utf8'));
  expect(lockAfter.template.files['app/proxy.ts']).toBe(lockedHash);
});
