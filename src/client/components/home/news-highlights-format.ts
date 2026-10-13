/**
 * Helpers puros do bloco `NewsHighlights` (sem JSX, sem `'use client'`) — o loader do projeto
 * consumidor pode importar os tipos e o parser de data daqui sem puxar o componente de cliente.
 */

/** Uma notícia já pronta para desenhar. Quem chama monta (loader do projeto); o bloco só exibe. */
export type NewsHighlightItem = {
  href: string;
  title: string;
  /** Chapéu (ex.: "Política", "Esportes") — a subcategoria da notícia, ou a categoria. */
  kicker: string;
  summary?: string;
  image?: string | null;
  /** Instante de publicação (ISO com fuso, ou `Date`). Sem ele a linha não mostra tempo. */
  publishedAt?: string | Date | null;
};

/** Fuso padrão das datas exibidas — o mesmo dos outros blocos do core (eventos, cinema). */
export const NEWS_DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

/** Normaliza o texto do chapéu pra cor não mudar por acento, caixa ou espaço sobrando. */
function normalizeKicker(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Matiz OKLCH (0-345, de 15 em 15) determinística pelo texto do chapéu: "Política" tem sempre a
 * mesma cor em qualquer render/servidor. 24 faixas bem separadas em vez de 360 vizinhas parecidas.
 */
export function kickerHue(text: string): number {
  const key = normalizeKicker(text);
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return (hash % 24) * 15;
}

export type KickerTone = {
  hue: number;
  /** Cor do TEXTO do chapéu: o matiz misturado com `--foreground`, então escurece no tema claro e
   * clareia no escuro sozinho (contraste legível nos dois, sem variante `dark:`). */
  text: string;
  /** Cor cheia (marcador quadrado do chapéu). */
  solid: string;
  /** Fundo suave do matiz sobre `--card` (imagem ausente). */
  wash: string;
};

export function kickerTone(text: string): KickerTone {
  const hue = kickerHue(text);
  return {
    hue,
    text: `color-mix(in oklch, oklch(0.62 0.19 ${hue}) 70%, var(--foreground))`,
    solid: `oklch(0.64 0.19 ${hue})`,
    wash: `color-mix(in oklch, oklch(0.7 0.13 ${hue}) 24%, var(--card))`,
  };
}

const ISO_WITH_ZONE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;
const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/** Diferença (ms) entre o relógio de `timeZone` e UTC no instante `utcMs`. */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Converte o valor de publicação em `Date`. Aceita `Date`, ISO com fuso (`...Z`, `-04:00`) e data
 * local sem fuso (`AAAA-MM-DD` ou `AAAA-MM-DDTHH:MM`, como grava o campo `datetime` do
 * formulário) — esta é lida como relógio de `timeZone`. Inválido/vazio → `null`.
 */
export function parseNewsDate(
  value: string | Date | null | undefined,
  timeZone: string = NEWS_DEFAULT_TIME_ZONE
): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  if (ISO_WITH_ZONE.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = LOCAL_DATETIME.exec(raw);
  if (!m) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00'] = m;
  const wall = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  if (Number.isNaN(wall)) return null;
  // duas passadas: acerta o offset mesmo perto de troca de horário de verão
  let utc = wall - zoneOffsetMs(wall, timeZone);
  utc = wall - zoneOffsetMs(utc, timeZone);
  return new Date(utc);
}

const stripDot = (s: string) => s.replace(/\.$/, '');

function dayMonthParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    day: get('day'),
    month: stripDot(get('month')),
    year: get('year'),
    time: `${get('hour')}:${get('minute')}`,
  };
}

/**
 * Data absoluta curta, determinística (só depende da data e do fuso — nunca de "agora"): é o texto
 * do servidor e da hidratação. Ex.: "13 out, 14:30".
 */
export function formatNewsAbsolute(date: Date, timeZone: string = NEWS_DEFAULT_TIME_ZONE): string {
  const p = dayMonthParts(date, timeZone);
  return `${p.day} ${p.month}, ${p.time}`;
}

/** Data completa pro `title` do `<time>`. Ex.: "13 de outubro de 2026, 14:30". */
export function formatNewsFull(date: Date, timeZone: string = NEWS_DEFAULT_TIME_ZONE): string {
  const day = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return `${day}, ${dayMonthParts(date, timeZone).time}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Tempo relativo em pt-BR: "agora", "há 12 min", "há 3 h", "ontem", "há 4 dias"; uma semana ou
 * mais (ou data no futuro) cai pra data curta ("13 out", com ano se for de outro ano).
 */
export function formatNewsRelative(
  date: Date,
  now: number | Date,
  timeZone: string = NEWS_DEFAULT_TIME_ZONE
): string {
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const diff = nowMs - date.getTime();
  if (diff >= -MINUTE && diff < MINUTE) return 'agora';
  if (diff > 0 && diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`;
  if (diff > 0 && diff < DAY) return `há ${Math.floor(diff / HOUR)} h`;
  if (diff > 0 && diff < 2 * DAY) return 'ontem';
  if (diff > 0 && diff < 7 * DAY) return `há ${Math.floor(diff / DAY)} dias`;
  const p = dayMonthParts(date, timeZone);
  const nowYear = dayMonthParts(new Date(nowMs), timeZone).year;
  return p.year === nowYear ? `${p.day} ${p.month}` : `${p.day} ${p.month} ${p.year}`;
}
