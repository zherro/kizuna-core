import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadManifests, DuplicateOwnerError } from './manifest.mjs';

function fakeCore() {
  const dir = mkdtempSync(join(tmpdir(), 'kz-core-'));
  mkdirSync(join(dir, 'template'), { recursive: true });
  writeFileSync(
    join(dir, 'template', 'kizuna.manifest.json'),
    JSON.stringify({
      owner: 'base',
      files: { 'app/proxy.ts': 'managed', 'app/page.tsx': 'seed' },
      merge: { 'package.json': 'package.kizuna.json' },
    })
  );
  return dir;
}

it('carrega o manifest base', () => {
  const core = fakeCore();
  const set = loadManifests(core, []);
  expect(set.entries).toHaveLength(2);
  expect(set.entries.find((e) => e.projectPath === 'app/proxy.ts')).toMatchObject({
    mode: 'managed',
    owner: 'base',
  });
  expect(set.merges[0]).toMatchObject({ projectPath: 'package.json', owner: 'base' });
  rmSync(core, { recursive: true, force: true });
});

it('funde shell de plugin habilitado', () => {
  const core = fakeCore();
  mkdirSync(join(core, 'plugins', 'agenda', 'shell'), { recursive: true });
  writeFileSync(
    join(core, 'plugins', 'agenda', 'shell', 'manifest.json'),
    JSON.stringify({
      owner: 'agenda',
      files: { 'app/api/agenda/events/route.ts': 'managed' },
    })
  );
  const set = loadManifests(core, ['agenda', 'storage']); // storage sem shell → ignorado
  expect(set.entries.map((e) => e.projectPath)).toContain('app/api/agenda/events/route.ts');
  rmSync(core, { recursive: true, force: true });
});

it('lança DuplicateOwnerError em path com dois donos', () => {
  const core = fakeCore();
  mkdirSync(join(core, 'plugins', 'x', 'shell'), { recursive: true });
  writeFileSync(
    join(core, 'plugins', 'x', 'shell', 'manifest.json'),
    JSON.stringify({
      owner: 'x',
      files: { 'app/proxy.ts': 'managed' },
    })
  );
  expect(() => loadManifests(core, ['x'])).toThrowError(DuplicateOwnerError);
  rmSync(core, { recursive: true, force: true });
});
