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
};

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
