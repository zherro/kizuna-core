// `kizuna db install` — instala o schema completo (core + plugins) em Node puro.
// `kizuna db migrate` — aplica só as migrations pendentes (por plugin + core) a
// partir das contagens registradas no kizuna.lock.
// `kizuna db run <arquivo.sql> [...]` — aplica .sql avulsos (ex.: db/reseed.sql do projeto).
//
// Conecta direto na --db-url com o driver pg do CLI (sem psql). Opcional: --psql "<cmd>" ou env
// KIZUNA_PSQL (ex.: "docker exec -i pg psql -U myuser") para usar o psql.

import { readEnabled } from '../lib/plugins-file.mjs';
import { readLock, writeLock, emptyLock } from '../lib/lockfile.mjs';
import { join, isAbsolute } from 'node:path';
import { runCoreInstall, applyRange, runFiles } from '../lib/migrations.mjs';
import { resolveDbUrl } from '../lib/dotenv.mjs';

export async function run(ctx) {
  const { paths, args, flags = {} } = ctx;
  const { projectDir, coreDir } = paths;
  const sub = args[0];

  const dbUrl = resolveDbUrl(flags, projectDir);
  if (!dbUrl) {
    console.error('defina DATABASE_URL no .env do projeto (ou --db-url <url> / $DATABASE_URL)');
    return 1;
  }
  const psql = flags.psql;
  const enabled = readEnabled(projectDir);
  const lock = readLock(projectDir) ?? emptyLock();
  lock.plugins = lock.plugins ?? {};

  if (sub === 'install') {
    const counts = await runCoreInstall({ dbUrl, coreDir, plugins: enabled, psql });
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
      const total = await applyRange({ dbUrl, coreDir, plugin: name, from, psql });
      lock.plugins[name] = { ...(lock.plugins[name] ?? {}), migrations: total };
      console.log(`${name}: ${from} → ${total}`);
    }
    writeLock(projectDir, lock);
    return 0;
  }

  if (sub === 'run') {
    const files = args.slice(1).map((f) => (isAbsolute(f) ? f : join(process.cwd(), f)));
    if (!files.length) {
      console.error('uso: kizuna db run <arquivo.sql> [...]  [--db-url <url>]');
      return 1;
    }
    await runFiles({ dbUrl, files, psql });
    console.log('✓ aplicado');
    return 0;
  }

  console.error('uso: kizuna db <install|migrate|run>  [--db-url <url>] [--psql "<cmd>"]');
  return 1;
}
