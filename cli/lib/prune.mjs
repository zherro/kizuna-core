// Detecta e remove arquivos "órfãos" — que uma versão anterior do template
// materializou mas o manifesto atual não tem mais (ex.: casca movida de app/
// para src/app/). O Next silenciosamente prefere o layout antigo, então isso
// tem que ser limpo.

import { existsSync, rmSync, rmdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export function findOrphans(projectDir, prevPaths = [], currentPaths = []) {
  const current = new Set(currentPaths);
  return prevPaths.filter((p) => !current.has(p) && existsSync(join(projectDir, p)));
}

function pruneEmptyDirsUp(absFile, stopAt) {
  let dir = dirname(absFile);
  while (dir.length > stopAt.length && dir.startsWith(stopAt)) {
    try {
      if (readdirSync(dir).length > 0) break;
      rmdirSync(dir);
    } catch {
      break;
    }
    dir = dirname(dir);
  }
}

export function removeOrphans(projectDir, orphans = []) {
  for (const rel of orphans) {
    const abs = join(projectDir, rel);
    try {
      rmSync(abs, { force: true });
      pruneEmptyDirsUp(abs, projectDir);
    } catch {
      /* ignora */
    }
  }
}
