/**
 * Campos de `extras` que apontam para outros anúncios (local do evento, pontos de venda, artistas).
 * O formulário do evento (plugin forms) grava esses campos em `form_results.answers`; anúncios
 * antigos ou importados podem tê-los em `services.extras`. Mesma precedência do filtro
 * `p_local_refs` da busca (search 0009): vale `extras`; vazio ou ausente → a resposta do formulário.
 */
export const SERVICE_REF_KEYS = ['local_ref', 'pontos_de_venda', 'artistas'] as const;

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** `extras` do anúncio completado com as referências das respostas do formulário — puro, sem consulta. */
export function serviceRefExtras(
  service: { extras?: Record<string, unknown> | null },
  extraFields: { answers?: Record<string, unknown> | null } | null | undefined
): Record<string, unknown> {
  const extras = service.extras ?? {};
  const answers = extraFields?.answers;
  if (!answers) return { ...extras };
  const out: Record<string, unknown> = { ...extras };
  for (const key of SERVICE_REF_KEYS) {
    if (isEmpty(out[key]) && !isEmpty(answers[key])) out[key] = answers[key];
  }
  return out;
}
