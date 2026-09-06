// `kizuna install` — materializa a casca base (+ cascas de plugin habilitados)
// num projeto novo e escreve o kizuna.lock.

import { existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadManifests, DuplicateOwnerError } from '../lib/manifest.mjs';
import { materialize } from '../lib/materialize.mjs';
import { readEnabled, addEnabled, listAvailable } from '../lib/plugins-file.mjs';
import { writeLock } from '../lib/lockfile.mjs';
import { buildFreshLock } from '../lib/lock-build.mjs';
import { runCoreInstall } from '../lib/migrations.mjs';

export async function run(ctx) {
  const { paths, prompt, flags = {} } = ctx;
  const { projectDir, coreDir, pluginsFilePath } = paths;

  if (!existsSync(`${coreDir}/template`)) {
    console.error('kizuna-core sem template/ — rode `git submodule update --init` no core');
    return 1;
  }

  // (2) plugins habilitados
  if (!existsSync(pluginsFilePath)) {
    let available = [];
    try {
      available = listAvailable(coreDir);
    } catch { /* plugins/ ausente no core */ }
    if (flags.input === false || !prompt) {
      writeFileSync(pluginsFilePath, `${JSON.stringify({ plugins: [] }, null, 2)}\n`);
    } else {
      for (const name of available) {
        if (await prompt.confirm(`habilitar plugin "${name}"?`)) addEnabled(projectDir, name);
      }
      if (!existsSync(pluginsFilePath)) {
        writeFileSync(pluginsFilePath, `${JSON.stringify({ plugins: [] }, null, 2)}\n`);
      }
    }
  }
  const enabled = readEnabled(projectDir);

  // (3) manifests
  let set;
  try {
    set = loadManifests(coreDir, enabled);
  } catch (err) {
    if (err instanceof DuplicateOwnerError) {
      console.error('conflito de donos no manifesto:');
      for (const c of err.conflicts) {
        console.error(`  ${c.projectPath}: ${c.owners.join(', ')}`);
      }
      return 1;
    }
    throw err;
  }

  // (4) materializa
  const report = await materialize(set, {
    projectDir, coreDir, direction: 'apply', lock: undefined, prompt, dryRun: false,
  });

  // (5) banco
  const dbUrl = flags.dbUrl || process.env.DATABASE_URL;
  if (dbUrl && !flags.skipDb) {
    runCoreInstall({ dbUrl, coreDir, plugins: enabled });
  } else {
    console.log('pulei o banco (sem --db-url/$DATABASE_URL ou com --skip-db)');
  }

  // (6-7) lock
  const lock = buildFreshLock({ coreDir, enabled, report });
  writeLock(projectDir, lock);

  // (8) npm install
  const wantNpm = flags.yes === true
    || (prompt && flags.input !== false && await prompt.confirm('rodar npm install agora?'));
  if (wantNpm) {
    try {
      execFileSync('npm', ['install'], { cwd: projectDir, stdio: 'inherit' });
    } catch {
      console.error('npm install falhou — rode manualmente');
    }
  }

  console.log(`casca instalada: ${report.applied.length} arquivo(s), ${report.conflicts.length} conflito(s)`);
  return 0;
}
