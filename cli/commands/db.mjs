// `kizuna db install` — instala o schema completo (core + plugins) em Node puro.
// `kizuna db migrate` — aplica só as migrations pendentes (por plugin + core) a
// partir das contagens registradas no kizuna.lock.
//
// psql: --psql "<cmd>" ou env KIZUNA_PSQL (ex.: "docker exec -i pg psql -U myuser").
// Sem isso, usa "psql" do PATH.

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
  const psql = flags.psql;
  const enabled = readEnabled(projectDir);
  const lock = readLock(projectDir) ?? emptyLock();
  lock.plugins = lock.plugins ?? {};

  if (sub === 'install') {
    const counts = runCoreInstall({ dbUrl, coreDir, plugins: enabled, psql });
    lock.plugins.core = { ...(lock.plugins.core ?? {}), migrations: counts.core };
    for (const [name, total] of Object.entries(counts.plugins)) {
      lock.plugins[name] = { ...(lock.plugins[name] ?? {}), migrations: total };
    }
    writeLock(projectDir, lock);
    return 0;
  }

  if (sub === 'migrate') {
    for (const name of ['core', ...enabled]) {
      const from = lock.plugins[name]?.migrations ?? 0;
      const total = applyRange({ dbUrl, coreDir, plugin: name, from, psql });
      lock.plugins[name] = { ...(lock.plugins[name] ?? {}), migrations: total };
      console.log(`${name}: ${from} → ${total}`);
    }
    writeLock(projectDir, lock);
    return 0;
  }

  console.error('uso: kizuna db <install|migrate>  [--db-url <url>] [--psql "<cmd>"]');
  return 1;
}
