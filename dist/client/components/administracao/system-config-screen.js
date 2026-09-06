import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AdminPageReader } from '@kizuna/core/client/components/ui-better-soft/headers/admin-page-reader';
import { SystemConfigForm } from './system-config-form';
import { getUserDataFieldsConfig } from '@/lib/server/user-data-fields-config';
import { getAppPreferencesFabVisible } from '@/lib/server/app-preferences-config';
/**
 * Root screen for slug `configuracoes` (group `root`) — a "slot" component (see
 * `RootScreenEntry.component` in `kizuna-core/src/client/components/root-screens/registry.ts`):
 * the core's registry does not ship a component for this slug because the *values* of the config
 * keys edited here are each consuming project's own decision (see `plugins/README.md`'s "VALORES
 * de config são decisão de negócio do consumidor, não do core"), even though the fields/screen
 * themselves are core mechanism (`user_data.document_field`/`birth_date_field` from the onboarding
 * plugin, `app_preferences.fab_visible` from the `AppPreferencesProvider`/`PreferencesFab` pair).
 * Passed to `resolveRootScreen`'s `slotComponents` by `src/app/painel/root/[slug]/page.tsx`. The
 * `is_root` gate lives in `resolveRootScreen`, not here.
 */
export async function SystemConfigScreen() {
    const [fieldsConfig, appPreferencesFabVisible] = await Promise.all([
        getUserDataFieldsConfig(),
        getAppPreferencesFabVisible(),
    ]);
    return (_jsxs("div", { className: "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:px-6", children: [_jsx(AdminPageReader, { title: "Configura\u00E7\u00F5es do sistema", description: "Controle a exibi\u00E7\u00E3o e a obrigatoriedade dos campos de documento e data de nascimento do formul\u00E1rio de dados pessoais (user_data), e a visibilidade do bot\u00E3o de prefer\u00EAncias, sem precisar de deploy." }), _jsx(SystemConfigForm, { initialConfig: fieldsConfig, initialAppPreferencesFabVisible: appPreferencesFabVisible })] }));
}
//# sourceMappingURL=system-config-screen.js.map