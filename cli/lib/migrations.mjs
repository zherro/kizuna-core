// Contagem e aplicação incremental de migrations do core e dos plugins.
//   core   → sql/*.sql
//   plugin → plugins/<plugin>/NNNN_*.sql
//
// Aplicação em Node: por padrão conecta direto na --db-url com o driver `pg` (JS puro, vem do
// npm install do projeto) — sem psql instalado, igual no Windows e no Linux. Cada .sql vai como
// um único "simple query" (multi-statement, para no primeiro erro, como ON_ERROR_STOP=1).
//
// Opcional: --psql "<cmd>" ou env KIZUNA_PSQL usa o psql (conteúdo por stdin), útil quando o
// banco só é alcançável por `docker exec`: KIZUNA_PSQL="docker exec -i pg psql -U myuser"

import { execFileSync, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NUM_RE = /^(\d{4})_.*\.sql$/;

function migrationsDir(coreDir, plugin) {
  return plugin === 'core' ? join(coreDir, 'sql') : join(coreDir, 'plugins', plugin);
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
  const filtered =
    plugin === 'core'
      ? names.filter((n) => n.endsWith('.sql'))
      : names.filter((n) => NUM_RE.test(n));
  return filtered
    .sort((a, b) => indexOf(a) - indexOf(b) || a.localeCompare(b))
    .map((n) => join(dir, n));
}

export function countMigrations(coreDir, plugin) {
  return listMigrationFiles(coreDir, plugin).length;
}

// Abre o executor de SQL: psql se pedido explicitamente (--psql / KIZUNA_PSQL), senão o driver pg.
// Retorna { run(file), close() }.
export async function openRunner({ dbUrl, psql }) {
  if (!dbUrl) throw new Error('dbUrl é obrigatório');
  if (psql || process.env.KIZUNA_PSQL) {
    const spec = resolvePsql(psql);
    return {
      async run(file) {
        execFileSync(spec.cmd, [...spec.args, dbUrl, '-v', 'ON_ERROR_STOP=1'], {
          input: readFileSync(file, 'utf8'),
          encoding: 'utf8',
          stdio: ['pipe', 'inherit', 'inherit'],
        });
      },
      async close() {},
    };
  }

  const pg = loadPg();
  const client = new pg.Client({ connectionString: dbUrl });
  client.on('notice', (n) => console.log(`     ${n.severity ?? 'NOTICE'}: ${n.message}`));
  try {
    await client.connect();
  } catch (err) {
    const reason = err.message || err.code || err.errors?.map((e) => e.message).join('; ') || String(err);
    throw new Error(`não conectou no banco (${dbUrl.replace(/:[^:@/]*@/, ':***@')}): ${reason}`, { cause: err });
  }
  return {
    async run(file) {
      const sql = readFileSync(file, 'utf8');
      try {
        await client.query(sql);
      } catch (err) {
        const where = err.position ? ` (linha ${lineAt(sql, Number(err.position))})` : '';
        throw new Error(`${file.split(/[\\/]/).pop()}${where}: ${err.message}`, { cause: err });
      }
    },
    async close() {
      await client.end();
    },
  };
}

// `pg` é devDependency do próprio CLI (kizuna-core/cli/package.json) — nunca entra no app.
// O submódulo chega sem node_modules: na primeira vez, instala as deps do CLI
// (npm install em kizuna-core/cli).
function loadPg() {
  const req = createRequire(import.meta.url);
  try {
    return req('pg');
  } catch {
    const cliDir = fileURLToPath(new URL('..', import.meta.url));
    console.log('   instalando o driver pg do CLI (npm install em kizuna-core/cli)...');
    execSync('npm install --no-audit --no-fund', { cwd: cliDir, stdio: 'inherit' });
    return req('pg');
  }
}

function lineAt(text, pos) {
  return text.slice(0, pos).split('\n').length;
}

// Aplica uma lista de arquivos .sql avulsos (ex.: db/reseed.sql), em ordem.
export async function runFiles({ dbUrl, files, psql }) {
  const runner = await openRunner({ dbUrl, psql });
  try {
    for (const file of files) {
      console.log(`   → ${file}`);
      await runner.run(file);
    }
  } finally {
    await runner.close();
  }
}

// Aplica os arquivos com índice > from. from = 0 aplica todos.
// Retorna o novo total (contagem completa de arquivos).
export async function applyRange({ dbUrl, coreDir, plugin, from = 0, psql }) {
  if (!dbUrl) throw new Error('dbUrl é obrigatório para aplicar migrations');
  const files = listMigrationFiles(coreDir, plugin);
  const pending = files.filter((file, i) => {
    const idx = plugin === 'core' ? i + 1 : indexOf(file.split(/[\\/]/).pop());
    return idx > from;
  });
  if (pending.length) {
    const runner = await openRunner({ dbUrl, psql });
    try {
      for (const file of pending) {
        console.log(`   → ${plugin}: ${file.split(/[\\/]/).pop()}`);
        await runner.run(file);
      }
    } finally {
      await runner.close();
    }
  }
  return files.length;
}

// Instalação completa do schema em Node: core/sql/* + cada plugin em ordem.
// Substitui o shell para scripts/install.sh (que continua existindo para quem
// prefere bash). Retorna { core, plugins: { <n>: total } } com as contagens.
export async function runCoreInstall({ dbUrl, coreDir, plugins = [], psql }) {
  const runner = await openRunner({ dbUrl, psql });
  try {
    return await installAll(runner, coreDir, plugins);
  } finally {
    await runner.close();
  }
}

async function installAll(runner, coreDir, plugins) {
  const counts = { core: 0, plugins: {} };

  console.log('1) core (sql/)...');
  const coreFiles = listMigrationFiles(coreDir, 'core');
  for (const file of coreFiles) {
    console.log(`   → ${file.split(/[\\/]/).pop()}`);
    await runner.run(file);
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
        await runner.run(file);
      }
      counts.plugins[name] = files.length;
    }
  }

  console.log('✓ schema aplicado');
  return counts;
}
