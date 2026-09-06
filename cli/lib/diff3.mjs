// Classificação 3-way entre o arquivo vivo no core (live), o registrado no lock
// (locked) e o presente no projeto (current). Decide a ação de materialização.

export function classify(liveHash, lockedHash, currentHash) {
  if (liveHash === lockedHash) return 'noop';
  if (currentHash === null || currentHash === undefined) return 'fast-forward';
  if (currentHash === lockedHash) return 'fast-forward';
  return 'conflict';
}

// Diff textual simples linha-a-linha (' ' igual, '-' só em a, '+' só em b).
export function renderDiff(a, b) {
  const al = a.split('\n'), bl = b.split('\n');
  const out = [];
  const max = Math.max(al.length, bl.length);
  for (let i = 0; i < max; i++) {
    if (al[i] === bl[i]) out.push('  ' + (al[i] ?? ''));
    else {
      if (al[i] !== undefined) out.push('- ' + al[i]);
      if (bl[i] !== undefined) out.push('+ ' + bl[i]);
    }
  }
  return out.join('\n');
}
