// `kizuna check` — avisa (nunca falha) se o kizuna-core divergiu do kizuna.lock
// deste projeto. Retorna SEMPRE 0.

import { readLock } from '../lib/lockfile.mjs';
import { readEnabled } from '../lib/plugins-file.mjs';
import { countMigrations } from '../lib/migrations.mjs';
import { head, readVersion, logRange } from '../lib/core-git.mjs';
import { renderDivergence } from '../lib/banner.mjs';

function safe(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export async function run(ctx) {
  const { paths, flags = {} } = ctx;
  const { projectDir, coreDir } = paths;

  const lock = readLock(projectDir);
  if (!lock) {
    console.log('projeto sem kizuna.lock — rode `kizuna adopt`');
    return 0;
  }

  const liveVersion = readVersion(coreDir);
  const liveSha = safe(() => head(coreDir), null);
  const enabled = readEnabled(projectDir);

  const pluginDeltas = enabled.map((name) => ({
    name,
    from: lock.plugins?.[name]?.migrations ?? 0,
    to: safe(() => countMigrations(coreDir, name), 0),
  }));

  const lockedSha = lock.kizunaCore?.sha ?? null;
  const logText = lockedSha ? safe(() => logRange(coreDir, lockedSha), '') : '';

  const banner = renderDivergence({
    lock,
    liveVersion,
    liveSha,
    liveTemplateVersion: liveVersion,
    pluginDeltas,
    logText,
  });

  if (banner) {
    console.log(banner);
  } else if (flags.verbose) {
    console.log('✓ kizuna-core em dia');
  }
  return 0;
}
