// `kizuna sync` — empurra as edições locais dos managed de volta para o
// kizuna-core/template/ (ou plugins/<n>/shell/). Não toca no kizuna.lock do
// projeto — o `update` seguinte reconcilia.

import { readFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadManifests, DuplicateOwnerError } from '../lib/manifest.mjs';
import { materialize } from '../lib/materialize.mjs';
import { readEnabled } from '../lib/plugins-file.mjs';
import { readLock } from '../lib/lockfile.mjs';
import { currentBranch, isDetached } from '../lib/core-git.mjs';
import { renderDiff } from '../lib/diff3.mjs';

export async function run(ctx) {
  const { paths, prompt, flags = {} } = ctx;
  const { projectDir, coreDir } = paths;

  let branch = null;
  try {
    branch = currentBranch(coreDir);
  } catch { /* não é repo git */ }
  const blocked = isDetachedSafe(coreDir) || branch === 'main' || branch === 'master';
  if (blocked && !flags.force) {
    console.error(`kizuna-core está em "${branch ?? 'HEAD destacado'}" — troque para uma branch de trabalho ou use --force`);
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

  const lock = readLock(projectDir) ?? undefined;
  const dry = await materialize(set, {
    projectDir, coreDir, direction: 'push', lock, prompt, dryRun: true,
  });

  if (!dry.applied.length) {
    console.log('nada a empurrar: template/ e projeto batem');
    return 0;
  }

  const byPath = new Map(set.entries.map((e) => [e.projectPath, e]));
  let pushed = 0;

  for (const p of dry.applied) {
    const entry = byPath.get(p);
    const src = join(projectDir, p);
    const dst = entry.sourceAbsPath;

    let choice;
    do {
      choice = await prompt.choose(p, ['empurra p/ template', 'pula', 'ver diff']);
      if (choice === 'ver diff') {
        const before = existsSync(dst) ? readFileSync(dst, 'utf8') : '';
        console.log(renderDiff(before, readFileSync(src, 'utf8')));
      }
    } while (choice === 'ver diff');

    if (choice === 'empurra p/ template') {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
      pushed += 1;
      console.log(`  → ${p}`);
    }
  }

  console.log(`\n${pushed} arquivo(s) empurrado(s). Agora:`);
  console.log('  cd kizuna-core && git add -A && git commit && git push');
  return 0;
}

function isDetachedSafe(coreDir) {
  try {
    return isDetached(coreDir);
  } catch {
    return false;
  }
}
