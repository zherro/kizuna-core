// Renderiza o banner de divergência entre o lock do projeto e o core vivo.
// Retorna '' quando nada divergiu.

export function renderDivergence({
  lock,
  liveVersion,
  liveSha,
  liveTemplateVersion,
  pluginDeltas = [],
  logText = '',
}) {
  const lockVersion = lock?.kizunaCore?.version ?? null;
  const lockSha = lock?.kizunaCore?.sha ?? null;
  const lockTemplateVersion = lock?.template?.version ?? null;

  const versionChanged = lockVersion !== liveVersion;
  const shaChanged = lockSha !== liveSha;
  const templateChanged = lockTemplateVersion !== liveTemplateVersion;
  const deltas = pluginDeltas.filter((d) => d.from !== d.to);

  if (!versionChanged && !shaChanged && !templateChanged && deltas.length === 0) {
    return '';
  }

  const lines = [];
  lines.push('┌─ kizuna-core divergiu do lock deste projeto');
  if (versionChanged) lines.push(`│  versão:   ${lockVersion} → ${liveVersion}`);
  if (shaChanged) lines.push(`│  sha:      ${lockSha} → ${liveSha}`);
  if (templateChanged) {
    lines.push(`│  template: ${lockTemplateVersion} → ${liveTemplateVersion}`);
  }
  for (const d of deltas) {
    lines.push(`│  plugin ${d.name} ${d.from} → ${d.to}`);
  }
  if (logText) {
    lines.push('│');
    for (const line of logText.split('\n')) lines.push('│  ' + line);
  }
  lines.push('│');
  lines.push('│  rode  kizuna -- update  para aplicar');
  lines.push('└────────────────────────────────────────────');
  return lines.join('\n');
}
