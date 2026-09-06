// `kizuna plugin list` — mostra plugins habilitados vs disponíveis.
// `kizuna plugin add <nome>` — habilita, materializa só a casca do plugin e
// aplica suas migrations.

import { loadManifests, DuplicateOwnerError } from '../lib/manifest.mjs';
import { materialize } from '../lib/materialize.mjs';
import { readEnabled, addEnabled, listAvailable } from '../lib/plugins-file.mjs';
import { readLock, writeLock, emptyLock } from '../lib/lockfile.mjs';
import { applyFragment } from '../lib/lock-build.mjs';
import { countMigrations, applyRange } from '../lib/migrations.mjs';

export async function run(ctx) {
  const { paths, args, prompt, flags = {} } = ctx;
  const { projectDir, coreDir } = paths;
  const sub = args[0] ?? 'list';

  const available = listAvailable(coreDir);
  const enabled = readEnabled(projectDir);

  if (sub === 'list') {
    for (const name of available) {
      console.log(`${enabled.includes(name) ? '[x]' : '[ ]'} ${name}`);
    }
    for (const name of enabled.filter((n) => !available.includes(n))) {
      console.log(`[x] ${name} (não encontrado em plugins/)`);
    }
    return 0;
  }

  if (sub === 'add') {
    const name = args[1];
    if (!name) {
      console.error('uso: kizuna plugin add <nome>');
      return 1;
    }
    if (!available.includes(name)) {
      console.error(`plugin desconhecido: ${name} (disponíveis: ${available.join(', ')})`);
      return 1;
    }
    if (enabled.includes(name)) {
      console.log(`plugin "${name}" já está habilitado`);
      return 0;
    }

    addEnabled(projectDir, name);
    const nextEnabled = readEnabled(projectDir);

    let set;
    try {
      set = loadManifests(coreDir, nextEnabled);
    } catch (err) {
      if (err instanceof DuplicateOwnerError) {
        console.error('conflito de donos no manifesto:');
        for (const c of err.conflicts) console.error(`  ${c.projectPath}: ${c.owners.join(', ')}`);
        return 1;
      }
      throw err;
    }

    const subset = {
      entries: set.entries.filter((e) => e.owner === name),
      merges: set.merges.filter((m) => m.owner === name),
    };
    const lock = readLock(projectDir) ?? emptyLock();
    const report = await materialize(subset, {
      projectDir, coreDir, direction: 'apply', lock, prompt, dryRun: false,
    });

    const dbUrl = flags.dbUrl || process.env.DATABASE_URL;
    if (dbUrl && !flags.skipDb) {
      applyRange({ dbUrl, coreDir, plugin: name, from: 0 });
    }

    applyFragment(lock, report.newLockFragment);
    lock.plugins = lock.plugins ?? {};
    lock.plugins[name] = {
      ...(lock.plugins[name] ?? {}),
      migrations: countMigrations(coreDir, name),
    };
    writeLock(projectDir, lock);

    console.log(`plugin "${name}" habilitado (${report.applied.length} arquivo(s) de casca)`);
    return 0;
  }

  console.error('uso: kizuna plugin <list|add <nome>>');
  return 1;
}
