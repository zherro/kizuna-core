// `kizuna lock` — regrava kizuna.lock marcando o kizuna-core atual como "visto":
// atualiza version/sha/syncedAt e as contagens de migration, SEM tocar nos
// hashes de template.files / plugins.*.shellFiles.

import { readLock, writeLock } from '../lib/lockfile.mjs';
import { readEnabled } from '../lib/plugins-file.mjs';
import { countMigrations } from '../lib/migrations.mjs';
import { head, readVersion } from '../lib/core-git.mjs';

export async function run(ctx) {
  const { paths, prompt, flags = {} } = ctx;
  const { projectDir, coreDir } = paths;

  const lock = readLock(projectDir);
  if (!lock) {
    console.log('projeto sem kizuna.lock — rode `kizuna install` ou `kizuna adopt` primeiro');
    return 1;
  }

  if (!flags.yes && prompt) {
    const ok = await prompt.confirm('regravar kizuna.lock marcando o core atual como visto?');
    if (!ok) {
      console.log('cancelado');
      return 0;
    }
  }

  const version = readVersion(coreDir);
  lock.kizunaCore = { version, sha: head(coreDir), syncedAt: new Date().toISOString() };
  lock.template = { ...(lock.template ?? {}), version, files: lock.template?.files ?? {} };

  lock.plugins = lock.plugins ?? {};
  for (const name of [...readEnabled(projectDir), 'core']) {
    lock.plugins[name] = {
      ...(lock.plugins[name] ?? {}),
      migrations: countMigrations(coreDir, name),
    };
  }

  writeLock(projectDir, lock);
  console.log('kizuna.lock atualizado (core marcado como visto)');
  return 0;
}
