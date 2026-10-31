// Leitura/escrita do kizuna.plugins.json do projeto (lista de plugins habilitados)
// e enumeração dos plugins disponíveis no core.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SQL_RE = /^\d{4}_.*\.sql$/;

function filePath(projectDir) {
  return join(projectDir, 'kizuna.plugins.json');
}

export function readEnabled(projectDir) {
  try {
    const json = JSON.parse(readFileSync(filePath(projectDir), 'utf8'));
    return Array.isArray(json.plugins) ? json.plugins : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

// Append idempotente. Preserva chaves `_comment_*` e a formatação de 2 espaços.
export function addEnabled(projectDir, name) {
  const path = filePath(projectDir);
  let json;
  try {
    json = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') json = {};
    else throw err;
  }
  if (!Array.isArray(json.plugins)) json.plugins = [];
  if (!json.plugins.includes(name)) json.plugins.push(name);
  writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
}

// Subdirs de plugins/ que têm ao menos um NNNN_*.sql.
export function listAvailable(coreDir) {
  const dir = join(coreDir, 'plugins');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => {
      try {
        return readdirSync(join(dir, d.name)).some((f) => SQL_RE.test(f));
      } catch {
        return false;
      }
    })
    .map((d) => d.name)
    .sort();
}
