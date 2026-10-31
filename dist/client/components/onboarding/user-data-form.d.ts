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
export declare const DEFAULT_USER_DATA_FIELDS_CONFIG: UserDataFieldsConfig;
type AccountFormProps = {
    role?: string;
    /** Server-fetched `auth.system_config` values (src/lib/server/user-data-fields-config.ts).
     * Defaults to `DEFAULT_USER_DATA_FIELDS_CONFIG` when the caller doesn't pass one (e.g. a
     * screen-engine block instantiation predating this prop) instead of breaking. */
    fieldsConfig?: UserDataFieldsConfig;
    /** `onboarding_steps.slug` this form completes once `isStepComplete` passes. Defaults to
     * `'profile-setup'` — the slug foco-total's own seed (db/extras/onboarding_steps_seed.sql) uses
     * for this exact step. Previously this wasn't filtered at all: the lookup just took the first
     * active step ordered by `step_order` for the role, which happened to be `email-verification`
     * (`step_order: 1`, seeded before `profile-setup`'s `step_order: 2`) — so finishing this form was
     * silently marking the *email verification* step complete instead of its own. */
    stepSlug?: string;
};
/**
 * `/painel/minha-conta`'s form, registered as the screen-engine `account-form` block (see
 * `screens/minha-conta.ts`). Saves through the generic `user_data` resource
 * (`postgrestResources`, `.claude/libs/resource-config.md`) instead of the old bespoke
 * `/api/onboarding/user-data` route — that route predated this app's file-storage convention and
 * stored the avatar as a hand-rolled base64→bytea column (`user_data.avatar`) the resource config
 * never even selected; `avatar_url` (what `mapOutput` actually reads) sat unused. The avatar now
 * uploads through the same `/api/storage/files` (`purpose: 'avatar'`) flow `AdImagesManager`
 * already uses for service/ad photos, and `avatarUrl` is just another form field saved with the
 * rest — one save path, no separate bytea route.
 *
 * `user_data` has no known row on a brand-new user's first visit, so which HTTP verb to save with
 * (POST create vs. PATCH update) isn't knowable from the URL the way `ServiceWizard`'s
 * `initialServiceId` is — this component resolves it itself on mount (`existingId`, via a plain
 * GET against the resource; RLS already scopes it to the caller's own row, see
 * `resource-user-onboarding.ts`) and feeds it to `useForm`'s `resourceSubmit.selectedId`, same
 * create/update dispatch every other resource-backed form in this app already relies on.
 */
export declare function AccountForm({ role, fieldsConfig, stepSlug, }: AccountFormProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=user-data-form.d.ts.map