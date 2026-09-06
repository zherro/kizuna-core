// `kizuna update` — puxa o kizuna-core, reaplica a casca (fast-forward /
// conflito) e roda as migrations pendentes; regrava o kizuna.lock.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadManifests, DuplicateOwnerError } from '../lib/manifest.mjs';
import { materialize } from '../lib/materialize.mjs';
import { readEnabled } from '../lib/plugins-file.mjs';
import { readLock, writeLock } from '../lib/lockfile.mjs';
import { applyFragment, stampCore } from '../lib/lock-build.mjs';
import { hashFile } from '../lib/hash.mjs';
import { pull } from '../lib/core-git.mjs';
import { applyRange as applyMigrations } from '../lib/migrations.mjs';

function deepCopyShellFiles(plugins = {}) {
  const out = {};
  for (const [k, v] of Object.entries(plugins)) {
    out[k] = { ...(v.shellFiles ?? {}) };
  }
  return out;
}

export async function run(ctx) {
  const { paths, prompt, flags = {} } = ctx;
  const { projectDir, coreDir } = paths;

  if (flags.pull !== false) {
    try {
      pull(coreDir);
    } catch (err) {
      console.warn(`git pull falhou (seguindo com o estado atual): ${err.message}`);
    }
  }

  const lock = readLock(projectDir);
  if (!lock) {
    console.error('projeto sem kizuna.lock — rode `kizuna install` ou `kizuna adopt`');
    return 1;
  }

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

  const preTemplate = { ...(lock.template?.files ?? {}) };
  const preShell = deepCopyShellFiles(lock.plugins);

  const report = await materialize(set, {
    projectDir, coreDir, direction: 'apply', lock, prompt, dryRun: false,
  });

  // migrations
  const dbUrl = flags.dbUrl || process.env.DATABASE_URL;
  if (dbUrl && !flags.skipDb) {
    for (const name of ['core', ...enabled]) {
      const from = lock.plugins?.[name]?.migrations ?? 0;
      applyMigrations({ dbUrl, coreDir, plugin: name, from });
    }
  }

  applyFragment(lock, report.newLockFragment);

  // Conflitos que o usuário optou por MANTER não devem avançar o lock: se o
  // arquivo em disco difere da versão viva do core, restaura o hash anterior.
  for (const p of report.conflicts) {
    const entry = set.entries.find((e) => e.projectPath === p);
    if (!entry) continue;
    const liveHash = hashFile(entry.sourceAbsPath);
    const diskAbs = join(projectDir, p);
    const diskHash = existsSync(diskAbs) ? hashFile(diskAbs) : null;
    if (diskHash === liveHash) continue; // usuário sobrescreveu — ok avançar
    if (entry.owner === 'base') {
      if (p in preTemplate) lock.template.files[p] = preTemplate[p];
      else delete lock.template.files[p];
    } else {
      const prev = preShell[entry.owner]?.[p];
      lock.plugins[entry.owner] = lock.plugins[entry.owner] ?? {};
      lock.plugins[entry.owner].shellFiles = lock.plugins[entry.owner].shellFiles ?? {};
      if (prev) lock.plugins[entry.owner].shellFiles[p] = prev;
      else delete lock.plugins[entry.owner].shellFiles[p];
    }
  }

  stampCore(lock, { coreDir, enabled });
  writeLock(projectDir, lock);

  console.log(`update: ${report.applied.length} aplicado(s), ${report.skipped.length} sem mudança, ${report.conflicts.length} conflito(s)`);
  if (report.applied.length) console.log(`  aplicados: ${report.applied.join(', ')}`);
  if (report.conflicts.length) console.log(`  conflitos: ${report.conflicts.join(', ')}`);
  return 0;
}
