import { PRICE_UNIT_LABEL } from '../service-labels';
import { SERVICE_PRICE_UNIT_OPTIONS } from '../service-type';

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
  /** Validade do anúncio (`services.expires_at`). Ausente/`false` = campo oculto; `true` =
   * `'optional'`; `'optional'` = pode deixar em branco; `'required'` = exige data futura. */
  expiresAt?: false | true | 'optional' | 'required';
};

export type ExpiresAtMode = 'hidden' | 'optional' | 'required';

/** Modo da validade no perfil: `hidden` (padrão), `optional` ou `required`. */
export function resolveExpiresAtMode(profile: PriceProfile): ExpiresAtMode {
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
  const expiresAt = profile.expiresAt as unknown;
  if (
    expiresAt !== undefined &&
    expiresAt !== true &&
    expiresAt !== false &&
    expiresAt !== 'optional' &&
    expiresAt !== 'required'
  ) {
    throw new Error(
      `stepProfiles.price: expiresAt inválido "${String(expiresAt)}" (use true, false, 'optional' ou 'required')`
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

/** "YYYY-MM-DD" (input date) → fim desse dia no fuso local, em ISO UTC. Data inválida → `null`. */
export function endOfLocalDayToIso(date: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const local = new Date(y, mo - 1, d, 23, 59, 59, 999);
  // Rejeita datas que o Date "corrige" (ex.: 2026-02-31).
  if (local.getFullYear() !== y || local.getMonth() !== mo - 1 || local.getDate() !== d) return null;
  return local.toISOString();
}

/** ISO → "YYYY-MM-DD" no fuso local (o que o input date mostra). Vazio/inválido → `''`. */
export function isoToLocalDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
