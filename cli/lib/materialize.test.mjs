import { it, expect, vi } from 'vitest';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { materialize } from './materialize.mjs';
import { loadManifests } from './manifest.mjs';
import { emptyLock } from './lockfile.mjs';

function scaffold() {
  const core = mkdtempSync(join(tmpdir(), 'kz-core-'));
  const proj = mkdtempSync(join(tmpdir(), 'kz-proj-'));
  mkdirSync(join(core, 'template', 'app'), { recursive: true });
  writeFileSync(join(core, 'template', 'kizuna.manifest.json'), JSON.stringify({
    owner: 'base',
    files: { 'app/proxy.ts': 'managed', 'app/page.tsx': 'seed' },
  }));
  writeFileSync(join(core, 'template', 'app', 'proxy.ts'), 'export const proxy = 1;\n');
  writeFileSync(join(core, 'template', 'app', 'page.tsx'), 'export default () => null;\n');
  writeFileSync(join(proj, 'package.json'), JSON.stringify({ name: 'p' }));
  return {
    core, proj,
    cleanup: () => {
      rmSync(core, { recursive: true, force: true });
      rmSync(proj, { recursive: true, force: true });
    },
  };
}

it('install limpo: managed + seed materializados, lock preenchido', async () => {
  const { core, proj, cleanup } = scaffold();
  const set = loadManifests(core, []);
  const prompt = { choose: vi.fn(), confirm: vi.fn() };
  const report = await materialize(set, {
    projectDir: proj, direction: 'apply', lock: emptyLock(), prompt, dryRun: false,
  });
  expect(readFileSync(join(proj, 'app', 'proxy.ts'), 'utf8')).toContain('proxy = 1');
  expect(existsSync(join(proj, 'app', 'page.tsx'))).toBe(true);
  expect(report.applied).toContain('app/proxy.ts');
  expect(report.newLockFragment.templateFiles['app/proxy.ts']).toMatch(/^sha256:/);
  expect(prompt.choose).not.toHaveBeenCalled();
  cleanup();
});

it('re-run é noop', async () => {
  const { core, proj, cleanup } = scaffold();
  const set = loadManifests(core, []);
  const prompt = { choose: vi.fn() };
  const lock = emptyLock();
  const r1 = await materialize(set, {
    projectDir: proj, direction: 'apply', lock, prompt, dryRun: false,
  });
  lock.template.files = r1.newLockFragment.templateFiles;
  const r2 = await materialize(set, {
    projectDir: proj, direction: 'apply', lock, prompt, dryRun: false,
  });
  expect(r2.applied).toHaveLength(0);
  cleanup();
});

it('noop registra o hash da FONTE, não o do target editado localmente', async () => {
  const { core, proj, cleanup } = scaffold();
  const set = loadManifests(core, []);
  const lock = emptyLock();
  const r1 = await materialize(set, {
    projectDir: proj, direction: 'apply', lock, prompt: { choose: vi.fn() }, dryRun: false,
  });
  lock.template.files = { ...r1.newLockFragment.templateFiles };
  const sourceHash = r1.newLockFragment.templateFiles['app/proxy.ts'];
  // usuário edita o managed localmente; live == locked, então o verdict é noop
  writeFileSync(join(proj, 'app', 'proxy.ts'), 'export const proxy = 12345;\n');
  const r2 = await materialize(set, {
    projectDir: proj, direction: 'apply', lock, prompt: { choose: vi.fn() }, dryRun: false,
  });
  expect(r2.skipped).toContain('app/proxy.ts');
  expect(r2.newLockFragment.templateFiles['app/proxy.ts']).toBe(sourceHash);
  cleanup();
});

it('conflito chama prompt e respeita "sobrescreve"', async () => {
  const { core, proj, cleanup } = scaffold();
  const set = loadManifests(core, []);
  const lock = emptyLock();
  const r1 = await materialize(set, {
    projectDir: proj, direction: 'apply', lock, prompt: { choose: vi.fn() }, dryRun: false,
  });
  lock.template.files = r1.newLockFragment.templateFiles;
  writeFileSync(join(proj, 'app', 'proxy.ts'), 'export const proxy = 999;\n');
  writeFileSync(join(core, 'template', 'app', 'proxy.ts'), 'export const proxy = 2;\n');
  const prompt = { choose: vi.fn().mockResolvedValue('sobrescreve') };
  const set2 = loadManifests(core, []);
  const r = await materialize(set2, {
    projectDir: proj, direction: 'apply', lock, prompt, dryRun: false,
  });
  expect(prompt.choose).toHaveBeenCalledOnce();
  expect(readFileSync(join(proj, 'app', 'proxy.ts'), 'utf8')).toContain('proxy = 2');
  expect(r.conflicts).toContain('app/proxy.ts');
  cleanup();
});

it('dryRun não escreve', async () => {
  const { core, proj, cleanup } = scaffold();
  const set = loadManifests(core, []);
  const prompt = { choose: vi.fn() };
  const report = await materialize(set, {
    projectDir: proj, direction: 'apply', lock: emptyLock(), prompt, dryRun: true,
  });
  expect(existsSync(join(proj, 'app', 'proxy.ts'))).toBe(false);
  expect(report.applied).toContain('app/proxy.ts');
  expect(report.newLockFragment.templateFiles['app/proxy.ts']).toMatch(/^sha256:/);
  cleanup();
});
