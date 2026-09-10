import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url)); // kizuna-core/cli/lib

export function resolvePaths({ cwd = process.cwd(), coreDirOverride, projectDirOverride } = {}) {
  const coreDir = coreDirOverride ? resolve(coreDirOverride) : resolve(HERE, '..', '..');
  const projectDir = projectDirOverride ? resolve(projectDirOverride) : resolve(cwd);
  return {
    coreDir,
    projectDir,
    templateDir: join(coreDir, 'template'),
    pluginsDir: join(coreDir, 'plugins'),
    lockPath: join(projectDir, 'kizuna.lock'),
    pluginsFilePath: join(projectDir, 'kizuna.plugins.json'),
  };
}
