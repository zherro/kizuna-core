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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <AdminPageReader
        title="Configurações do sistema"
        description="Controle a exibição e a obrigatoriedade dos campos de documento e data de nascimento do formulário de dados pessoais (user_data), e a visibilidade do botão de preferências, sem precisar de deploy."
      />

      <SystemConfigForm
        initialConfig={fieldsConfig}
        initialAppPreferencesFabVisible={appPreferencesFabVisible}
      />
    </div>
  );
}
