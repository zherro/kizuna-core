// Helpers para montar/atualizar o kizuna.lock a partir de um ChangeReport do
// materialize e das contagens de migration atuais do core.

import { emptyLock } from './lockfile.mjs';
import { countMigrations } from './migrations.mjs';
import { head, readVersion } from './core-git.mjs';

function safeHead(coreDir) {
  try {
    return head(coreDir);
  } catch {
    return null;
  }
}

// Atualiza kizunaCore/template.version e as contagens de migration (plugins
// habilitados + 'core'), preservando o resto do lock.
export function stampCore(lock, { coreDir, enabled }) {
  const version = readVersion(coreDir);
  lock.kizunaCore = { version, sha: safeHead(coreDir), syncedAt: new Date().toISOString() };
  lock.template = { ...(lock.template ?? {}), version, files: lock.template?.files ?? {} };
  lock.plugins = lock.plugins ?? {};
  for (const name of [...enabled, 'core']) {
    lock.plugins[name] = {
      ...(lock.plugins[name] ?? {}),
      migrations: countMigrations(coreDir, name),
    };
  }
  return lock;
}

// Aplica o newLockFragment do materialize (hashes de template/plugin-shell +
// ownedKeys do package.json).
export function applyFragment(lock, fragment) {
  lock.template = lock.template ?? { version: null, files: {} };
  lock.template.files = { ...(lock.template.files ?? {}), ...fragment.templateFiles };
  lock.plugins = lock.plugins ?? {};
  for (const [owner, files] of Object.entries(fragment.pluginShellFiles ?? {})) {
    lock.plugins[owner] = {
      ...(lock.plugins[owner] ?? {}),
      shellFiles: { ...(lock.plugins[owner]?.shellFiles ?? {}), ...files },
    };
  }
  if (fragment.packageOwnedKeys) {
    lock.packageJson = { ownedKeys: fragment.packageOwnedKeys };
  }
  return lock;
}

// Lock completo para `install` (parte de emptyLock()).
export function buildFreshLock({ coreDir, enabled, report }) {
  const lock = emptyLock();
  applyFragment(lock, report.newLockFragment);
  stampCore(lock, { coreDir, enabled });
  return lock;
}
