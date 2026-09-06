import { it, expect, vi } from 'vitest';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './plugin.mjs';

function scaffold() {
  const core = mkdtempSync(join(tmpdir(), 'kz-core-'));
  const proj = mkdtempSync(join(tmpdir(), 'kz-proj-'));
  mkdirSync(join(core, 'template', 'app'), { recursive: true });
  writeFileSync(join(core, 'template', 'kizuna.manifest.json'), JSON.stringify({
    owner: 'base',
    files: { 'app/proxy.ts': 'managed' },
  }));
  writeFileSync(join(core, 'template', 'app', 'proxy.ts'), 'export const proxy = 1;\n');
  // plugin cujo shell colide com um path da base
  mkdirSync(join(core, 'plugins', 'collide', 'shell', 'app'), { recursive: true });
  writeFileSync(join(core, 'plugins', 'collide', '0001_x.sql'), 'select 1;\n');
  writeFileSync(join(core, 'plugins', 'collide', 'shell', 'manifest.json'), JSON.stringify({
    owner: 'collide',
    files: { 'app/proxy.ts': 'managed' },
  }));
  writeFileSync(join(core, 'plugins', 'collide', 'shell', 'app', 'proxy.ts'), 'x\n');
  writeFileSync(join(proj, 'kizuna.plugins.json'), JSON.stringify({ plugins: [] }, null, 2) + '\n');
  return {
    core, proj,
    cleanup: () => {
      rmSync(core, { recursive: true, force: true });
      rmSync(proj, { recursive: true, force: true });
    },
  };
}

it('plugin add com colisão de path: kizuna.plugins.json intacto, exit 1', async () => {
  const { core, proj, cleanup } = scaffold();
  const before = readFileSync(join(proj, 'kizuna.plugins.json'), 'utf8');
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  const code = await run({
    paths: { projectDir: proj, coreDir: core },
    args: ['add', 'collide'],
    prompt: { choose: vi.fn(), confirm: vi.fn() },
    flags: { skipDb: true },
  });
  expect(code).toBe(1);
  expect(readFileSync(join(proj, 'kizuna.plugins.json'), 'utf8')).toBe(before);
  err.mockRestore();
  cleanup();
});
