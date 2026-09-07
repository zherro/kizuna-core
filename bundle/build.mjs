// Regenera bundle/core-schema.sql = todos os sql/*.sql do core concatenados na
// ordem que o CLI aplica. Os arquivos de origem em sql/ continuam sendo a fonte
// da verdade; este bundle é só uma conveniência para aplicar tudo de uma vez.
//
//   node bundle/build.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listMigrationFiles } from '../cli/lib/migrations.mjs';

const coreDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = listMigrationFiles(coreDir, 'core');

let out = '-- kizuna-core — schema do CORE compilado (auth + RBAC + plugin_registry)\n';
out += '-- GERADO de sql/*.sql na ordem que o CLI aplica. NÃO edite à mão.\n';
out += '-- Regenere:  node bundle/build.mjs\n';
out += '-- Aplicar:   psql "$DB_URL" -v ON_ERROR_STOP=1 -f bundle/core-schema.sql\n';
out += `-- Arquivos: ${files.length}\n`;

for (const f of files) {
  const name = f.split(/[\\/]/).pop();
  out += `\n\n-- ===================================================================\n`;
  out += `-- ${name}\n`;
  out += `-- ===================================================================\n\n`;
  out += readFileSync(f, 'utf8').replace(/\s*$/, '') + '\n';
}

writeFileSync(join(coreDir, 'bundle', 'core-schema.sql'), out);
console.log(`bundle/core-schema.sql — ${files.length} arquivos, ${out.split('\n').length} linhas`);
