// `kizuna adopt` — gera o kizuna.lock de um projeto que JÁ tem a casca aplicada
// (retrofit). Assume que cada managed presente está sincronizado com o core.
// Não copia nada.

import { existsSync, readFileSync } from 'node:fs';
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

  // Chaves de package.json que o core já contribui e que o projeto tem com valor
  // idêntico: assume-se sincronizadas, então entram em ownedKeys — sem isso o
  // primeiro `update` pós-retrofit dispara conflito em cada dep pinada do core.
  for (const merge of set.merges) {
    const targetPath = join(projectDir, merge.projectPath);
    if (!existsSync(targetPath) || !existsSync(merge.contribAbsPath)) continue;
    let projJson;
    let contribJson;
    try {
      projJson = JSON.parse(readFileSync(targetPath, 'utf8'));
      contribJson = JSON.parse(readFileSync(merge.contribAbsPath, 'utf8'));
    } catch {
      continue;
    }
    for (const section of ['dependencies', 'devDependencies', 'scripts']) {
      const proj = projJson[section] ?? {};
      const contrib = contribJson[section] ?? {};
      const owned = lock.packageJson.ownedKeys[section] ?? {};
      for (const [key, val] of Object.entries(contrib)) {
        if (proj[key] === val) owned[key] = val;
      }
      lock.packageJson.ownedKeys[section] = owned;
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
