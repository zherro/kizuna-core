/** Valores aceitos pelo enum `public.service_location` (plugin services) — o que é gravado. */
export const SERVICE_LOCATION_VALUES = ['no_cliente', 'no_estabelecimento', 'remoto'] as const;
export type ServiceLocationValue = (typeof SERVICE_LOCATION_VALUES)[number];

/**
 * Modelo de uma opção do passo de localização:
 *  - `address`: mostra o formulário de endereço e o exige antes de avançar;
 *  - `identifier`: só o identificador (ex.: online) — sem endereço.
 */
export type LocationModel = 'address' | 'identifier';

export type LocationOptionConfig = {
  /** O que vai pro banco (enum). O texto mostrado vem de `messages.wizard.location.options`. */
  value: ServiceLocationValue;
  model: LocationModel;
  /** Nome de ícone lucide (ex.: "Home"). Sem ele, usa o padrão do `value`. */
  icon?: string;
  /** Chave em `messages.wizard.location.options` dos textos desta opção. Padrão: o próprio
   * `value`. Serve pra mesma opção ter textos diferentes em grupos/categorias diferentes. */
  textKey?: string;
};

/** Perfil do passo `location` (ver `StepProfiles`). */
export type LocationProfile = {
  /** Opções na ordem da tela. */
  options: LocationOptionConfig[];
  /** Opção já selecionada ao abrir o passo (um `value` de `options`). Sem ele, nada vem
   * selecionado. Só vale enquanto o serviço ainda não tem localização escolhida. */
  defaultValue?: ServiceLocationValue;
};

/** Padrão do core — o que o passo sempre teve. */
export const DEFAULT_LOCATION_PROFILE: LocationProfile = {
  options: [
    { value: 'no_cliente', model: 'address' },
    { value: 'no_estabelecimento', model: 'address' },
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
    if (option.model !== 'address' && option.model !== 'identifier') {
      throw new Error(
        `stepProfiles.location: model inválido "${String(option.model)}" (address|identifier)`
      );
    }
    if (seen.has(option.value)) {
      throw new Error(`stepProfiles.location: value repetido "${option.value}"`);
    }
    seen.add(option.value);
  }
  if (profile.defaultValue !== undefined && !seen.has(profile.defaultValue)) {
    throw new Error(
      `stepProfiles.location: defaultValue "${String(profile.defaultValue)}" não está em "options"`
    );
  }
}
