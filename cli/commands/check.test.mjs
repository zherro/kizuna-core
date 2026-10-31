import { it, expect, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './check.mjs';
import { head, readVersion } from '../lib/core-git.mjs';

const CORE = process.cwd(); // kizuna-core

it('sem lock: mensagem de adopt, exit 0', async () => {
  const proj = mkdtempSync(join(tmpdir(), 'kz-'));
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const code = await run({
    paths: { projectDir: proj, coreDir: CORE, lockPath: join(proj, 'kizuna.lock') },
    flags: {},
  });
  expect(code).toBe(0);
  expect(log.mock.calls.flat().join(' ')).toMatch(/adopt/);
  log.mockRestore();
  rmSync(proj, { recursive: true, force: true });
});

it('kizuna.lock com JSON inválido: resolve 0 e imprime aviso', async () => {
  const proj = mkdtempSync(join(tmpdir(), 'kz-'));
  writeFileSync(join(proj, 'kizuna.lock'), '{ not json');
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const code = await run({
    paths: { projectDir: proj, coreDir: CORE, lockPath: join(proj, 'kizuna.lock') },
    flags: {},
  });
  expect(code).toBe(0);
  expect(log.mock.calls.flat().join(' ')).toMatch(/ileg[íi]vel|inv[áa]lido/i);
  log.mockRestore();
  rmSync(proj, { recursive: true, force: true });
});

it('lock em dia com o core real: não imprime banner, exit 0', async () => {
  const proj = mkdtempSync(join(tmpdir(), 'kz-'));
  const version = readVersion(CORE);
  writeFileSync(
    join(proj, 'kizuna.lock'),
    JSON.stringify({
      lockVersion: 1,
      kizunaCore: { version, sha: head(CORE), syncedAt: null },
      template: { version, files: {} },
      plugins: {},
      packageJson: { ownedKeys: { dependencies: {}, devDependencies: {}, scripts: {} } },
    })
  );
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const code = await run({
    paths: { projectDir: proj, coreDir: CORE, lockPath: join(proj, 'kizuna.lock') },
    flags: {},
  });
  expect(code).toBe(0);
  expect(log).not.toHaveBeenCalled();
  log.mockRestore();
  rmSync(proj, { recursive: true, force: true });
});
