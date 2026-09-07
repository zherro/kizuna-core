// `kizuna install` — materializa a casca base (+ cascas de plugin habilitados)
// num projeto novo e escreve o kizuna.lock.

import { existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadManifests, DuplicateOwnerError } from '../lib/manifest.mjs';
import { materialize } from '../lib/materialize.mjs';
import { readEnabled, addEnabled, listAvailable } from '../lib/plugins-file.mjs';
import { readLock, writeLock } from '../lib/lockfile.mjs';
import { buildFreshLock } from '../lib/lock-build.mjs';
import { findOrphans, removeOrphans } from '../lib/prune.mjs';
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
    } catch {
      /* plugins/ ausente no core */
    }
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

  // (4) materializa. --force re-materializa TUDO por cima de um projeto existente
  // (managed sobrescreve, seeds também) — para re-sincronizar a casca inteira.
  const report = await materialize(set, {
    projectDir,
    coreDir,
    direction: 'apply',
    lock: undefined,
    prompt,
    dryRun: false,
    force: flags.force === true,
    reseed: flags.force === true,
  });

  // (5) banco
  const dbUrl = flags.dbUrl || process.env.DATABASE_URL;
  if (dbUrl && !flags.skipDb) {
    runCoreInstall({ dbUrl, coreDir, plugins: enabled, psql: flags.psql });
  } else {
    console.log(
      'pulei o banco (sem --db-url/$DATABASE_URL ou com --skip-db) — rode depois: node kizuna-core/cli db install --db-url <url>'
    );
  }

  // (5b) órfãos de um layout anterior (ex.: app/ → src/app/)
  const prevMaterialized = readLock(projectDir)?.materialized ?? [];
  const orphans = findOrphans(projectDir, prevMaterialized, report.materializedPaths);
  if (orphans.length) {
    if (flags.force === true || flags.prune === true) {
      removeOrphans(projectDir, orphans);
      console.log(
        `removidos ${orphans.length} arquivo(s) de layout anterior: ${orphans.join(', ')}`
      );
    } else {
      console.log('');
      console.log(
        `⚠ ${orphans.length} arquivo(s) de um layout ANTERIOR ainda existem — o Next pode usá-los em vez dos novos:`
      );
      for (const p of orphans) console.log(`      ${p}`);
      console.log('    rode com --prune (ou --force) para remover.');
    }
  }

  // (6-7) lock
  const lock = buildFreshLock({ coreDir, enabled, report });
  lock.materialized = [...report.materializedPaths].sort();
  writeLock(projectDir, lock);

  // (8) npm install
  const wantNpm =
    flags.yes === true ||
    (prompt && flags.input !== false && (await prompt.confirm('rodar npm install agora?')));
  if (wantNpm) {
    try {
      execFileSync('npm', ['install'], { cwd: projectDir, stdio: 'inherit' });
    } catch {
      console.error('npm install falhou — rode manualmente');
    }
  }

  const verb = flags.force === true ? 'sobrescrito(s)' : 'conflito(s)';
  console.log(
    `casca instalada: ${report.applied.length} novo(s)/atualizado(s), ${report.conflicts.length} ${verb}`
  );
  return 0;
}
