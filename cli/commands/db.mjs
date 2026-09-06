// `kizuna db install` — roda a instalação completa do schema (core + plugins).
// `kizuna db migrate` — aplica as migrations pendentes por plugin (+ core) a
// partir das contagens registradas no kizuna.lock.

import { readEnabled } from '../lib/plugins-file.mjs';
import { readLock, writeLock, emptyLock } from '../lib/lockfile.mjs';
import { runCoreInstall, applyRange } from '../lib/migrations.mjs';

export async function run(ctx) {
  const { paths, args, flags = {} } = ctx;
  const { projectDir, coreDir } = paths;
  const sub = args[0];

  const dbUrl = flags.dbUrl || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('defina --db-url <url> ou $DATABASE_URL');
    return 1;
  }
  const enabled = readEnabled(projectDir);

  if (sub === 'install') {
    runCoreInstall({ dbUrl, coreDir, plugins: enabled });
    console.log('schema instalado');
    return 0;
  }

  if (sub === 'migrate') {
    const lock = readLock(projectDir) ?? emptyLock();
    lock.plugins = lock.plugins ?? {};
    for (const name of ['core', ...enabled]) {
      const from = lock.plugins[name]?.migrations ?? 0;
      const total = applyRange({ dbUrl, coreDir, plugin: name, from });
      lock.plugins[name] = { ...(lock.plugins[name] ?? {}), migrations: total };
      console.log(`${name}: ${from} → ${total}`);
    }
    writeLock(projectDir, lock);
    return 0;
  }

  console.error('uso: kizuna db <install|migrate>');
  return 1;
}
