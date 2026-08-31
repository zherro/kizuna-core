'use client';

import {
  SystemConfigSection,
  type SystemConfigFieldSpec,
} from '@kizuna/core/client/components/ui-better-soft/system-config-section';
import type { UserDataFieldsConfig } from '@kizuna/core/client/components/onboarding/user-data-form';

type SystemConfigFormProps = {
  initialConfig: UserDataFieldsConfig;
  initialAppPreferencesFabVisible: boolean;
};

const DOCUMENT_FIELDS: SystemConfigFieldSpec[] = [
  {
    type: 'toggle',
    key: 'visible',
    title: 'Exibir campo',
    subtitle: 'Quando desligado, o tipo/número do documento somem do formulário inteiro.',
  },
  {
    type: 'toggle',
    key: 'required',
    title: 'Obrigatório',
    subtitle: 'Impede salvar o formulário sem um documento válido preenchido.',
    disabledWhen: (value) => !value.visible,
  },
  {
    type: 'select',
    key: 'mask',
    label: 'Tipos de documento aceitos',
    options: [
      { value: 'cpf_cnpj', label: 'CPF ou CNPJ (ambos)' },
      { value: 'cpf', label: 'Somente CPF (pessoa física)' },
      { value: 'cnpj', label: 'Somente CNPJ (pessoa jurídica)' },
    ],
    disabledWhen: (value) => !value.visible,
  },
  {
    type: 'textarea',
    key: 'warning',
    label: 'Texto de aviso (opcional)',
    placeholder: 'Deixe em branco para não exibir nenhum aviso.',
    helperText:
      'Mostrado abaixo do campo de documento (e da data de nascimento, quando aplicável) para explicar por que os dados são pedidos.',
    disabledWhen: (value) => !value.visible,
  },
];

const BIRTH_DATE_FIELDS: SystemConfigFieldSpec[] = [
  {
    type: 'toggle',
    key: 'visible',
    title: 'Exibir campo',
    subtitle: 'Quando desligado, a data de nascimento some do formulário inteiro.',
  },
  {
    type: 'toggle',
    key: 'required',
    title: 'Obrigatório',
    subtitle: 'Impede salvar o formulário sem uma data de nascimento válida (18+ anos).',
    disabledWhen: (value) => !value.visible,
  },
];

const APP_PREFERENCES_FAB_FIELDS: SystemConfigFieldSpec[] = [
  {
    type: 'toggle',
    key: 'visible',
    title: 'Exibir botão de preferências',
    subtitle:
      'Controla o botão flutuante de tema/idioma/cor (AppPreferencesProvider) para todos os usuários.',
  },
];

/**
 * A tela em si (quais chaves de `system_config` existem, o que cada uma significa) é a mesma
 * feature de configuração de projeto que o `system_config` plugin existe pra servir — o
 * componente genérico que renderiza/salva cada seção (`SystemConfigSection`) também vem do core.
 */
export function SystemConfigForm({
  initialConfig,
  initialAppPreferencesFabVisible,
}: Readonly<SystemConfigFormProps>) {
  return (
    <div className="space-y-6">
      <SystemConfigSection
        configKey="user_data.document_field"
        title="Campo de documento"
        description="Controla o CPF/CNPJ no formulário de dados pessoais (user_data.document_field)."
        fields={DOCUMENT_FIELDS}
        initialValue={initialConfig.documentField}
      />

      <SystemConfigSection
        configKey="user_data.birth_date_field"
        title="Campo de data de nascimento"
        description="Controla a data de nascimento no formulário de dados pessoais (user_data.birth_date_field). Só é pedida quando o documento selecionado é CPF."
        fields={BIRTH_DATE_FIELDS}
        initialValue={initialConfig.birthDateField}
      />

      <SystemConfigSection
        configKey="app_preferences.fab_visible"
        title="Preferências (tema/idioma)"
        description="Controla a visibilidade do botão flutuante de preferências (app_preferences.fab_visible)."
        fields={APP_PREFERENCES_FAB_FIELDS}
        initialValue={{ visible: initialAppPreferencesFabVisible }}
      />
    </div>
  );
}
