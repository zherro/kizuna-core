import type { UserDataFieldsConfig } from '@kizuna/core/client/components/onboarding/user-data-form';
type SystemConfigFormProps = {
    initialConfig: UserDataFieldsConfig;
    initialAppPreferencesFabVisible: boolean;
};
/**
 * A tela em si (quais chaves de `system_config` existem, o que cada uma significa) é a mesma
 * feature de configuração de projeto que o `system_config` plugin existe pra servir — o
 * componente genérico que renderiza/salva cada seção (`SystemConfigSection`) também vem do core.
 */
export declare function SystemConfigForm({ initialConfig, initialAppPreferencesFabVisible, }: Readonly<SystemConfigFormProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=system-config-form.d.ts.map