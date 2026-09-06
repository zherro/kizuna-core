// Contagem e aplicação incremental de migrations do core e dos plugins.
//   core   → sql/*.sql
//   plugin → plugins/<plugin>/NNNN_*.sql
//
// Aplicação é feita em Node puro (sem bash) — cada .sql é lido do disco e
// mandado por stdin ao psql. Isso funciona igual no Windows, no Linux e com
// `docker exec` (onde o -f não enxergaria o arquivo do host).
//
// psql resolvido de (em ordem): flag --psql, env KIZUNA_PSQL, senão "psql".
// O valor pode ter argumentos: KIZUNA_PSQL="docker exec -i pg psql -U myuser"

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
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

// Resolve o comando psql:
//   "psql"                                        → { cmd: 'psql', args: [] }
//   "C:\Program Files\PostgreSQL\17\bin\psql.exe" → { cmd: <path>, args: [] }  (path com espaços, arquivo existe)
//   'docker exec -i pg psql -U x'                 → { cmd: 'docker', args: [...] }
//   'psql "-U" "meu user"'                        → tokeniza respeitando aspas
export function resolvePsql(explicit) {
  const raw = (explicit || process.env.KIZUNA_PSQL || 'psql').trim();
  // Um caminho único (mesmo com espaços) que aponta pra um arquivo existente.
  const unquoted = raw.replace(/^"(.*)"$/, '$1');
  if (existsSync(unquoted)) return { cmd: unquoted, args: [] };
  if (!/\s/.test(raw)) return { cmd: raw, args: [] };
  // Tokeniza respeitando "aspas".
  const parts = raw.match(/"[^"]*"|\S+/g).map((t) => t.replace(/^"(.*)"$/, '$1'));
  return { cmd: parts[0], args: parts.slice(1) };
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

// Roda um .sql mandando o conteúdo por stdin (cross-platform / docker-safe).
function applyFile(psql, dbUrl, file) {
  const sql = readFileSync(file, 'utf8');
  execFileSync(
    psql.cmd,
    [...psql.args, dbUrl, '-v', 'ON_ERROR_STOP=1'],
    { input: sql, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] }
  );
}

// Aplica os arquivos com índice > from. from = 0 aplica todos.
// Retorna o novo total (contagem completa de arquivos).
export function applyRange({ dbUrl, coreDir, plugin, from = 0, psql }) {
  if (!dbUrl) throw new Error('dbUrl é obrigatório para aplicar migrations');
  const spec = resolvePsql(psql);
  const files = listMigrationFiles(coreDir, plugin);
  const pending = files.filter((file, i) => {
    const idx = plugin === 'core' ? i + 1 : indexOf(file.split(/[\\/]/).pop());
    return idx > from;
  });
  for (const file of pending) {
    console.log(`   → ${plugin}: ${file.split(/[\\/]/).pop()}`);
    applyFile(spec, dbUrl, file);
  }
  return files.length;
}

// Instalação completa do schema em Node puro: core/sql/* + cada plugin em ordem.
// Substitui o shell para scripts/install.sh (que continua existindo para quem
// prefere bash). Retorna { core, plugins: { <n>: total } } com as contagens.
export function runCoreInstall({ dbUrl, coreDir, plugins = [], psql }) {
  if (!dbUrl) throw new Error('dbUrl é obrigatório');
  const spec = resolvePsql(psql);
  const counts = { core: 0, plugins: {} };

  console.log('1) core (sql/)...');
  const coreFiles = listMigrationFiles(coreDir, 'core');
  for (const file of coreFiles) {
    console.log(`   → ${file.split(/[\\/]/).pop()}`);
    applyFile(spec, dbUrl, file);
  }
  counts.core = coreFiles.length;

  if (plugins.length) {
    console.log('2) plugins...');
    for (const name of plugins) {
      const files = listMigrationFiles(coreDir, name);
      if (!files.length) {
        console.error(`   ⚠ plugin '${name}' sem NNNN_*.sql — pulado`);
        continue;
      }
      for (const file of files) {
        console.log(`   → ${name}: ${file.split(/[\\/]/).pop()}`);
        applyFile(spec, dbUrl, file);
      }
      counts.plugins[name] = files.length;
    }
  }

  console.log('✓ schema aplicado');
  return counts;
}
