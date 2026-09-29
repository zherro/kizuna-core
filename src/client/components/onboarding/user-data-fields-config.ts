// Sem 'use client' de propósito: o servidor (RSC, route handlers) lê DEFAULT_USER_DATA_FIELDS_CONFIG.
// Importada de um módulo 'use client', a constante chega ao servidor como referência de cliente,
// não como valor — `DEFAULT_USER_DATA_FIELDS_CONFIG.documentField` vira undefined.

/**
 * Shape of the two `auth.system_config` keys this form reads (see
 * `src/lib/server/user-data-fields-config.ts`, seeded by `db/extras/system_config_seed.sql`,
 * edited through `/painel/administracao/configuracoes`). `mask` isn't a formatting-library name —
 * this component already knows how to format both cpf and cnpj on its own (applyDocumentMask
 * below) — it's which document type(s) the dropdown offers.
 */
export type UserDataDocumentFieldConfig = {
  visible: boolean;
  required: boolean;
  mask: 'cpf' | 'cnpj' | 'cpf_cnpj';
  warning: string | null;
};

export type UserDataBirthDateFieldConfig = {
  visible: boolean;
  required: boolean;
};

export type UserDataFieldsConfig = {
  documentField: UserDataDocumentFieldConfig;
  birthDateField: UserDataBirthDateFieldConfig;
};

/** Used when `auth.system_config` has no row yet for one of the two keys (fresh install before
 * `db/extras/system_config_seed.sql` runs) — everything visible, nothing required, so the form
 * never breaks waiting on a seed. */
export const DEFAULT_USER_DATA_FIELDS_CONFIG: UserDataFieldsConfig = {
  documentField: {
    visible: true,
    required: false,
    mask: 'cpf_cnpj',
    warning: null,
  },
  birthDateField: { visible: true, required: false },
};
