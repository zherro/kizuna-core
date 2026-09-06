// Contagem e aplicação incremental de migrations do core e dos plugins.
//   core   → sql/*.sql
//   plugin → plugins/<plugin>/NNNN_*.sql

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const NUM_RE = /^(\d{4})_.*\.sql$/;

function migrationsDir(coreDir, plugin) {
  return plugin === 'core'
    ? join(coreDir, 'sql')
    : join(coreDir, 'plugins', plugin);
}

// Índice numérico do arquivo (0 se não prefixado).
function indexOf(name) {
  const m = name.match(NUM_RE);
  return m ? Number(m[1]) : 0;
}

export function listMigrationFiles(coreDir, plugin) {
  const dir = migrationsDir(coreDir, plugin);
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const filtered = plugin === 'core'
    ? names.filter((n) => n.endsWith('.sql'))
    : names.filter((n) => NUM_RE.test(n));
  return filtered
    .sort((a, b) => indexOf(a) - indexOf(b) || a.localeCompare(b))
    .map((n) => join(dir, n));
}

export function countMigrations(coreDir, plugin) {
  return listMigrationFiles(coreDir, plugin).length;
}

// Aplica os arquivos com índice > from. from = 0 aplica todos.
// Retorna o novo total (contagem completa de arquivos).
export function applyRange({ dbUrl, coreDir, plugin, from = 0 }) {
  if (!dbUrl) throw new Error('dbUrl é obrigatório para aplicar migrations');
  const files = listMigrationFiles(coreDir, plugin);
  const pending = files.filter((file, i) => {
    const idx = plugin === 'core' ? i + 1 : indexOf(file.split(/[\\/]/).pop());
    return idx > from;
  });
  for (const file of pending) {
    execFileSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-f', file], { encoding: 'utf8' });
  }
  return files.length;
}

// Shell para scripts/install.sh (usado pelo install inicial e por `db install`).
export function runCoreInstall({ dbUrl, coreDir, plugins = [] }) {
  if (!dbUrl) throw new Error('dbUrl é obrigatório');
  const script = join(coreDir, 'scripts', 'install.sh');
  const args = [script, '--db-url', dbUrl];
  if (plugins.length) args.push('--plugins', plugins.join(','));
  execFileSync('bash', args, { encoding: 'utf8', stdio: 'inherit' });
}
