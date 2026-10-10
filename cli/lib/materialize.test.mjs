import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { materialize } from './materialize.mjs';
import { loadManifests } from './manifest.mjs';
import { emptyLock } from './lockfile.mjs';

function scaffold() {
  const core = mkdtempSync(join(tmpdir(), 'kz-core-'));
  const proj = mkdtempSync(join(tmpdir(), 'kz-proj-'));
  mkdirSync(join(core, 'template', 'app'), { recursive: true });
  writeFileSync(
    join(core, 'template', 'kizuna.manifest.json'),
    JSON.stringify({
      owner: 'base',
      files: { 'app/proxy.ts': 'managed', 'app/page.tsx': 'seed' },
    })
  );
  writeFileSync(join(core, 'template', 'app', 'proxy.ts'), 'export const proxy = 1;\n');
  writeFileSync(join(core, 'template', 'app', 'page.tsx'), 'export default () => null;\n');
  writeFileSync(join(proj, 'package.json'), JSON.stringify({ name: 'p' }));
  return {
    core,
    proj,
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
    projectDir: proj,
    direction: 'apply',
    lock: emptyLock(),
    prompt,
    dryRun: false,
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
    projectDir: proj,
    direction: 'apply',
    lock,
    prompt,
    dryRun: false,
  });
  lock.template.files = r1.newLockFragment.templateFiles;
  const r2 = await materialize(set, {
    projectDir: proj,
    direction: 'apply',
    lock,
    prompt,
    dryRun: false,
  });
  expect(r2.applied).toHaveLength(0);
  cleanup();
});

it('noop registra o hash da FONTE, não o do target editado localmente', async () => {
  const { core, proj, cleanup } = scaffold();
  const set = loadManifests(core, []);
  const lock = emptyLock();
  const r1 = await materialize(set, {
    projectDir: proj,
    direction: 'apply',
    lock,
    prompt: { choose: vi.fn() },
    dryRun: false,
  });
  lock.template.files = { ...r1.newLockFragment.templateFiles };
  const sourceHash = r1.newLockFragment.templateFiles['app/proxy.ts'];
  // usuário edita o managed localmente; live == locked, então o verdict é noop
  writeFileSync(join(proj, 'app', 'proxy.ts'), 'export const proxy = 12345;\n');
  const r2 = await materialize(set, {
    projectDir: proj,
    direction: 'apply',
    lock,
    prompt: { choose: vi.fn() },
    dryRun: false,
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
    projectDir: proj,
    direction: 'apply',
    lock,
    prompt: { choose: vi.fn() },
    dryRun: false,
  });
  lock.template.files = r1.newLockFragment.templateFiles;
  writeFileSync(join(proj, 'app', 'proxy.ts'), 'export const proxy = 999;\n');
  writeFileSync(join(core, 'template', 'app', 'proxy.ts'), 'export const proxy = 2;\n');
  const prompt = { choose: vi.fn().mockResolvedValue('sobrescreve') };
  const set2 = loadManifests(core, []);
  const r = await materialize(set2, {
    projectDir: proj,
    direction: 'apply',
    lock,
    prompt,
    dryRun: false,
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
    projectDir: proj,
    direction: 'apply',
    lock: emptyLock(),
    prompt,
    dryRun: true,
  });
  expect(existsSync(join(proj, 'app', 'proxy.ts'))).toBe(false);
  expect(report.applied).toContain('app/proxy.ts');
  expect(report.newLockFragment.templateFiles['app/proxy.ts']).toMatch(/^sha256:/);
  cleanup();
});

it('seed que já existe e divergiu: reporta seedDrift, não sobrescreve', async () => {
  const { core, proj, cleanup } = scaffold();
  await materialize(loadManifests(core, []), {
    projectDir: proj,
    direction: 'apply',
    lock: emptyLock(),
    prompt: { choose: vi.fn() },
    dryRun: false,
  });
  writeFileSync(join(proj, 'app', 'page.tsx'), 'export default () => "customizado";\n'); // usuário editou
  writeFileSync(join(core, 'template', 'app', 'page.tsx'), 'export default () => "v2";\n'); // template mudou
  const r = await materialize(loadManifests(core, []), {
    projectDir: proj,
    direction: 'apply',
    lock: emptyLock(),
    prompt: { choose: vi.fn() },
    dryRun: false,
  });
  expect(r.seedDrift).toContain('app/page.tsx');
  expect(readFileSync(join(proj, 'app', 'page.tsx'), 'utf8')).toContain('customizado');
  cleanup();
});

it('--reseed sobrescreve o seed divergente', async () => {
  const { core, proj, cleanup } = scaffold();
  await materialize(loadManifests(core, []), {
    projectDir: proj,
    direction: 'apply',
    lock: emptyLock(),
    prompt: { choose: vi.fn() },
    dryRun: false,
  });
  writeFileSync(join(proj, 'app', 'page.tsx'), 'antigo\n');
  writeFileSync(join(core, 'template', 'app', 'page.tsx'), 'novo do template\n');
  const r = await materialize(loadManifests(core, []), {
    projectDir: proj,
    direction: 'apply',
    lock: emptyLock(),
    prompt: { choose: vi.fn() },
    dryRun: false,
    reseed: ['app/page.tsx'],
  });
  expect(r.applied).toContain('app/page.tsx');
  expect(readFileSync(join(proj, 'app', 'page.tsx'), 'utf8')).toBe('novo do template\n');
  cleanup();
});

function scaffoldInstall() {
  const s = scaffold();
  writeFileSync(
    join(s.core, 'template', 'kizuna.manifest.json'),
    JSON.stringify({
      owner: 'base',
      files: { 'app/sobre.tsx': 'install', 'app/icon.svg': 'install' },
    })
  );
  writeFileSync(join(s.core, 'template', 'app', 'sobre.tsx'), 'sobre v1\n');
  writeFileSync(join(s.core, 'template', 'app', 'icon.svg'), '<svg/>\n');
  return s;
}

const applyOpts = (proj, extra = {}) => ({
  projectDir: proj,
  direction: 'apply',
  lock: emptyLock(),
  prompt: { choose: vi.fn() },
  dryRun: false,
  ...extra,
});

it('install: copia quando ausente', async () => {
  const { core, proj, cleanup } = scaffoldInstall();
  const r = await materialize(loadManifests(core, []), applyOpts(proj));
  expect(r.applied).toEqual(expect.arrayContaining(['app/sobre.tsx', 'app/icon.svg']));
  expect(readFileSync(join(proj, 'app', 'sobre.tsx'), 'utf8')).toBe('sobre v1\n');
  cleanup();
});

it('install: nunca sobrescreve (reseed all, reseed path, force) e não entra em seedDrift', async () => {
  const { core, proj, cleanup } = scaffoldInstall();
  await materialize(loadManifests(core, []), applyOpts(proj));
  writeFileSync(join(proj, 'app', 'sobre.tsx'), 'customizado\n');
  writeFileSync(join(core, 'template', 'app', 'sobre.tsx'), 'sobre v2\n');
  for (const extra of [{}, { reseed: true }, { reseed: ['app/sobre.tsx'] }, { force: true, reseed: true }]) {
    const r = await materialize(loadManifests(core, []), applyOpts(proj, extra));
    expect(r.skipped).toContain('app/sobre.tsx');
    expect(r.applied).not.toContain('app/sobre.tsx');
    expect(r.seedDrift).not.toContain('app/sobre.tsx');
    expect(readFileSync(join(proj, 'app', 'sobre.tsx'), 'utf8')).toBe('customizado\n');
  }
  cleanup();
});

it('install: existe pelo nome sem extensão (icon.png bloqueia icon.svg)', async () => {
  const { core, proj, cleanup } = scaffoldInstall();
  mkdirSync(join(proj, 'app'), { recursive: true });
  writeFileSync(join(proj, 'app', 'icon.png'), 'png');
  const r = await materialize(loadManifests(core, []), applyOpts(proj, { reseed: true }));
  expect(r.skipped).toContain('app/icon.svg');
  expect(existsSync(join(proj, 'app', 'icon.svg'))).toBe(false);
  cleanup();
});

it('install: sync (push) não empurra de volta', async () => {
  const { core, proj, cleanup } = scaffoldInstall();
  await materialize(loadManifests(core, []), applyOpts(proj));
  writeFileSync(join(proj, 'app', 'sobre.tsx'), 'customizado\n');
  await materialize(loadManifests(core, []), applyOpts(proj, { direction: 'push' }));
  expect(readFileSync(join(core, 'template', 'app', 'sobre.tsx'), 'utf8')).toBe('sobre v1\n');
  cleanup();
});

it('seed não customizado segue o template sozinho; customizado fica e entra em seedDrift', async () => {
  const { core, proj, cleanup } = scaffold();
  const opts = (lock, extra = {}) => ({
    projectDir: proj,
    direction: 'apply',
    lock,
    prompt: { choose: vi.fn() },
    ...extra,
  });
  // install: grava o seed e registra o hash da versão do template
  const r1 = await materialize(loadManifests(core, []), opts(emptyLock()));
  const lock = emptyLock();
  lock.template.seeds = r1.newLockFragment.seedFiles;
  expect(lock.template.seeds['app/page.tsx']).toMatch(/^sha256:/);

  // template muda; projeto não mexeu → aplica sem --reseed
  writeFileSync(join(core, 'template', 'app', 'page.tsx'), 'export default () => 1;\n');
  const r2 = await materialize(loadManifests(core, []), opts(lock));
  expect(readFileSync(join(proj, 'app', 'page.tsx'), 'utf8')).toContain('=> 1');
  expect(r2.applied).toContain('app/page.tsx');
  lock.template.seeds = { ...lock.template.seeds, ...r2.newLockFragment.seedFiles };

  // projeto customiza; template muda de novo → não toca, nem com --reseed all
  writeFileSync(join(proj, 'app', 'page.tsx'), 'export default () => "meu";\n');
  writeFileSync(join(core, 'template', 'app', 'page.tsx'), 'export default () => 2;\n');
  const r3 = await materialize(loadManifests(core, []), opts(lock, { reseed: true }));
  expect(readFileSync(join(proj, 'app', 'page.tsx'), 'utf8')).toContain('"meu"');
  expect(r3.seedDrift).toContain('app/page.tsx');

  // path explícito sobrescreve
  await materialize(loadManifests(core, []), opts(lock, { reseed: ['app/page.tsx'] }));
  expect(readFileSync(join(proj, 'app', 'page.tsx'), 'utf8')).toContain('=> 2');
  cleanup();
});

import { newPackageJsonBase } from './materialize.mjs';

describe('newPackageJsonBase', () => {
  it('package.json novo nasce com name (da pasta), version e private', () => {
    expect(newPackageJsonBase('package.json', '/tmp/Meu App!')).toEqual({
      name: 'meu-app',
      version: '0.1.0',
      private: true,
    });
  });

  it('outro alvo de merge começa vazio', () => {
    expect(newPackageJsonBase('outro.json', '/tmp/x')).toEqual({});
  });
});
