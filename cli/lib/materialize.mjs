// Materializa um ManifestSet no projeto (direction 'apply') ou empurra as
// edições do projeto de volta para o core (direction 'push').
// Assinatura async: 'conflict' consulta prompt.choose, que é async.

import { existsSync, readdirSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, basename, extname, resolve } from 'node:path';
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

// Para o modo 'install': o arquivo "já existe" se houver, no mesmo diretório,
// qualquer arquivo com o mesmo nome sem extensão (icon.svg × icon.png). Evita
// reintroduzir um ícone que o projeto trocou de formato — no Next, icon.svg e
// icon.png juntos conflitam.
function existsSameStem(target) {
  if (existsSync(target)) return true;
  const dir = dirname(target);
  const stem = basename(target, extname(target));
  try {
    return readdirSync(dir).some((f) => basename(f, extname(f)) === stem);
  } catch {
    return false;
  }
}

const MODULE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/**
 * Se CRIAR `projectPath` sombrearia (ou disputaria rota com) algo que o projeto já tem,
 * devolve o path relativo do arquivo existente; senão null. Só vale para alvo AUSENTE.
 *  - `X.ts` × `X/index.*`: o resolvedor do TS/Next prefere o arquivo à pasta, então o
 *    seed novo esconderia o módulo do projeto (caso real: resources.ts × resources/index.ts
 *    → 404 em todas as /api/resources/* do Alô). E o inverso: `X/index.ts` × `X.*`.
 *  - `app/manifest.(ts|js)`: gera /manifest.webmanifest; com `public/manifest.webmanifest`
 *    ou `app/manifest.(json|webmanifest)` o Next quebra (500).
 */
export function findShadow(projectDir, projectPath) {
  const rel = projectPath.replaceAll('\\', '/');
  const ext = extname(rel);
  if (!MODULE_EXTS.includes(ext)) return null;
  const has = (p) => existsSync(join(projectDir, p));
  const stemPath = rel.slice(0, -ext.length);

  if (basename(stemPath) === 'index') {
    const parent = dirname(stemPath);
    if (parent !== '.') {
      const hit = MODULE_EXTS.map((e) => `${parent}${e}`).find(has);
      if (hit) return hit;
    }
  } else {
    const hit = MODULE_EXTS.map((e) => `${stemPath}/index${e}`).find(has);
    if (hit) return hit;
  }

  if (/(^|\/)app\/manifest$/.test(stemPath)) {
    const appDir = dirname(stemPath);
    const candidates = [
      'public/manifest.webmanifest',
      `${appDir}/manifest.json`,
      `${appDir}/manifest.webmanifest`,
      ...MODULE_EXTS.filter((e) => e !== ext).map((e) => `${stemPath}${e}`),
    ];
    const hit = candidates.find(has);
    if (hit) return hit;
  }
  return null;
}

/** Linhas de aviso para `report.shadowed` (update/install imprimem no fim do relatório). */
export function shadowedWarning(report) {
  const list = report?.shadowed ?? [];
  if (!list.length) return [];
  return [
    '',
    `  ⚠ ${list.length} arquivo(s) do core NÃO criado(s) — colidiriam com o que o projeto já tem:`,
    ...list.map((s) => `      ${s.path}  (sombrearia ${s.by})`),
    '    o projeto segue com o dele. Para adotar a versão do core, remova o arquivo do projeto e rode o update de novo.',
  ];
}

/**
 * `package.json` criado do zero pelo install: sem `name`/`version` o `next.config.ts` (que lê
 * `version` para o rodapé) não compila, e o npm reclama. Outros alvos de merge começam vazios.
 */
export function newPackageJsonBase(projectPath, projectDir) {
  if (basename(projectPath) !== 'package.json') return {};
  const name =
    basename(resolve(projectDir))
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^[-._]+|[-._]+$/g, '') || 'app';
  return { name, version: '0.1.0', private: true };
}

export async function materialize(manifestSet, opts) {
  const {
    projectDir,
    direction = 'apply',
    lock,
    prompt,
    dryRun = false,
    reseed = false,
    force = false,
  } = opts;
  const report = {
    applied: [],
    skipped: [],
    conflicts: [],
    merges: [],
    seedDrift: [],
    // { path, by }: alvo ausente que NÃO foi criado porque sombrearia `by` (ver findShadow).
    shadowed: [],
    materializedPaths: manifestSet.entries.map((e) => e.projectPath),
    newLockFragment: { templateFiles: {}, pluginShellFiles: {}, seedFiles: {}, packageOwnedKeys: null },
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

  // Seeds: guarda o hash da versão do template que foi gravada no projeto. Se o
  // arquivo do projeto ainda tem esse hash, ele não foi customizado e pode
  // seguir o template sozinho no próximo update.
  const recordSeed = (entry, absPath) => {
    const h = safeHash(absPath);
    if (h) report.newLockFragment.seedFiles[entry.projectPath] = h;
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
      // Só managed volta pro core. seed e install são do projeto depois de
      // copiados — empurrá-los vazaria customizações locais para o template.
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
    // Alvo ausente que colidiria com algo do projeto: não cria (vale para todos os modos)
    // e não registra hash — no próximo update a checagem roda de novo.
    if (!existsSync(target)) {
      const by = findShadow(projectDir, entry.projectPath);
      if (by) {
        report.skipped.push(entry.projectPath);
        report.shadowed.push({ path: entry.projectPath, by });
        continue;
      }
    }

    if (entry.mode === 'install') {
      // Copiado só quando ausente. NUNCA sobrescrito: ignora `reseed` (all ou
      // lista) e `force`, e não entra em seedDrift — divergir do template é o
      // estado esperado (o projeto customizou a arte/página). "Existe" é pelo
      // nome sem extensão no mesmo diretório (ver existsSameStem).
      if (!existsSameStem(target)) {
        write(source, target);
        report.applied.push(entry.projectPath);
      } else {
        report.skipped.push(entry.projectPath);
      }
      continue;
    }

    if (entry.mode === 'seed') {
      // seed = casca configurável. Regras (o objetivo é customizar cada vez menos):
      //  - ausente no projeto ............................ copia;
      //  - igual ao template ............................. só registra o hash;
      //  - não customizado (hash == o gravado no lock) ... segue o template sozinho;
      //  - customizado ................................... só avisa (seedDrift).
      //    `--reseed all` NÃO sobrescreve customizados; só `--reseed "<path>"`
      //    explícito ou `install --force`.
      const explicit = Array.isArray(reseed) && reseed.includes(entry.projectPath);
      const sourceHash = safeHash(source);
      const currentHash = existsSync(target) ? safeHash(target) : null;
      const lockedHash = lock?.template?.seeds?.[entry.projectPath] ?? null;
      const pristine = currentHash !== null && currentHash === lockedHash;
      if (currentHash === null) {
        write(source, target);
        report.applied.push(entry.projectPath);
        recordSeed(entry, source);
      } else if (currentHash === sourceHash) {
        report.skipped.push(entry.projectPath);
        recordSeed(entry, source);
      } else if (pristine || explicit || force) {
        write(source, target);
        report.applied.push(entry.projectPath);
        recordSeed(entry, source);
      } else {
        report.skipped.push(entry.projectPath);
        report.seedDrift.push(entry.projectPath);
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
    const choice = force
      ? 'sobrescreve'
      : await prompt.choose(`conflito em ${entry.projectPath}`, ['sobrescreve', 'mantém']);
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
        : newPackageJsonBase(merge.projectPath, projectDir);
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
