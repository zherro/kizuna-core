import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

export class DuplicateOwnerError extends Error {
  constructor(conflicts) {
    super(
      'paths reivindicados por mais de um dono: ' +
        conflicts.map((c) => `${c.projectPath} (${c.owners.join(', ')})`).join('; ')
    );
    this.name = 'DuplicateOwnerError';
    this.conflicts = conflicts;
  }
}

function readOne(manifestPath, resolveSource) {
  const raw = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const owner = raw.owner;
  const entries = Object.entries(raw.files ?? {}).map(([projectPath, mode]) => ({
    projectPath,
    mode,
    owner,
    sourceAbsPath: resolveSource(projectPath),
  }));
  const merges = Object.entries(raw.merge ?? {}).map(([projectPath, contribRel]) => ({
    projectPath,
    owner,
    contribAbsPath: join(dirname(manifestPath), contribRel),
  }));
  return { entries, merges };
}

export function loadManifests(coreDir, enabledPlugins) {
  const parts = [];
  parts.push(
    readOne(join(coreDir, 'template', 'kizuna.manifest.json'), (p) => join(coreDir, 'template', p))
  );
  for (const name of enabledPlugins) {
    const mp = join(coreDir, 'plugins', name, 'shell', 'manifest.json');
    if (!existsSync(mp)) continue;
    parts.push(readOne(mp, (p) => join(coreDir, 'plugins', name, 'shell', p)));
  }
  const entries = parts.flatMap((p) => p.entries);
  const merges = parts.flatMap((p) => p.merges);

  const byPath = new Map();
  for (const e of [...entries, ...merges]) {
    if (!byPath.has(e.projectPath)) byPath.set(e.projectPath, new Set());
    byPath.get(e.projectPath).add(e.owner);
  }
  const conflicts = [...byPath.entries()]
    .filter(([, owners]) => owners.size > 1)
    .map(([projectPath, owners]) => ({ projectPath, owners: [...owners] }));
  if (conflicts.length) throw new DuplicateOwnerError(conflicts);

  return { entries, merges };
}
