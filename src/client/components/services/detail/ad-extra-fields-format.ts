/**
 * Formatação pura das respostas dinâmicas de um anúncio (`AdExtraFields`): datas/horas locais pt-BR
 * (sem fuso — nunca deslocam o dia), moeda, labels de opção, links e a montagem dos "blocos" de
 * leitura (campos curtos, listas, cabeçalhos do schema). Sem React: testável isolado. Genérico por
 * categoria — nada aqui conhece slug ou chave de um formulário específico.
 */
import {
  NON_VALUE_TYPES,
  fieldKey,
  resolveItemFields,
  type FormField,
  type FormSchema,
  type FormValues,
} from '../../form-builder/types';
import { isFieldVisible } from '../../form-builder/validate';
import { formatBRL, formatEventTime, parseLocalDate, safeHttpUrl, telHref } from './evento-helpers';

const ISO_LOCAL = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?$/;
const TRAILING_GLYPHS = /\s*[❯›»>→]+\s*$/u;

function trimmed(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stripDot(s: string): string {
  return s.replace(/\.$/, '');
}

/** "sáb, 17 de out" (ano só quando difere do atual). `value` = AAAA-MM-DD ou AAAA-MM-DDTHH:MM. */
export function formatDayLabel(value: unknown, now: Date = new Date()): string | null {
  const p = parseLocalDate(value);
  if (!p) return null;
  const anchor = new Date(Date.UTC(p.y, p.m - 1, p.d, 12));
  const weekday = stripDot(anchor.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }));
  const month = stripDot(anchor.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }));
  const year = p.y === now.getFullYear() ? '' : ` de ${p.y}`;
  return `${weekday}, ${p.d} de ${month}${year}`;
}

/** Data (+ hora, quando houver) → "sáb, 17 de out · 20:00". */
export function formatDateTimeLabel(value: unknown, now: Date = new Date()): string | null {
  const day = formatDayLabel(value, now);
  if (!day) return null;
  const p = parseLocalDate(value);
  if (p && p.hh != null && p.mm != null) {
    return `${day} · ${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')}`;
  }
  return day;
}

/** "ola-mundo-x" → "Ola Mundo X" — só pra valor que é visivelmente um slug (2+ hifens, minúsculo). */
export function humanizeSlug(value: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+){2,}$/.test(value)) return value;
  return value
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Texto de exibição de um link: "host/caminho" sem protocolo nem "www.". */
export function linkLabel(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
    return `${u.host.replace(/^www\./, '')}${path}`;
  } catch {
    return url;
  }
}

export type FormattedValue = {
  text: string;
  /** Presente quando o valor é um link (http/https, tel:, mailto:). */
  href?: string;
  /** Link externo (abre em aba nova). */
  external?: boolean;
};

function optionLabel(field: FormField, value: unknown): string {
  const raw = String(value);
  return field.options?.find((o) => o.value === raw)?.label ?? raw;
}

/**
 * Valor de UM campo escalar → texto (e link). `null` = "sem valor" (vazio, `false`, inválido): quem
 * chama NÃO deve exibir o campo.
 */
export function formatFieldValue(
  field: Pick<FormField, 'type' | 'options'>,
  value: unknown,
  now: Date = new Date()
): FormattedValue | null {
  if (value == null || value === '' || value === false) return null;
  if (value === true) return { text: 'Sim' };
  if (Array.isArray(value)) {
    const parts = value
      .map((v) => formatFieldValue(field, v, now)?.text)
      .filter((t): t is string => Boolean(t));
    return parts.length ? { text: parts.join(', ') } : null;
  }
  if (typeof value === 'object') return null;

  const f = field as FormField;
  switch (field.type) {
    case 'date':
    case 'datetime': {
      const text = formatDateTimeLabel(value, now);
      return text ? { text } : trimmed(value) ? { text: String(value).trim() } : null;
    }
    case 'time': {
      const text = formatEventTime(value);
      return text ? { text } : null;
    }
    case 'currency': {
      const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
      if (!Number.isFinite(n)) return trimmed(value) ? { text: String(value).trim() } : null;
      return { text: n > 0 ? formatBRL(n) : 'Gratuito' };
    }
    case 'number':
    case 'decimal': {
      const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
      if (!Number.isFinite(n)) return trimmed(value) ? { text: String(value).trim() } : null;
      return { text: new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 }).format(n) };
    }
    case 'select':
    case 'radio':
    case 'multiselect':
      return { text: optionLabel(f, value) };
    case 'url': {
      const url = safeHttpUrl(value);
      return url ? { text: linkLabel(url), href: url, external: true } : null;
    }
    case 'email': {
      const e = trimmed(value);
      return e ? { text: e, href: `mailto:${e}` } : null;
    }
    case 'phone': {
      const t = trimmed(value);
      return t ? { text: t, href: telHref(t) } : null;
    }
    default:
      break;
  }

  const s = typeof value === 'string' ? value.trim() : String(value);
  if (!s) return null;
  if (ISO_LOCAL.test(s)) {
    const text = formatDateTimeLabel(s, now);
    if (text) return { text };
  }
  const url = safeHttpUrl(s);
  if (url && /^https?:\/\//i.test(s)) return { text: linkLabel(url), href: url, external: true };
  const clean = s.replace(TRAILING_GLYPHS, '').trim();
  if (!clean) return null;
  return { text: field.type === 'text' ? humanizeSlug(clean) : clean };
}

// ---------------------------------------------------------------------------------------------
// Blocos de leitura
// ---------------------------------------------------------------------------------------------

export type ExtraFieldItem = {
  key: string;
  label: string;
  value: FormattedValue;
  /** Ocupa a linha inteira (texto longo / textarea). */
  wide: boolean;
};

export type ExtraListEntry = {
  /** Linha principal: dia formatado (sessão) ou o primeiro texto (ingresso). */
  lead: string | null;
  /** Valor em destaque à direita (campo `currency`). */
  amount: string | null;
  /** Textos curtos sob o lead, sem rótulo (setor, tipo, lote). */
  meta: string[];
  /** Pares "rótulo valor" (horários, quantidades). */
  facts: { label: string; value: FormattedValue }[];
  /** Texto longo (textarea) do item. */
  note: string | null;
};

export type ExtraBlock =
  | { kind: 'heading'; key: string; text: string }
  | { kind: 'fields'; key: string; items: ExtraFieldItem[] }
  | { kind: 'chips'; key: string; label: string; items: string[] }
  | { kind: 'entries'; key: string; label: string; entries: ExtraListEntry[] };

const LONG_TEXT = 70;

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Um item de lista (`{ data, hora_inicio… }`) → entrada legível, guiada pelo TIPO dos sub-campos. */
export function buildListEntry(
  subFields: FormField[],
  item: Record<string, unknown>,
  now: Date = new Date()
): ExtraListEntry | null {
  const entry: ExtraListEntry = { lead: null, amount: null, meta: [], facts: [], note: null };
  const leadFromDate = subFields.some(
    (f) => (f.type === 'date' || f.type === 'datetime') && item[fieldKey(f)] != null && item[fieldKey(f)] !== ''
  );

  for (const sub of subFields) {
    if (!isFieldVisible(sub, item)) continue;
    const formatted = formatFieldValue(sub, item[fieldKey(sub)], now);
    if (!formatted) continue;
    // "Comprar ❯" sob o rótulo "Comprar" não diz nada além do próprio rótulo.
    if (sub.type === 'text' && normalize(formatted.text) === normalize(sub.label ?? '')) continue;

    if (sub.type === 'currency' && entry.amount == null) {
      entry.amount = formatted.text;
    } else if ((sub.type === 'date' || sub.type === 'datetime') && entry.lead == null) {
      entry.lead = formatted.text;
    } else if (sub.type === 'textarea') {
      entry.note = formatted.text;
    } else if (!leadFromDate && entry.lead == null && (sub.type === 'text' || sub.type === 'select' || sub.type === 'radio')) {
      entry.lead = formatted.text;
    } else if (sub.type === 'text' || sub.type === 'select' || sub.type === 'radio' || sub.type === 'multiselect') {
      entry.meta.push(formatted.text);
    } else {
      entry.facts.push({ label: sub.label || fieldKey(sub), value: formatted });
    }
  }

  const empty =
    entry.lead == null && entry.amount == null && entry.meta.length === 0 && entry.facts.length === 0 && !entry.note;
  return empty ? null : entry;
}

/** Itens com campo de data (sessões) saem em ordem cronológica; sem data, a ordem de entrada. */
function sortByDate(subs: FormField[], items: unknown[]): unknown[] {
  const dateKey = subs.find((s) => s.type === 'date' || s.type === 'datetime');
  if (!dateKey) return items;
  const k = fieldKey(dateKey);
  const stamp = (it: unknown): string => {
    const v = it && typeof it === 'object' ? (it as Record<string, unknown>)[k] : null;
    return typeof v === 'string' && v ? v : '9999';
  };
  return items
    .map((it, i) => ({ it, i, d: stamp(it) }))
    .sort((a, b) => a.d.localeCompare(b.d) || a.i - b.i)
    .map((x) => x.it);
}

/** Schema + respostas → blocos na ordem do schema; vazio e oculto nunca entram. */
export function buildExtraFieldBlocks(
  schema: FormSchema,
  answers: FormValues,
  now: Date = new Date()
): ExtraBlock[] {
  const blocks: ExtraBlock[] = [];
  let scalars: ExtraFieldItem[] = [];
  let scalarsKey = '';
  const flush = () => {
    if (scalars.length) blocks.push({ kind: 'fields', key: scalarsKey, items: scalars });
    scalars = [];
  };

  for (const field of schema.fields ?? []) {
    if (field.type === 'hidden') continue;
    if (field.type === 'heading') {
      flush();
      if (field.label?.trim() && isFieldVisible(field, answers)) {
        blocks.push({ kind: 'heading', key: field.id, text: field.label.trim() });
      }
      continue;
    }
    if (NON_VALUE_TYPES.has(field.type)) continue;
    if (!isFieldVisible(field, answers)) continue;

    const key = fieldKey(field);
    const label = field.label?.trim() || key;

    if (field.type === 'list') {
      flush();
      const subs = resolveItemFields(field).filter((s) => !s.behavior.hidden && s.type !== 'hidden');
      const rawItems = sortByDate(subs, Array.isArray(answers[key]) ? (answers[key] as unknown[]) : []);
      const entries = rawItems
        .filter((it): it is Record<string, unknown> => !!it && typeof it === 'object' && !Array.isArray(it))
        .map((it) => buildListEntry(subs, it, now))
        .filter((e): e is ExtraListEntry => e !== null);
      if (entries.length === 0) continue;
      // Lista de um campo só (artistas, pontos de venda): fichas curtas, não cartões.
      const onlyLeads = entries.every(
        (e) => e.lead != null && e.amount == null && e.meta.length === 0 && e.facts.length === 0 && !e.note
      );
      if (onlyLeads) {
        blocks.push({ kind: 'chips', key, label, items: entries.map((e) => e.lead as string) });
      } else {
        blocks.push({ kind: 'entries', key, label, entries });
      }
      continue;
    }

    const value = formatFieldValue(field, answers[key], now);
    if (!value) continue;
    if (scalars.length === 0) scalarsKey = key;
    scalars.push({
      key,
      label,
      value,
      wide: field.type === 'textarea' || value.text.length > LONG_TEXT,
    });
  }
  flush();

  // Cabeçalho do schema sem nada embaixo (ou seguido de outro cabeçalho) some.
  return blocks.filter((b, i) => b.kind !== 'heading' || (blocks[i + 1] && blocks[i + 1].kind !== 'heading'));
}
