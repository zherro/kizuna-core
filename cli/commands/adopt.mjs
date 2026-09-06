// `kizuna adopt` — gera o kizuna.lock de um projeto que JÁ tem a casca aplicada
// (retrofit). Assume que cada managed presente está sincronizado com o core.
// Não copia nada.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadManifests, DuplicateOwnerError } from '../lib/manifest.mjs';
import { readEnabled } from '../lib/plugins-file.mjs';
import { emptyLock, writeLock } from '../lib/lockfile.mjs';
import { hashFile } from '../lib/hash.mjs';
import { stampCore } from '../lib/lock-build.mjs';

export async function run(ctx) {
  const { paths } = ctx;
  const { projectDir, coreDir } = paths;

  const enabled = readEnabled(projectDir);
  let set;
  try {
    set = loadManifests(coreDir, enabled);
  } catch (err) {
    if (err instanceof DuplicateOwnerError) {
      console.error('conflito de donos no manifesto:');
      for (const c of err.conflicts) console.error(`  ${c.projectPath}: ${c.owners.join(', ')}`);
      return 1;
    }
    throw err;
  }

  const lock = emptyLock();
  const missing = [];

  for (const entry of set.entries) {
    if (entry.mode !== 'managed') continue;
    const abs = join(projectDir, entry.projectPath);
    if (!existsSync(abs)) {
      missing.push(entry.projectPath);
      continue;
    }
    const h = hashFile(abs);
    if (entry.owner === 'base') {
      lock.template.files[entry.projectPath] = h;
    } else {
      lock.plugins[entry.owner] = lock.plugins[entry.owner] ?? {};
      lock.plugins[entry.owner].shellFiles = lock.plugins[entry.owner].shellFiles ?? {};
      lock.plugins[entry.owner].shellFiles[entry.projectPath] = h;
    }
  }

  stampCore(lock, { coreDir, enabled });
  writeLock(projectDir, lock);

  console.log(`kizuna.lock gerado (${Object.keys(lock.template.files).length} managed do template)`);
  if (missing.length) {
    console.warn('managed do template AUSENTES no projeto (resolva com `kizuna update`):');
    for (const p of missing) console.warn(`  ${p}`);
  }
  return 0;
}
