// Regenera os bundles SQL — concatenações prontas pra aplicar de uma vez.
// Os arquivos de origem (sql/ e plugins/<n>/NNNN_*.sql) seguem sendo a fonte
// da verdade; os bundles são só conveniência.
//
//   node bundle/build.mjs
//
// Gera:
//   bundle/core-schema.sql      → sql/*.sql (auth + RBAC + plugin_registry)
//   bundle/plugins-schema.sql   → migrations dos plugins de starter/kizuna.plugins.json,
//                                 na ordem em que o `db install` aplica

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listMigrationFiles } from '../cli/lib/migrations.mjs';

const coreDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function section(name) {
  return (
    `\n\n-- ===================================================================\n` +
    `-- ${name}\n` +
    `-- ===================================================================\n\n`
  );
}

function concat(files) {
  let out = '';
  for (const f of files) {
    out += section(f.split(/[\\/]/).pop());
    out += readFileSync(f, 'utf8').replace(/\s*$/, '') + '\n';
  }
  return out;
}

// --- core ---------------------------------------------------------------
const coreFiles = listMigrationFiles(coreDir, 'core');
let core = '-- kizuna-core — schema do CORE compilado (auth + RBAC + plugin_registry)\n';
core += '-- GERADO de sql/*.sql. NÃO edite à mão. Regenere: node bundle/build.mjs\n';
core += '-- Aplicar em base LIMPA:  psql "$DB_URL" -v ON_ERROR_STOP=1 -f bundle/core-schema.sql\n';
core += '-- (nem todo .sql de origem é idempotente — re-rodar numa base já provisionada dá erro;\n';
core += '--  pra atualização incremental use `node kizuna-core/cli db migrate`)\n';
core += `-- Arquivos: ${coreFiles.length}\n`;
core += concat(coreFiles);
writeFileSync(join(coreDir, 'bundle', 'core-schema.sql'), core);

// --- plugins -----------------------------------------------------------
const enabled = JSON.parse(
  readFileSync(join(coreDir, 'starter', 'kizuna.plugins.json'), 'utf8')
).plugins;

let plugins = '-- kizuna-core — migrations dos PLUGINS compiladas\n';
plugins += '-- GERADO de plugins/<n>/NNNN_*.sql para a lista de starter/kizuna.plugins.json.\n';
plugins += '-- NÃO edite à mão. Regenere: node bundle/build.mjs\n';
plugins += '-- Aplicar DEPOIS do core-schema.sql, em base LIMPA:\n';
plugins += '--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f bundle/plugins-schema.sql\n';
plugins += '-- `taxonomy` NÃO está aqui (ALTERa tabelas que só o schema do app cria).\n';
plugins += `-- Plugins: ${enabled.join(', ')}\n`;

let pluginCount = 0;
for (const name of enabled) {
  const files = listMigrationFiles(coreDir, name);
  if (!files.length) continue;
  plugins += section(`PLUGIN: ${name}  (${files.length} arquivo${files.length > 1 ? 's' : ''})`);
  plugins += concat(files);
  pluginCount += files.length;
}
writeFileSync(join(coreDir, 'bundle', 'plugins-schema.sql'), plugins);

console.log(`bundle/core-schema.sql     — ${coreFiles.length} arquivos`);
console.log(`bundle/plugins-schema.sql  — ${pluginCount} arquivos de ${enabled.length} plugins`);
