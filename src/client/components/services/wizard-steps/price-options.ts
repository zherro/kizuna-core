import { PRICE_UNIT_LABEL } from '../service-labels';
import { SERVICE_PRICE_UNIT_OPTIONS } from '../service-type';
import { EVENT_EXPIRES_TIME_ZONE } from '../detail/evento-helpers';

export type PriceOptionConfig = {
  /** O que vai pro banco (`price_unit`, enum — não muda). Um dos valores de `PRICE_UNIT_LABEL`. */
  value: string;
  /** Chave em `messages.wizard.price.options` dos textos desta opção (`title`, `description`).
   * Padrão: o próprio `value`. Serve pra mesma unidade ter textos diferentes por
   * grupo/categoria (ex.: tipos de pagamento de evento). */
  textKey?: string;
};

/** Perfil do passo `price` (ver `StepProfiles`). */
export type PriceProfile = {
  /** Formas de cobrança na ordem da tela. */
  options: PriceOptionConfig[];
  /** Forma de cobrança já selecionada ao abrir o passo (um `value` de `options`). Sem ele (e
   * sem `defaultByCategory`), nada vem selecionado e o passo exige escolher uma. */
  defaultValue?: string;
  /** Usa o padrão por categoria do core (`defaultPriceUnitForCategory`) quando não há
   * `defaultValue`. É o que o padrão do core faz. */
  defaultByCategory?: boolean;
  /** Mostra o campo "valor a partir de". Padrão `true`. */
  startingPrice?: boolean;
  /** Tabela de preços (salva em `services.extras.priceTable`). `true` = todos os campos;
   * objeto = escolhe os campos e o limite de linhas. Padrão: sem tabela. */
  priceTable?: boolean | PriceTableConfig;
};

export type ExpiresAtMode = 'hidden' | 'optional' | 'required';

/**
 * Modo da validade do anúncio (`services.expires_at`, coluna do service) num perfil: `hidden`
 * (ausente/`false`), `optional` (`true`/`'optional'`) ou `required`. Quem hospeda o campo na tela é
 * o passo `dynamic-form` (`stepProfiles["dynamic-form"].expiresAt`); o passo `price` não o tem mais.
 */
export function resolveExpiresAtMode(profile: {
  expiresAt?: false | true | 'optional' | 'required';
}): ExpiresAtMode {
  const v = profile.expiresAt;
  if (v === 'required') return 'required';
  if (v === true || v === 'optional') return 'optional';
  return 'hidden';
}

/** Campos de cada linha da tabela. O título aparece sempre; os demais são opcionais. */
export const PRICE_TABLE_FIELDS = ['description', 'amount', 'link'] as const;
export type PriceTableField = (typeof PRICE_TABLE_FIELDS)[number];

export type PriceTableConfig = {
  /** Campos mostrados além do título. Padrão: todos (`description`, `amount`, `link`). */
  fields?: PriceTableField[];
  /** Máximo de linhas. Sem limite por padrão. */
  maxRows?: number;
};

/** Resolve `priceTable` do perfil: `null` = sem tabela. */
export function resolvePriceTable(
  profile: PriceProfile
): { fields: PriceTableField[]; maxRows?: number } | null {
  const cfg = profile.priceTable;
  if (!cfg) return null;
  if (cfg === true) return { fields: [...PRICE_TABLE_FIELDS] };
  return { fields: cfg.fields ?? [...PRICE_TABLE_FIELDS], maxRows: cfg.maxRows };
}

/** Padrão do core — todas as formas de cobrança do wizard + "a partir de", sem tabela. */
export const DEFAULT_PRICE_PROFILE: PriceProfile = {
  options: SERVICE_PRICE_UNIT_OPTIONS.map((option) => ({ value: option.value })),
  defaultByCategory: true,
  startingPrice: true,
  priceTable: false,
};

export function validatePriceProfile(profile: PriceProfile) {
  const options = profile?.options;
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error('stepProfiles.price: informe ao menos uma opção em "options"');
  }
  const seen = new Set<string>();
  for (const option of options) {
    if (!option?.value || !(option.value in PRICE_UNIT_LABEL)) {
      throw new Error(
        `stepProfiles.price: value inválido "${String(option?.value)}" (use ${Object.keys(PRICE_UNIT_LABEL).join(', ')})`
      );
    }
    if (seen.has(option.value)) {
      throw new Error(`stepProfiles.price: value repetido "${option.value}"`);
    }
    seen.add(option.value);
  }
  if (profile.defaultValue !== undefined && !seen.has(profile.defaultValue)) {
    throw new Error(
      `stepProfiles.price: defaultValue "${String(profile.defaultValue)}" não está em "options"`
    );
  }
  if ('expiresAt' in (profile as object)) {
    throw new Error(
      'stepProfiles.price: "expiresAt" saiu do passo de preço; use stepProfiles["dynamic-form"].expiresAt (a validade continua sendo o campo expires_at do service)'
    );
  }
  if (typeof profile.priceTable === 'object' && profile.priceTable !== null) {
    const { fields, maxRows } = profile.priceTable;
    for (const field of fields ?? []) {
      if (!PRICE_TABLE_FIELDS.includes(field)) {
        throw new Error(
          `stepProfiles.price: priceTable.fields inválido "${String(field)}" (use ${PRICE_TABLE_FIELDS.join(', ')})`
        );
      }
    }
    if (maxRows !== undefined && !(Number.isInteger(maxRows) && maxRows > 0)) {
      throw new Error('stepProfiles.price: priceTable.maxRows deve ser um inteiro > 0');
    }
  }
}

export type PriceTableRow = {
  id: string;
  title: string;
  description: string;
  amount: number;
  /** "A combinar": o valor não é fixado (fica 0 e o campo é desabilitado). */
  toAgree?: boolean;
  /** Botão de link: texto + URL. Só vale com os dois (a URL precisa ser http/https). */
  linkLabel: string;
  linkUrl: string;
};

const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);

/** Linhas válidas pra gravar: descarta as sem título e o botão de link incompleto/inválido. */
export function cleanPriceTable(rows: PriceTableRow[] | undefined): PriceTableRow[] {
  return (rows ?? [])
    .map((row) => {
      const linkLabel = (row.linkLabel ?? '').trim();
      const linkUrl = (row.linkUrl ?? '').trim();
      const link = linkLabel && isHttpUrl(linkUrl);
      const toAgree = Boolean(row.toAgree);
      return {
        id: row.id,
        title: (row.title ?? '').trim(),
        description: (row.description ?? '').trim(),
        amount: toAgree ? 0 : row.amount || 0,
        toAgree,
        linkLabel: link ? linkLabel : '',
        linkUrl: link ? linkUrl : '',
      };
    })
    .filter((row) => row.title.length > 0);
}

/**
 * Fuso das datas do campo "válido até"/"Acontece em": o MESMO em que o card e o detalhe leem o
 * `expires_at` (`EVENT_EXPIRES_TIME_ZONE`, Cuiabá). Nunca o fuso do navegador: quem preenche em
 * Brasília (UTC-3) gravaria 22:00 como 21:00 de Cuiabá.
 */
export const EXPIRES_AT_TIME_ZONE = EVENT_EXPIRES_TIME_ZONE;

type WallTime = { y: number; mo: number; d: number; h: number; mi: number; s: number; ms: number };

/** Relógio de parede de um instante no fuso `timeZone`. */
function wallTimeIn(ms: number, timeZone: string): WallTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ms);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    y: get('year'),
    mo: get('month'),
    d: get('day'),
    h: get('hour'),
    mi: get('minute'),
    s: get('second'),
    ms: ((ms % 1000) + 1000) % 1000,
  };
}

/** Relógio de parede em `timeZone` → instante UTC (ms). Data que o calendário "corrige" (31/02) → null. */
function zonedToUtc(w: WallTime, timeZone: string): number | null {
  const asUtc = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s, w.ms);
  const check = new Date(asUtc);
  if (check.getUTCFullYear() !== w.y || check.getUTCMonth() !== w.mo - 1 || check.getUTCDate() !== w.d) return null;
  // duas passadas: o deslocamento do fuso pode mudar entre o palpite e o instante certo (horário de verão)
  let t = asUtc;
  for (let i = 0; i < 2; i += 1) {
    const seen = wallTimeIn(t, timeZone);
    const offset = Date.UTC(seen.y, seen.mo - 1, seen.d, seen.h, seen.mi, seen.s, seen.ms) - t;
    t = asUtc - offset;
  }
  return t;
}

/** "YYYY-MM-DD" (input date) → fim desse dia no fuso do evento, em ISO UTC. Data inválida → `null`. */
export function endOfLocalDayToIso(date: string, timeZone: string = EXPIRES_AT_TIME_ZONE): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const t = zonedToUtc(
    { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]), h: 23, mi: 59, s: 59, ms: 999 },
    timeZone
  );
  return t === null ? null : new Date(t).toISOString();
}

/**
 * "YYYY-MM-DD" + "HH:MM" (inputs date e time) → esse horário no fuso do evento (segundos e ms
 * zerados) em ISO UTC. Entrada inválida ou data que o calendário "corrige" (ex.: 2026-02-31, 25:00) → `null`.
 */
export function localDateTimeToIso(
  date: string,
  time: string,
  timeZone: string = EXPIRES_AT_TIME_ZONE
): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!d || !t) return null;
  const ms = zonedToUtc(
    { y: Number(d[1]), mo: Number(d[2]), d: Number(d[3]), h: Number(t[1]), mi: Number(t[2]), s: 0, ms: 0 },
    timeZone
  );
  return ms === null ? null : new Date(ms).toISOString();
}

/**
 * ISO → "HH:MM" no fuso do evento (o que o input time mostra). Vazio quando não há hora: valor vazio,
 * inválido ou o fim do dia (23:59:59.999), que é o que se grava quando só a data foi escolhida.
 */
export function isoToLocalTime(iso: string | null | undefined, timeZone: string = EXPIRES_AT_TIME_ZONE): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '';
  const w = wallTimeIn(ms, timeZone);
  if (w.h === 23 && w.mi === 59 && w.s === 59) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(w.h)}:${pad(w.mi)}`;
}

/** ISO → "YYYY-MM-DD" no fuso do evento (o que o input date mostra). Vazio/inválido → `''`. */
export function isoToLocalDate(iso: string | null | undefined, timeZone: string = EXPIRES_AT_TIME_ZONE): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '';
  const w = wallTimeIn(ms, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${w.y}-${pad(w.mo)}-${pad(w.d)}`;
}

/** Checa "data no passado" só ao criar ou depois de o usuário mexer na data (anúncio vencido não trava). */
export function expiresAtCheckPast(mode: string, touched: ReadonlySet<unknown>) {
  return mode === 'create' || touched.has('expiresAt');
}

export type ExpiresAtError = 'required' | 'past' | null;

/**
 * Valida a validade do anúncio. `checkPast`: só checa "data no passado" quando o usuário criou
 * o anúncio ou mexeu na data — um anúncio existente já vencido não trava o wizard.
 */
export function validateExpiresAt(
  mode: ExpiresAtMode,
  value: string | null | undefined,
  checkPast: boolean,
  now: Date = new Date()
): ExpiresAtError {
  if (mode === 'hidden') return null;
  if (!value) return mode === 'required' ? 'required' : null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'required';
  if (checkPast && time < now.getTime()) return 'past';
  return null;
}
