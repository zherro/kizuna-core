/**
 * Helpers puros da variant `"evento"` (detalhe + card): leitura tolerante de `extraFields.answers`,
 * datas "locais" (AAAA-MM-DD / AAAA-MM-DDTHH:MM, sem fuso — nunca deslocam o dia), preço e tags.
 * Sem React, sem fetch: testável isolado. Contrato dos dados: `docs/integracoes/eventos-depara.md`
 * do projeto consumidor.
 */

export const EVENT_TIME_ZONE = 'America/Sao_Paulo';

export type EventAnswers = Record<string, unknown>;

export type EventTicket = {
  titulo: string | null;
  setor: string | null;
  tipo: string | null;
  lote: string | null;
  pessoas: number | null;
  valor: number | null;
  comprar: string | null;
};

export type EventSessionTimes = { abertura: string | null; inicio: string | null; fim: string | null };
export type EventSessionDay = { date: string | null; times: EventSessionTimes[] };

export type EventLocalDate = { y: number; m: number; d: number; hh: number | null; mm: number | null };

export type EventPriceInfo =
  | { kind: 'free'; caption: null; amount: 'Gratuito' }
  | { kind: 'from'; caption: 'A partir de'; amount: string }
  | { kind: 'quote'; caption: null; amount: 'Sob consulta' };

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function objects(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === 'object' && x != null) : [];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dayKey(p: EventLocalDate): string {
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** `AAAA-MM-DD` ou `AAAA-MM-DDTHH:MM` (também aceita espaço no lugar do `T` e segundos) → partes locais. */
export function parseLocalDate(value: unknown): EventLocalDate | null {
  const s = str(value);
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d, hh: m[4] != null ? Number(m[4]) : null, mm: m[5] != null ? Number(m[5]) : null };
}

/** Meio-dia UTC do dia local: formatar com `timeZone: 'UTC'` nunca desloca a data. */
function anchor(p: EventLocalDate): Date {
  return new Date(Date.UTC(p.y, p.m - 1, p.d, 12));
}

/** "sáb., 14 de nov." */
export function formatEventDay(value: unknown): string | null {
  const p = parseLocalDate(value);
  if (!p) return null;
  return anchor(p).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** Bloco de data do card/sidebar: dia ("14") e mês abreviado ("nov"). */
export function eventDateParts(value: unknown): { day: string; month: string } | null {
  const p = parseLocalDate(value);
  if (!p) return null;
  const month = anchor(p)
    .toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })
    .replace('.', '');
  return { day: pad(p.d), month };
}

/** "HH:MM" → "20:00" (aceita "20:00:00"); inválido → null. */
export function formatEventTime(value: unknown): string | null {
  const s = str(value);
  const m = s?.match(/^(\d{1,2}):(\d{2})/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function timeOf(p: EventLocalDate): string | null {
  return p.hh == null || p.mm == null ? null : `${pad(p.hh)}:${pad(p.mm)}`;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/** Valor do fact "Data": "sáb., 14 de nov. · 20:00", com fim no mesmo dia ("às 23:00") ou em outro ("até dom., 15 de nov."). */
export function formatEventWhen(answers: EventAnswers): string | null {
  const start = parseLocalDate(answers.data_inicio);
  if (!start) return null;
  const startTime = timeOf(start);
  const end = parseLocalDate(answers.data_fim);
  const sameDay = end != null && dayKey(end) === dayKey(start);
  let out = formatEventDay(answers.data_inicio) ?? '';
  if (startTime) out += ` · ${startTime}`;
  if (end) {
    if (sameDay) {
      const endTime = timeOf(end);
      if (endTime && endTime !== startTime) out += ` às ${endTime}`;
    } else {
      out += ` até ${formatEventDay(answers.data_fim)}`;
    }
  }
  return out || null;
}

/** Classificação indicativa como veio ("Livre", "14 anos"). */
export function eventClassification(answers: EventAnswers): string | null {
  return str(answers.classificacao_indicativa);
}

export function isFreeEvent(answers: EventAnswers): boolean {
  return answers.gratuito === true;
}

/** Lista de objetos `{ nome }` → nomes (artistas, pontos de venda). */
export function parseNames(raw: unknown): string[] {
  return objects(raw)
    .map((a) => str(a.nome))
    .filter((n): n is string => n != null);
}

/** Ponto de venda cru: `nome` (código do lugar ou texto livre) e `link` http(s) de compra, se houver. */
export type EventSalePoint = { nome: string; link: string | null };

/** `pontos_de_venda`: itens `{ nome, link? }` ou strings puras (formato antigo); sem nome, o item sai. */
export function parseSalePoints(raw: unknown): EventSalePoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): EventSalePoint | null => {
      if (typeof item === 'string') {
        const nome = str(item);
        return nome ? { nome, link: null } : null;
      }
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const nome = str(o.nome);
        return nome ? { nome, link: safeHttpUrl(o.link) } : null;
      }
      return null;
    })
    .filter((p): p is EventSalePoint => p != null);
}

export type TicketDisplay = {
  /** Nome do ingresso: o setor (PISTA, CAMAROTE…), senão o título/tipo. */
  name: string;
  /** O que o ingresso inclui/qual a modalidade (Inteira, "10 copos + whisky"…), sem repetir o nome. */
  detail: string | null;
  /** Lote ("1º lote"), quando não está no detalhe. */
  lote: string | null;
  /** Lotação ("5 pessoas"), quando não está no detalhe. */
  people: string | null;
};

const norm = (v: string) => v.trim().toLowerCase();

/**
 * Separa o que o importador junta no `titulo` ("SETOR — descrição (N pessoas)"): nome = setor,
 * detalhe = tipo (ou o título sem o prefixo do setor e sem o "(N pessoas)" final), mais lote e
 * lotação à parte. Nada se repete entre nome, detalhe e etiquetas.
 */
export function ticketDisplay(t: EventTicket): TicketDisplay {
  const name = t.setor ?? t.titulo ?? t.tipo ?? 'Ingresso';
  let detail = t.tipo;
  if (!detail && t.titulo) {
    let rest = t.titulo;
    // só tira o setor do começo quando vem seguido de separador ("CAMAROTE — …"); "Camarote para
    // quatro" continua inteiro
    if (t.setor && norm(rest).startsWith(norm(t.setor))) {
      const after = rest.slice(t.setor.length);
      if (/^\s*([—–\-:|]|\(|$)/.test(after)) rest = after.replace(/^\s*[—–\-:|]\s*/, '');
    }
    rest = rest.replace(/\(\s*\d+\s*pessoas?\s*\)\s*$/i, '').trim();
    detail = rest || null;
  }
  if (detail && norm(detail) === norm(name)) detail = null;
  const notInDetail = (v: string | null) => (v && !(detail && norm(detail).includes(norm(v))) ? v : null);
  const people = t.pessoas != null ? `${t.pessoas} ${t.pessoas === 1 ? 'pessoa' : 'pessoas'}` : null;
  return { name, detail, lote: notInDetail(t.lote), people: notInDetail(people) };
}

/** Ingressos do maior para o menor valor (sem valor por último; empate mantém a ordem do formulário). */
export function parseTickets(raw: unknown): EventTicket[] {
  const tickets = objects(raw)
    .map((t) => ({
      titulo: str(t.titulo),
      setor: str(t.setor),
      tipo: str(t.tipo),
      lote: str(t.lote),
      pessoas: num(t.pessoas),
      valor: num(t.valor),
      comprar: str(t.comprar),
    }))
    .filter((t) => t.titulo || t.setor || t.tipo || t.valor != null);
  return tickets
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (b.t.valor ?? -Infinity) - (a.t.valor ?? -Infinity) || a.i - b.i)
    .map(({ t }) => t);
}

/** Sessões agrupadas por dia (ordenadas); horários de cada dia ordenados por início. Sem `data`, cai em `fallbackDate` (data_inicio). */
export function parseSessionDays(raw: unknown, fallbackDate?: unknown): EventSessionDay[] {
  const fb = parseLocalDate(fallbackDate);
  const fallbackKey = fb ? dayKey(fb) : null;
  const byDay = new Map<string | null, EventSessionTimes[]>();
  for (const s of objects(raw)) {
    const p = parseLocalDate(s.data);
    const key = p ? dayKey(p) : fallbackKey;
    const times: EventSessionTimes = {
      abertura: formatEventTime(s.abertura_portoes),
      inicio: formatEventTime(s.hora_inicio),
      fim: formatEventTime(s.hora_fim),
    };
    if (!times.abertura && !times.inicio && !times.fim && !p) continue;
    byDay.set(key, [...(byDay.get(key) ?? []), times]);
  }
  return [...byDay.entries()]
    .map(([date, times]) => ({
      date,
      times: [...times].sort((a, b) => (a.inicio ?? a.abertura ?? '').localeCompare(b.inicio ?? b.abertura ?? '')),
    }))
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
}

/** Preço de entrada: gratuito → "Gratuito"; senão o menor entre `startingPrice` (>0) e ingressos pagos → "A partir de"; senão "Sob consulta". */
export function eventPriceInfo(input: {
  free?: boolean;
  startingPrice?: number | null;
  priceUnit?: string | null;
  tickets?: EventTicket[];
}): EventPriceInfo {
  if (input.free) return { kind: 'free', caption: null, amount: 'Gratuito' };
  const paid = (input.tickets ?? []).map((t) => t.valor).filter((v): v is number => v != null && v > 0);
  const base = input.priceUnit === 'quote' ? null : input.startingPrice;
  const candidates = [...(base != null && base > 0 ? [base] : []), ...paid];
  if (candidates.length === 0) return { kind: 'quote', caption: null, amount: 'Sob consulta' };
  return { kind: 'from', caption: 'A partir de', amount: formatBRL(Math.min(...candidates)) };
}

/** `AAAA-MM-DDTHH:MM` de "agora" no fuso de São Paulo (comparável por string com datas locais do evento). */
export function nowLocalString(now: number | Date = Date.now()): string {
  const s = new Intl.DateTimeFormat('sv-SE', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return s.replace(' ', 'T');
}

function normalizeLocal(p: EventLocalDate, fallbackTime: string | null): string {
  return `${dayKey(p)}T${timeOf(p) ?? fallbackTime ?? '23:59'}`;
}

/** Último instante conhecido do evento (data_fim, sessões ou data_inicio), `AAAA-MM-DDTHH:MM` local. Sem horário = fim do dia. */
export function eventEnd(answers: EventAnswers): string | null {
  const ends: string[] = [];
  const fim = parseLocalDate(answers.data_fim);
  if (fim) ends.push(normalizeLocal(fim, null));
  const inicio = parseLocalDate(answers.data_inicio);
  if (inicio) ends.push(normalizeLocal(inicio, null));
  for (const s of objects(answers.sessoes)) {
    const p = parseLocalDate(s.data);
    if (!p) continue;
    ends.push(normalizeLocal(p, formatEventTime(s.hora_fim) ?? formatEventTime(s.hora_inicio)));
  }
  if (ends.length === 0) return null;
  return ends.sort()[ends.length - 1];
}

/** Evento já terminou? Usa o fim conhecido; sem datas, cai em `expiresAt` (ISO UTC). */
export function isEventOver(answers: EventAnswers, expiresAt?: string | null, now: number = Date.now()): boolean {
  const end = eventEnd(answers);
  if (end) return end < nowLocalString(now);
  if (expiresAt) {
    const t = new Date(expiresAt).getTime();
    return Number.isFinite(t) && t < now;
  }
  return false;
}

/** Tags sob o título: classificação + "Gratuito". */
export function eventoHeaderTags(extraFields: { answers?: Record<string, unknown> } | null | undefined): string[] {
  const answers = extraFields?.answers ?? {};
  const tags: string[] = [];
  const cls = eventClassification(answers);
  if (cls) tags.push(cls);
  if (isFreeEvent(answers)) tags.push('Gratuito');
  return tags;
}

export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** "Local — rua, bairro, cidade/UF" → { name, rest }; sem separador, tudo vira `name`. */
export function splitEventAddress(address: string): { name: string; rest: string | null } {
  const i = address.indexOf(' — ');
  if (i < 0) return { name: address.trim(), rest: null };
  const rest = address.slice(i + 3).trim();
  return { name: address.slice(0, i).trim(), rest: rest || null };
}

/**
 * Cidade do endereço do evento ("Nome — rua, número, bairro, Cidade/UF" → "Cidade/UF"): o último
 * trecho separado por vírgula, só se terminar em "/UF". Fora desse formato → null (nunca se supõe).
 */
export function eventCityFromAddress(address: unknown): string | null {
  const s = str(address);
  if (!s) return null;
  const last = s.split(',').pop()?.trim() ?? '';
  const m = last.match(/^(.*\S)\s*\/\s*([A-Za-z]{2})$/);
  return m ? `${m[1]}/${m[2].toUpperCase()}` : null;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** wa.me exige DDI: números BR de 10/11 dígitos ganham "55". */
export function whatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const full = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}`;
}

/** Só aceita http(s) em links vindos de dado externo. */
export function safeHttpUrl(value: unknown): string | null {
  const s = str(value);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Texto cru de um campo de contato/realizador/link. */
export function textField(value: unknown): string | null {
  return str(value);
}
