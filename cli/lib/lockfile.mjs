import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function emptyLock() {
  return {
    lockVersion: 1,
    kizunaCore: { version: null, sha: null, syncedAt: null },
    template: { version: null, files: {} },
    plugins: {},
    packageJson: { ownedKeys: { dependencies: {}, devDependencies: {}, scripts: {} } },
  };
}

export function readLock(projectDir) {
  try {
    return JSON.parse(readFileSync(join(projectDir, 'kizuna.lock'), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export function writeLock(projectDir, obj) {
  writeFileSync(join(projectDir, 'kizuna.lock'), JSON.stringify(obj, null, 2) + '\n');
}
