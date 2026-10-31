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
export declare function SystemConfigScreen(): Promise<import("react/jsx-runtime").JSX.Element>;
//# sourceMappingURL=system-config-screen.d.ts.map