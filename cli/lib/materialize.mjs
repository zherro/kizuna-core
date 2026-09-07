// Materializa um ManifestSet no projeto (direction 'apply') ou empurra as
// edições do projeto de volta para o core (direction 'push').
// Assinatura async: 'conflict' consulta prompt.choose, que é async.

import {
  existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { hashFile } from './hash.mjs';
import { classify } from './diff3.mjs';
import { mergePackageJson } from './pkg-merge.mjs';

// Uma entry é do template sse seu dono é 'base'; caso contrário é casca de
// plugin, cujo dono é o nome do plugin (usado para chavear pluginShellFiles).
function isTemplateEntry(entry) {
  return entry.owner === 'base';
}

function safeHash(absPath) {
  try {
    return hashFile(absPath);
  } catch {
    return null;
  }
}

export async function materialize(manifestSet, opts) {
  const { projectDir, direction = 'apply', lock, prompt, dryRun = false, reseed = false } = opts;
  const report = {
    applied: [],
    skipped: [],
    conflicts: [],
    merges: [],
    seedDrift: [],
    newLockFragment: { templateFiles: {}, pluginShellFiles: {}, packageOwnedKeys: null },
  };

  const record = (entry, absPath) => {
    const h = safeHash(absPath);
    if (!h) return;
    if (isTemplateEntry(entry)) {
      report.newLockFragment.templateFiles[entry.projectPath] = h;
    } else {
      const bucket = report.newLockFragment.pluginShellFiles[entry.owner] ?? {};
      bucket[entry.projectPath] = h;
      report.newLockFragment.pluginShellFiles[entry.owner] = bucket;
    }
  };

  const write = (from, to) => {
    if (dryRun) return;
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
  };

  for (const entry of manifestSet.entries) {
    const target = join(projectDir, entry.projectPath);
    const source = entry.sourceAbsPath;

    if (direction === 'push') {
      if (entry.mode !== 'managed') continue;
      if (!existsSync(target)) {
        report.skipped.push(entry.projectPath);
        continue;
      }
      const liveHash = hashFile(target);
      const currentHash = safeHash(source);
      if (currentHash === liveHash) {
        record(entry, source);
        continue;
      }
      write(target, source);
      report.applied.push(entry.projectPath);
      record(entry, dryRun ? target : source);
      continue;
    }

    // direction === 'apply'
    if (entry.mode === 'seed') {
      const reseedThis =
        reseed === true || (Array.isArray(reseed) && reseed.includes(entry.projectPath));
      if (!existsSync(target)) {
        write(source, target);
        report.applied.push(entry.projectPath);
      } else if (reseedThis) {
        if (safeHash(target) === safeHash(source)) {
          report.skipped.push(entry.projectPath);
        } else {
          write(source, target);
          report.applied.push(entry.projectPath);
        }
      } else {
        report.skipped.push(entry.projectPath);
        // Seed que já existe mas divergiu do template — o usuário pode ter
        // customizado, ou pode estar numa versão antiga. Só sinaliza.
        if (safeHash(target) !== safeHash(source)) {
          report.seedDrift.push(entry.projectPath);
        }
      }
      continue;
    }

    // managed
    const liveHash = hashFile(source);
    const lockedHash = isTemplateEntry(entry)
      ? (lock?.template?.files?.[entry.projectPath] ?? null)
      : (lock?.plugins?.[entry.owner]?.shellFiles?.[entry.projectPath] ?? null);
    const currentHash = existsSync(target) ? hashFile(target) : null;
    const verdict = classify(liveHash, lockedHash, currentHash);

    if (verdict === 'noop') {
      report.skipped.push(entry.projectPath);
      // noop: live == locked == current. O hash estável é o da fonte; hashear
      // o arquivo do projeto avançaria o lock para uma edição local.
      record(entry, source);
      continue;
    }
    if (verdict === 'fast-forward') {
      write(source, target);
      report.applied.push(entry.projectPath);
      record(entry, dryRun ? source : target);
      continue;
    }
    // conflict
    const choice = await prompt.choose(
      `conflito em ${entry.projectPath}`,
      ['sobrescreve', 'mantém'],
    );
    report.conflicts.push(entry.projectPath);
    if (choice === 'sobrescreve') {
      write(source, target);
      record(entry, dryRun ? source : target);
    } else {
      record(entry, target);
    }
  }

  if (direction === 'apply') {
    for (const merge of manifestSet.merges) {
      const target = join(projectDir, merge.projectPath);
      const targetJson = existsSync(target)
        ? JSON.parse(readFileSync(target, 'utf8'))
        : {};
      const contribJson = JSON.parse(readFileSync(merge.contribAbsPath, 'utf8'));
      const prevOwned = lock?.packageJson?.ownedKeys ?? {};
      const merged = mergePackageJson(targetJson, contribJson, prevOwned);
      if (!dryRun) {
        writeFileSync(target, JSON.stringify(merged.result, null, 2) + '\n');
      }
      report.merges.push({ path: merge.projectPath, conflicts: merged.conflicts });
      report.newLockFragment.packageOwnedKeys = merged.ownedKeys;
    }
  }

  return report;
}
