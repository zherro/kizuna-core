import { validateLocationRefs, type LocationRefConfig } from './location-refs';
/** Valores aceitos pelo enum `public.service_location` (plugin services) — o que é gravado. */
export const SERVICE_LOCATION_VALUES = ['no_cliente', 'no_estabelecimento', 'remoto'] as const;
export type ServiceLocationValue = (typeof SERVICE_LOCATION_VALUES)[number];

/**
 * Modelo de uma opção do passo de localização:
 *  - `address`: mostra o formulário de endereço e o exige antes de avançar;
 *  - `addresses`: lista editável de N endereços (`maxAddresses`, padrão 5, 1..10) persistida em
 *    `service_addresses`;
 *  - `identifier`: só o identificador (ex.: online) — sem endereço.
 */
export type LocationModel = 'address' | 'addresses' | 'identifier';

export const DEFAULT_MAX_ADDRESSES = 5;
export const MAX_ADDRESSES_LIMIT = 10;

export type LocationOptionConfig = {
  /** O que vai pro banco (enum). O texto mostrado vem de `messages.wizard.location.options`. */
  value: ServiceLocationValue;
  model: LocationModel;
  /** Nome de ícone lucide (ex.: "Home"). Sem ele, usa o padrão do `value`. */
  icon?: string;
  /** Chave em `messages.wizard.location.options` dos textos desta opção. Padrão: o próprio
   * `value`. Serve pra mesma opção ter textos diferentes em grupos/categorias diferentes. */
  textKey?: string;
  /** Só `model: 'addresses'`: máximo de endereços por serviço (padrão 5, mín 1, máx 10). */
  maxAddresses?: number;
  /** Só `model: 'address'`/`'addresses'`: `false` deixa o CEP opcional — basta rua, número e a
   * cidade/UF (vindas da busca do endereço). Ex.: eventos, que muitas vezes não têm CEP. Padrão `true`. */
  requireZipCode?: boolean;
  /** Só `model: 'addresses'`: chave de um vínculo único de `refs` (ex.: `local_ref`). Escolher o
   * anúncio ali copia o endereço principal dele para o endereço principal deste; com o vínculo
   * preenchido, o endereço deixa de ser obrigatório (o do lugar vale). */
  addressFromRef?: string;
};

/** Perfil do passo `location` (ver `StepProfiles`). */
export type LocationProfile = {
  /** Opções na ordem da tela. */
  options: LocationOptionConfig[];
  /** Opção já selecionada ao abrir o passo (um `value` de `options`). Sem ele, nada vem
   * selecionado. Só vale enquanto o serviço ainda não tem localização escolhida. */
  defaultValue?: ServiceLocationValue;
  /** Textos do passo para este perfil, por cima de `messages.wizard.location` (ex.: o grupo
   * `lugares` troca "Onde acontece?" por "Onde fica?" — o endereço do lugar É o conteúdo). */
  labels?: LocationLabels;
  /** Vínculos com outros anúncios abaixo do endereço (ex.: local do evento, pontos de venda),
   * gravados em `services.extras` — ver `LocationRefConfig`. */
  refs?: LocationRefConfig[];
};

export const LOCATION_LABEL_KEYS = [
  'title',
  'subtitle',
  'why',
  'addressTitle',
  'addressHint',
  'addressesTitle',
  'addressesHint',
] as const;
/** `title`/`subtitle`/`why`: cabeçalho; `address*`: model `address`; `addresses*`: model `addresses`. */
export type LocationLabels = Partial<Record<(typeof LOCATION_LABEL_KEYS)[number], string>>;

/** Padrão do core — o que o passo sempre teve. */
export const DEFAULT_LOCATION_PROFILE: LocationProfile = {
  options: [
    // Endereço só existe no estabelecimento; no cliente e remoto não pedem endereço.
    { value: 'no_estabelecimento', model: 'addresses', maxAddresses: DEFAULT_MAX_ADDRESSES },
    { value: 'no_cliente', model: 'identifier' },
    { value: 'remoto', model: 'identifier' },
  ],
};

export function validateLocationProfile(profile: LocationProfile) {
  const options = profile?.options;
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error('stepProfiles.location: informe ao menos uma opção em "options"');
  }
  const seen = new Set<string>();
  for (const option of options) {
    if (!SERVICE_LOCATION_VALUES.includes(option?.value)) {
      throw new Error(
        `stepProfiles.location: value inválido "${String(option?.value)}" (use ${SERVICE_LOCATION_VALUES.join(', ')})`
      );
    }
    if (option.model !== 'address' && option.model !== 'addresses' && option.model !== 'identifier') {
      throw new Error(
        `stepProfiles.location: model inválido "${String(option.model)}" (address|addresses|identifier)`
      );
    }
    if (option.maxAddresses !== undefined) {
      const n = option.maxAddresses;
      if (option.model !== 'addresses') {
        throw new Error('stepProfiles.location: "maxAddresses" só vale com model "addresses"');
      }
      if (!Number.isInteger(n) || n < 1 || n > MAX_ADDRESSES_LIMIT) {
        throw new Error(
          `stepProfiles.location: maxAddresses inválido "${String(n)}" (inteiro de 1 a ${MAX_ADDRESSES_LIMIT})`
        );
      }
    }
    if (option.requireZipCode !== undefined) {
      if (typeof option.requireZipCode !== 'boolean') {
        throw new Error('stepProfiles.location: "requireZipCode" precisa ser true ou false');
      }
      if (option.model === 'identifier') {
        throw new Error('stepProfiles.location: "requireZipCode" só vale com model "address" ou "addresses"');
      }
    }
    if (option.addressFromRef !== undefined) {
      if (option.model !== 'addresses') {
        throw new Error('stepProfiles.location: "addressFromRef" só vale com model "addresses"');
      }
      const ref = profile.refs?.find((r) => r.key === option.addressFromRef);
      if (!ref || ref.multiple) {
        throw new Error(
          `stepProfiles.location: addressFromRef "${String(option.addressFromRef)}" precisa ser a key de um vínculo único em "refs"`
        );
      }
    }
    if (seen.has(option.value)) {
      throw new Error(`stepProfiles.location: value repetido "${option.value}"`);
    }
    seen.add(option.value);
  }
  if (profile.labels !== undefined) {
    for (const [key, text] of Object.entries(profile.labels ?? {})) {
      if (!(LOCATION_LABEL_KEYS as readonly string[]).includes(key)) {
        throw new Error(
          `stepProfiles.location: labels.${key} desconhecido (use ${LOCATION_LABEL_KEYS.join(', ')})`
        );
      }
      if (typeof text !== 'string') {
        throw new Error(`stepProfiles.location: labels.${key} precisa ser texto`);
      }
    }
  }
  validateLocationRefs(profile.refs);
  if (profile.defaultValue !== undefined && !seen.has(profile.defaultValue)) {
    throw new Error(
      `stepProfiles.location: defaultValue "${String(profile.defaultValue)}" não está em "options"`
    );
  }
}

/** `maxAddresses` efetivo de uma opção (padrão 5, limitado a 1..10). */
export function resolveMaxAddresses(option?: Pick<LocationOptionConfig, 'maxAddresses'>): number {
  const raw = option?.maxAddresses;
  if (raw === undefined) return DEFAULT_MAX_ADDRESSES;
  return Math.min(MAX_ADDRESSES_LIMIT, Math.max(1, Math.trunc(raw)));
}
