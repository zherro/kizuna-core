'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SystemConfigSection, } from '@kizuna/core/client/components/ui-better-soft/system-config-section';
const DOCUMENT_FIELDS = [
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
        helperText: 'Mostrado abaixo do campo de documento (e da data de nascimento, quando aplicável) para explicar por que os dados são pedidos.',
        disabledWhen: (value) => !value.visible,
    },
];
const BIRTH_DATE_FIELDS = [
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
const APP_PREFERENCES_FAB_FIELDS = [
    {
        type: 'toggle',
        key: 'visible',
        title: 'Exibir botão de preferências',
        subtitle: 'Controla o botão flutuante de tema/idioma/cor (AppPreferencesProvider) para todos os usuários.',
    },
];
/**
 * A tela em si (quais chaves de `system_config` existem, o que cada uma significa) é a mesma
 * feature de configuração de projeto que o `system_config` plugin existe pra servir — o
 * componente genérico que renderiza/salva cada seção (`SystemConfigSection`) também vem do core.
 */
export function SystemConfigForm({ initialConfig, initialAppPreferencesFabVisible, }) {
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(SystemConfigSection, { configKey: "user_data.document_field", title: "Campo de documento", description: "Controla o CPF/CNPJ no formul\u00E1rio de dados pessoais (user_data.document_field).", fields: DOCUMENT_FIELDS, initialValue: initialConfig.documentField }), _jsx(SystemConfigSection, { configKey: "user_data.birth_date_field", title: "Campo de data de nascimento", description: "Controla a data de nascimento no formul\u00E1rio de dados pessoais (user_data.birth_date_field). S\u00F3 \u00E9 pedida quando o documento selecionado \u00E9 CPF.", fields: BIRTH_DATE_FIELDS, initialValue: initialConfig.birthDateField }), _jsx(SystemConfigSection, { configKey: "app_preferences.fab_visible", title: "Prefer\u00EAncias (tema/idioma)", description: "Controla a visibilidade do bot\u00E3o flutuante de prefer\u00EAncias (app_preferences.fab_visible).", fields: APP_PREFERENCES_FAB_FIELDS, initialValue: { visible: initialAppPreferencesFabVisible } })] }));
}
//# sourceMappingURL=system-config-form.js.map