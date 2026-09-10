// Merge de package.json com proveniência. `dependencies`, `devDependencies` e `scripts`
// são todos tratados como Record<string,string>: cada chave é comparada contra o valor
// que o core escreveu por último (prevOwned) para decidir entre atualizar ou registrar conflito.

function mergeRecordSection(target = {}, contrib = {}, prevOwned = {}) {
  const result = { ...target };
  const ownedKeys = {};
  const conflicts = [];
  for (const [key, theirs] of Object.entries(contrib)) {
    const ours = target[key];
    if (ours === undefined) {
      result[key] = theirs;
      ownedKeys[key] = theirs;
    } else if (ours === prevOwned[key] || ours === theirs) {
      result[key] = theirs;
      ownedKeys[key] = theirs;
    } else {
      conflicts.push({ key, ours, theirs });
    }
  }
  return { result, ownedKeys, conflicts };
}

export function mergePackageJson(targetJson, contribJson, prevOwnedKeys) {
  const sections = ['dependencies', 'devDependencies', 'scripts'];
  const result = { ...targetJson };
  const ownedKeys = { dependencies: {}, devDependencies: {}, scripts: {} };
  const conflicts = [];
  for (const section of sections) {
    const prevOwned = prevOwnedKeys[section] ?? {};
    const m = mergeRecordSection(targetJson[section], contribJson[section], prevOwned);
    if (contribJson[section] !== undefined || targetJson[section] !== undefined) {
      result[section] = m.result;
    }
    ownedKeys[section] = m.ownedKeys;
    conflicts.push(...m.conflicts.map((c) => ({ section, ...c })));
  }
  return { result, ownedKeys, conflicts };
}
