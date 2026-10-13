/**
 * Tags genéricas de anúncio — `services.extras.tags` (array JSON de strings). Convenção: minúsculas,
 * kebab-case, com `:` separando um prefixo quando houver (`casas-de-festas`, `local:espaco-x`).
 * Índice GIN parcial: plugin services 0011 (também o btree de `extras.codigo`); filtro na busca: `fn_search_services(p_tags)` (search
 * 0008, semântica ANY). Funções puras, sem I/O — servem a servidor e cliente.
 */

/** Prefixo das tags de local: um local (casa de festas, shopping) e os anúncios que acontecem nele. */
export const LOCAL_TAG_PREFIX = 'local:';

/** Uma tag no formato que a RPC compara (`btrim` + minúsculas); vazia/não-string → `null`. */
export function normalizeServiceTag(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const tag = value.trim().toLowerCase();
  return tag ? tag : null;
}

/** Lista de tags normalizada, sem vazias e sem repetidas (ordem da 1ª ocorrência). Aceita qualquer
 * coisa (o `extras` é jsonb livre): o que não for array vira `[]`. */
export function normalizeServiceTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    const tag = normalizeServiceTag(item);
    if (tag) seen.add(tag);
  }
  return [...seen];
}

/** Tags gravadas no anúncio (`extras.tags`), normalizadas. */
export function serviceTagsOf(service: { extras?: unknown } | null | undefined): string[] {
  const extras = service?.extras;
  if (!extras || typeof extras !== 'object') return [];
  return normalizeServiceTags((extras as { tags?: unknown }).tags);
}

/** Forma aceita de `extras.codigo` — a MESMA regra do trigger do banco (plugin services 0012). */
export const CODIGO_PATTERN = /^[a-z0-9][a-z0-9._-]{0,59}$/;
/** Forma aceita de cada item de `extras.tags` — a MESMA regra do trigger do banco. */
export const TAG_PATTERN = /^[a-z0-9][a-z0-9:._-]{0,59}$/;
/** No máximo quantas tags um anúncio pode ter (trigger do banco). */
export const MAX_SERVICE_TAGS = 10;

function codigoOrNull(value: unknown): string | null {
  const code = normalizeServiceTag(value);
  return code && CODIGO_PATTERN.test(code) ? code : null;
}

/** `extras.codigo` do serviço (normalizado): o código pelo qual outros anúncios o referenciam em
 * `extras.tags`. Ausente, não-string ou fora do formato → `null`. */
export function codigoOf(service: { extras?: unknown } | null | undefined): string | null {
  const extras = service?.extras;
  if (!extras || typeof extras !== 'object') return null;
  return codigoOrNull((extras as { codigo?: unknown }).codigo);
}

/** Tags do serviço que podem ser procuradas como `codigo` de outro serviço, na ordem gravada
 * (normalizadas, sem repetir; formato inválido descartado), no máximo `max`. */
export function codigoCandidates(tags: unknown, max = 3): string[] {
  return normalizeServiceTags(tags)
    .filter((t) => TAG_PATTERN.test(t))
    .slice(0, Math.max(0, max));
}

/** Título padrão do carrossel dos anúncios vinculados a um serviço com `extras.codigo`. */
export const DEFAULT_LINKED_TITLE = 'Vinculados';
/** Tamanho máximo aceito de `extras.vinculosTitulo`. */
export const MAX_LINKED_TITLE_LENGTH = 60;

/** Título do carrossel de vinculados: `extras.vinculosTitulo` aparado se tiver 1..60 caracteres;
 * vazio, longo demais ou não-string → "Vinculados". */
export function linkedRailTitle(service: { extras?: unknown } | null | undefined): string {
  const extras = service?.extras;
  const raw = extras && typeof extras === 'object' ? (extras as { vinculosTitulo?: unknown }).vinculosTitulo : null;
  const title = typeof raw === 'string' ? raw.trim() : '';
  return title && title.length <= MAX_LINKED_TITLE_LENGTH ? title : DEFAULT_LINKED_TITLE;
}

/** `casas-de-festas` → `Casas de festas`; com prefixo (`regiao:centro`) usa só a parte final. */
export function humanizeServiceTag(tag: string): string {
  const last = tag.split(':').filter(Boolean).pop() ?? '';
  const words = last.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}

/** Título do carrossel de uma tag: `local:*` → "Neste local"; demais → "Mais em <tag humanizada>". */
export function serviceTagRailTitle(tag: string): string {
  if (tag.startsWith(LOCAL_TAG_PREFIX)) return 'Neste local';
  const label = humanizeServiceTag(tag);
  return label ? `Mais em ${label}` : 'Mais como este';
}

/** Ordem dos carrosséis por tag na tela de detalhe: tags de local primeiro (o agrupamento mais
 * específico), depois as demais na ordem gravada. */
export function orderTagsForRails(tags: readonly string[]): string[] {
  return [
    ...tags.filter((t) => t.startsWith(LOCAL_TAG_PREFIX)),
    ...tags.filter((t) => !t.startsWith(LOCAL_TAG_PREFIX)),
  ];
}

/** Valores do editor de vínculos (`extras.codigo`, `extras.tags`, `extras.vinculosTitulo`). */
export type ServiceLinksValues = { codigo: string; tags: string[]; vinculosTitulo: string };

/** `extras` -> valores do editor (ausente/inválido vira vazio; sem normalizar formato). */
export function serviceLinksOf(extras: unknown): ServiceLinksValues {
  const e = extras && typeof extras === 'object' ? (extras as Record<string, unknown>) : {};
  return {
    codigo: typeof e.codigo === 'string' ? e.codigo.trim() : '',
    tags: normalizeServiceTags(e.tags),
    vinculosTitulo: typeof e.vinculosTitulo === 'string' ? e.vinculosTitulo.trim() : '',
  };
}

/** Texto digitado (vírgula, ponto e vírgula ou quebra de linha) -> lista de tags normalizada. */
export function parseTagsInput(text: string): string[] {
  return normalizeServiceTags(String(text ?? '').split(/[,;\n]+/));
}

/** Mensagens (pt-BR) por campo; vazio = válido. Mesmas regras do trigger do banco. */
export function validateServiceLinks(values: ServiceLinksValues): Partial<Record<keyof ServiceLinksValues, string>> {
  const errors: Partial<Record<keyof ServiceLinksValues, string>> = {};
  const codigo = values.codigo.trim().toLowerCase();
  if (codigo && !CODIGO_PATTERN.test(codigo)) {
    errors.codigo = 'Use minúsculas, números, ponto, hífen ou sublinhado (até 60 caracteres).';
  }
  if (values.tags.length > MAX_SERVICE_TAGS) {
    errors.tags = `No máximo ${MAX_SERVICE_TAGS} tags.`;
  } else if (values.tags.some((t) => !TAG_PATTERN.test(t))) {
    errors.tags =
      'Cada tag usa minúsculas, números, dois-pontos, ponto, hífen ou sublinhado (até 60 caracteres).';
  }
  if (values.vinculosTitulo.trim().length > MAX_LINKED_TITLE_LENGTH) {
    errors.vinculosTitulo = `Até ${MAX_LINKED_TITLE_LENGTH} caracteres.`;
  }
  return errors;
}

/**
 * Só as chaves de `extras` que MUDARAM em relação ao que foi carregado, prontas para mesclar no
 * `extras` existente (`persistExtras`). Vazio vira `null` (codigo/vinculosTitulo) ou `[]` (tags): o
 * banco trata ambos como "sem valor". Nunca devolve outras chaves.
 */
export function buildServiceLinksPatch(
  current: ServiceLinksValues,
  initial: ServiceLinksValues
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const codigo = current.codigo.trim().toLowerCase();
  if (codigo !== initial.codigo.trim().toLowerCase()) patch.codigo = codigo || null;
  const tags = normalizeServiceTags(current.tags);
  if (JSON.stringify(tags) !== JSON.stringify(normalizeServiceTags(initial.tags))) patch.tags = tags;
  const title = current.vinculosTitulo.trim();
  if (title !== initial.vinculosTitulo.trim()) patch.vinculosTitulo = title || null;
  return patch;
}
