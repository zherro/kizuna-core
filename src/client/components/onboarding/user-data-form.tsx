'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Yup from 'yup';
import { CheckCircle2, ExternalLink, ShieldCheck, Upload, User } from 'lucide-react';
import { Button } from '@kizuna/core/client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kizuna/core/client/components/ui/card';
import { Input } from '@kizuna/core/client/components/ui/input';
import { Label } from '@kizuna/core/client/components/ui/label';
import { QuillEditor } from '@kizuna/core/client/components/ui/quill-editor';
import { SearchableSelect } from '@kizuna/core/client/components/ui/searchable-select';
import { useAuth } from '@kizuna/core/client/providers/auth-provider';
import { useForm } from '@kizuna/core/client';
import { validateDocument } from '../../../lib/validate-doc';
import { stripHtml } from '@/components/services/service-type';

const STATES_BR = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

const ACCOUNT_STATUS_LABELS: Record<number, string> = {
  1: 'Pendente',
  2: 'Em verificacao',
  3: 'Aprovado',
  4: 'Em analise',
  5: 'Reprovado',
  6: 'Bloqueado',
  9: 'Fraude',
};

const ACCEPTED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_AVATAR_FILE_SIZE_MB = 2;

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
  documentField: { visible: true, required: false, mask: 'cpf_cnpj', warning: null },
  birthDateField: { visible: true, required: false },
};

function allowedDocumentTypes(mask: UserDataDocumentFieldConfig['mask']): Array<'cpf' | 'cnpj'> {
  if (mask === 'cpf') return ['cpf'];
  if (mask === 'cnpj') return ['cnpj'];
  return ['cpf', 'cnpj'];
}

type AccountFormValues = {
  fullName: string;
  displayName: string;
  phone: string;
  email: string;
  documentType: 'cpf' | 'cnpj';
  documentNumber: string;
  birthDate: string;
  zipCode: string;
  state: string;
  city: string;
  bio: string;
  avatarUrl: string;
};

function buildInitialValues(config: UserDataFieldsConfig): AccountFormValues {
  return {
    fullName: '',
    displayName: '',
    phone: '',
    email: '',
    documentType: allowedDocumentTypes(config.documentField.mask)[0],
    documentNumber: '',
    birthDate: '',
    zipCode: '',
    state: '',
    city: '',
    bio: '',
    avatarUrl: '',
  };
}

function buildValidationSchema(config: UserDataFieldsConfig) {
  const { documentField, birthDateField } = config;
  const docTypes = allowedDocumentTypes(documentField.mask);

  return Yup.object({
    fullName: Yup.string().trim().required('Informe o nome completo.'),
    displayName: Yup.string()
      .trim()
      .required('Informe o nome de exibição.')
      .max(20, 'Máximo de 20 caracteres.')
      .matches(
        /^[a-zA-Z0-9_-]+$/,
        'Use apenas letras, números, "_" e "-" — sem espaços ou outros caracteres.'
      ),
    documentType: documentField.visible
      ? Yup.string().oneOf(docTypes).required('Selecione o tipo de documento.')
      : Yup.string().notRequired(),
    documentNumber:
      documentField.visible && documentField.required
        ? Yup.string()
            .trim()
            .required('Informe o número do documento.')
            .test(
              'doc-valid',
              'Documento inválido. Verifique o número informado.',
              function (value) {
                const type = (this.parent as AccountFormValues).documentType;
                return validateDocument(type, value ?? '');
              }
            )
        : Yup.string()
            .trim()
            .test(
              'doc-valid-optional',
              'Documento inválido. Verifique o número informado.',
              function (value) {
                if (!value) return true;
                const type = (this.parent as AccountFormValues).documentType;
                return validateDocument(type, value);
              }
            ),
    // Only asked for CPF — a CNPJ is a company, not a person, so it has no birth date.
    birthDate:
      documentField.visible && birthDateField.visible
        ? Yup.string().when('documentType', {
            is: 'cpf',
            then: (schema) =>
              birthDateField.required
                ? schema
                    .required('Informe sua data de nascimento.')
                    .test(
                      'birth-date-valid',
                      'Data inválida.',
                      (value) => !!value && !Number.isNaN(Date.parse(value))
                    )
                    .test(
                      'birth-date-min-age',
                      'É preciso ter pelo menos 18 anos para anunciar.',
                      (value) => {
                        if (!value) return false;
                        const birth = new Date(value);
                        if (Number.isNaN(birth.getTime())) return false;
                        const eighteenYearsAgo = new Date();
                        eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
                        return birth <= eighteenYearsAgo;
                      }
                    )
                : schema
                    .notRequired()
                    .test('birth-date-valid-optional', 'Data inválida.', (value) => {
                      if (!value) return true;
                      return !Number.isNaN(Date.parse(value));
                    }),
            otherwise: (schema) => schema.notRequired(),
          })
        : Yup.string().notRequired(),
    email: Yup.string().trim().email('E-mail inválido.'),
    phone: Yup.string().max(30, 'Telefone muito longo.'),
    state: Yup.string().trim().required('Informe o estado.'),
    city: Yup.string().trim().required('Informe a cidade.'),
    // `bio` is QuillEditor HTML — length must be checked on the visible text (stripHtml), not the
    // raw markup, same convention as StepDescriptionForm's MIN_LENGTH check.
    bio: Yup.string().test(
      'bio-max-length',
      'Máximo de 500 caracteres.',
      (value) => stripHtml(value ?? '').length <= 500
    ),
  });
}

/** Checks if all criteria to mark the "Completar perfil" onboarding step as done are met. */
function isStepComplete(values: AccountFormValues, config: UserDataFieldsConfig): boolean {
  const hasName = values.fullName.trim().length > 0;
  const hasAvatar = values.avatarUrl.trim().length > 0;
  const hasValidDoc =
    !config.documentField.visible ||
    !config.documentField.required ||
    validateDocument(values.documentType, values.documentNumber);
  const hasAddress =
    values.zipCode.trim().length > 0 &&
    values.state.trim().length > 0 &&
    values.city.trim().length > 0;
  return hasName && hasAvatar && hasValidDoc && hasAddress;
}

function applyDocumentMask(type: 'cpf' | 'cnpj', value: string): string {
  const digits = value.replace(/\D/g, '');

  if (type === 'cpf') {
    const v = digits.slice(0, 11);
    return v
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  const v = digits.slice(0, 14);
  return v
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

type StorageFileRecord = { id: string | number };

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
export function AccountForm({
  role = 'advertiser',
  fieldsConfig = DEFAULT_USER_DATA_FIELDS_CONFIG,
  stepSlug = 'profile-setup',
}: AccountFormProps) {
  const { user } = useAuth();
  const { documentField, birthDateField } = fieldsConfig;
  const docTypes = allowedDocumentTypes(documentField.mask);
  const [resolvedStepId, setResolvedStepId] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null | undefined>(undefined);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [accountStatus, setAccountStatus] = useState<number | null>(null);
  const [stepDone, setStepDone] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [cityOptions, setCityOptions] = useState<{ value: string; label: string }[]>([]);
  const [cityOptionsLoading, setCityOptionsLoading] = useState(false);
  const [cepLookupLoading, setCepLookupLoading] = useState(false);

  // This form's own onboarding step (`stepSlug`, default 'profile-setup') — used only to mark it
  // "completed" once this form's own requirements are met (see isStepComplete). Filtered by slug,
  // not just "first active step for this role" (see stepSlug's doc comment for why that was wrong).
  useEffect(() => {
    let active = true;

    const loadStepId = async () => {
      try {
        const query = new URLSearchParams({
          page: '1',
          pageSize: '1',
          'filter.role': role,
          'filter.active': 'true',
          'filter.slug': stepSlug,
        });
        const response = await fetch(`/api/resources/onboarding_steps?${query.toString()}`);
        if (!response.ok) return;
        const data = (await response.json().catch(() => null)) as {
          items?: Array<{ id: string }>;
        } | null;
        if (active) setResolvedStepId(data?.items?.[0]?.id ?? null);
      } catch {
        // noop: form can still save the profile even if the step lookup fails
      }
    };

    void loadStepId();
    return () => {
      active = false;
    };
  }, [role, stepSlug]);

  const [existingRecord, setExistingRecord] = useState<Record<string, unknown> | null>(null);

  // Resolves whether this user already has a `user_data` row — drives create-vs-update below.
  useEffect(() => {
    let active = true;

    const loadExisting = async () => {
      try {
        const response = await fetch('/api/resources/user_data?page=1&pageSize=1');
        if (!response.ok) {
          if (active) setExistingId(null);
          return;
        }
        const data = (await response.json().catch(() => null)) as {
          items?: Array<Record<string, unknown>>;
        } | null;
        const record = data?.items?.[0];
        if (!active) return;
        setExistingId(record?.id != null ? String(record.id) : null);
        if (record) {
          setExistingRecord(record);
          setEmailVerified(Boolean(record.emailVerified));
          setPhoneVerified(Boolean(record.phoneVerified));
          const statusValue = Number(record.status);
          setAccountStatus(Number.isFinite(statusValue) ? statusValue : null);
        }
      } catch {
        if (active) setExistingId(null);
      }
    };

    void loadExisting();
    return () => {
      active = false;
    };
  }, []);

  // Shared by the validated formik submit (toPayload below) and by the avatar auto-save
  // (saveUserData), which deliberately skips Yup validation — see saveUserData's comment.
  // `documentNumber` is stored as digits-only — the mask above is display-only. `userId` isn't a
  // form field: `mapInput` (resource-user-onboarding.ts) requires it on create, and there's no
  // server-side default for it the way `uid`/`tenant_id`/`created_by` have — the old custom route
  // set it explicitly from the session for the same reason.
  const buildPayload = useCallback(
    (values: AccountFormValues) => ({
      ...values,
      userId: user?.user_id,
      documentType: documentField.visible ? values.documentType : null,
      documentNumber: documentField.visible ? values.documentNumber.replace(/\D/g, '') : null,
      birthDate:
        documentField.visible && birthDateField.visible && values.documentType === 'cpf'
          ? values.birthDate || null
          : null,
      displayName: values.displayName.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      zipCode: values.zipCode.trim() || null,
      state: values.state.trim() || null,
      city: values.city.trim() || null,
      bio: values.bio.trim() || null,
      avatarUrl: values.avatarUrl || null,
    }),
    [user?.user_id, documentField.visible, birthDateField.visible]
  );

  // Runs after a successful save (validated submit or avatar auto-save alike): stamps the new
  // `user_data` id and, once every required field is actually filled in, marks the onboarding
  // step done. Required-field enforcement stays purely client-side (Yup, on the validated submit
  // path) — the DB itself never requires these columns, so this check is what decides whether the
  // step counts as complete, not whether the row could be saved at all.
  const afterUserDataSaved = useCallback(
    async (item: Record<string, unknown> | undefined, values: AccountFormValues) => {
      if (item?.id != null) setExistingId(String(item.id));

      if (!isStepComplete(values, fieldsConfig) || !resolvedStepId) return false;

      const progressRes = await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_id: resolvedStepId, status: 'completed' }),
      });

      if (progressRes.ok) {
        setStepDone(true);
        return true;
      }
      return false;
    },
    [fieldsConfig, resolvedStepId]
  );

  // Saves `user_data` directly against the resource endpoint, bypassing Formik/Yup validation
  // entirely. Used by the avatar upload flow: uploading a photo must persist immediately (see
  // handleAvatarChange) even when required fields like fullName/state/city are still empty — those
  // are UI-only requirements (buildValidationSchema), the DB never enforces them, so gating this
  // save on them would silently drop the just-uploaded avatarUrl instead of saving it.
  const saveUserData = useCallback(
    async (values: AccountFormValues) => {
      const payload = buildPayload(values);
      const method = existingId ? 'PATCH' : 'POST';
      const url = existingId
        ? `/api/resources/user_data/${existingId}`
        : '/api/resources/user_data';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as {
        item?: Record<string, unknown>;
        message?: string;
      } | null;

      if (!response.ok) return { ok: false as const, message: data?.message };

      await afterUserDataSaved(data?.item, values);
      return { ok: true as const };
    },
    [buildPayload, existingId, afterUserDataSaved]
  );

  const form = useForm<AccountFormValues, Record<string, unknown>, Record<string, unknown>>({
    initialValues: buildInitialValues(fieldsConfig),
    validationSchema: buildValidationSchema(fieldsConfig),
    resourceSubmit: {
      resource: 'user_data',
      selectedId: existingId,
      toPayload: buildPayload,
      errorMessage: 'Não foi possível salvar seus dados.',
      successMessage: 'Dados salvos com sucesso!',
      connectionErrorMessage: 'Não foi possível conectar ao servidor.',
      onSuccess: async (result, { setSuccess }) => {
        const item = result.item as Record<string, unknown> | undefined;
        const completed = await afterUserDataSaved(item, form.formik.values);

        if (completed) {
          setSuccess('Dados salvos e etapa concluída! ✓');
          return;
        }

        if (isStepComplete(form.formik.values, fieldsConfig) && !resolvedStepId) {
          setSuccess(
            'Dados salvos, mas não foi possível identificar a etapa de onboarding para concluir.'
          );
          return;
        }

        setSuccess('Dados salvos com sucesso!');
      },
    },
  });

  const { formik, error, success, submitting } = form;
  const loaded = existingId !== undefined;

  // `@kizuna/core`'s useForm dropped the pre-migration hook's resource hydration entirely — it
  // only submits (create/update), never fetches+prefills by `resourceSubmit.selectedId`, and
  // exposes no `resourceLoading`. Prefill is reimplemented locally here off the same
  // `existingRecord` `loadExisting` already fetches, instead of leaving the form blank on repeat
  // visits.
  useEffect(() => {
    if (!existingRecord) return;
    void formik.setValues({
      fullName: String(existingRecord.fullName ?? ''),
      displayName: String(existingRecord.displayName ?? ''),
      phone: String(existingRecord.phone ?? ''),
      // `user_data.email` is often blank on older rows — the account's real e-mail is the login
      // itself (`user.login`), so fall back to it instead of showing an empty, "not loaded" field.
      email: String(existingRecord.email || user?.login || ''),
      documentType: (docTypes.includes(existingRecord.documentType as 'cpf' | 'cnpj')
        ? existingRecord.documentType
        : docTypes[0]) as 'cpf' | 'cnpj',
      documentNumber: String(existingRecord.documentNumber ?? ''),
      birthDate: existingRecord.birthDate ? String(existingRecord.birthDate).slice(0, 10) : '',
      zipCode: String(existingRecord.zipCode ?? ''),
      state: String(existingRecord.state ?? ''),
      city: String(existingRecord.city ?? ''),
      bio: String(existingRecord.bio ?? ''),
      avatarUrl: String(existingRecord.avatarUrl ?? ''),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingRecord]);

  // Brand-new user (no `user_data` row yet, so the hydration effect above never runs) —
  // default the read-only e-mail field to the account's login so it isn't shown empty.
  useEffect(() => {
    if (existingRecord || existingId !== null) return;
    if (!user?.login || formik.values.email) return;
    void formik.setFieldValue('email', user.login);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingRecord, existingId, user?.login]);

  // ViaCEP integration: once the zip code has 8 digits, look up the address and auto-fill
  // state/city so the user doesn't have to type them by hand.
  useEffect(() => {
    const digits = formik.values.zipCode.replace(/\D/g, '');
    if (digits.length !== 8) return;

    let active = true;
    setCepLookupLoading(true);

    fetch(`https://viacep.com.br/ws/${digits}/json/`)
      .then((res) => res.json())
      .then((data: { erro?: boolean; uf?: string; localidade?: string }) => {
        if (!active || data.erro) return;
        if (data.uf) void formik.setFieldValue('state', data.uf);
        if (data.localidade) void formik.setFieldValue('city', data.localidade);
      })
      .catch(() => {
        // noop: CEP lookup is a convenience — user can still fill state/city manually
      })
      .finally(() => {
        if (active) setCepLookupLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.zipCode]);

  // City options for the selected state — reuses the same IBGE-backed endpoint the search page
  // uses (`/api/agenda/cities?uf=`). Options are keyed by city name (not the IBGE id) since
  // `user_data.city` is a plain text column, not an FK.
  useEffect(() => {
    const uf = formik.values.state.trim().toUpperCase();
    if (!uf) {
      setCityOptions([]);
      return;
    }

    let active = true;
    setCityOptionsLoading(true);

    fetch(`/api/agenda/cities?uf=${encodeURIComponent(uf)}`)
      .then((res) => res.json())
      .then((data: { items?: { value: string; label: string }[] }) => {
        if (!active) return;
        const items = Array.isArray(data.items) ? data.items : [];
        setCityOptions(items.map((item) => ({ value: item.label, label: item.label })));
      })
      .catch(() => {
        if (active) setCityOptions([]);
      })
      .finally(() => {
        if (active) setCityOptionsLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.state]);

  // `documentNumber` is displayed masked, but the hydration effect above sets it straight from
  // the server's digits-only value — re-mask whenever it drifts from its own masked form. No-op
  // while typing: every keystroke already goes through `handleDocumentNumberChange`, which sets
  // the masked value directly, so this effect only ever fires right after an external reset.
  useEffect(() => {
    const masked = applyDocumentMask(formik.values.documentType, formik.values.documentNumber);
    if (masked !== formik.values.documentNumber) {
      void formik.setFieldValue('documentNumber', masked, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.documentNumber, formik.values.documentType]);
  const errorTextClass = 'text-xs text-red-600';
  const accountStatusLabel = accountStatus
    ? (ACCOUNT_STATUS_LABELS[accountStatus] ?? `Status ${accountStatus}`)
    : 'Nao informado';
  const isAccountApproved = accountStatus === 3;

  function handleDocumentTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextType = e.target.value as 'cpf' | 'cnpj';
    void formik.setFieldValue('documentType', nextType);
    void formik.setFieldValue(
      'documentNumber',
      applyDocumentMask(nextType, formik.values.documentNumber)
    );
    // CNPJ is a company, not a person — no birth date to ask for.
    if (nextType === 'cnpj') {
      void formik.setFieldValue('birthDate', '');
    }
  }

  function handleDocumentNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    void formik.setFieldValue(
      'documentNumber',
      applyDocumentMask(formik.values.documentType, e.target.value)
    );
  }

  // Shown with an "@" prefix like a handle — doubles as the public profile slug
  // (/prestador/<displayName>), so only letters, numbers, "_" and "-" are allowed. Spaces become
  // "_" instead of being rejected outright (friendlier mid-typing); anything else is just dropped.
  function handleDisplayNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
      .replace(/\s/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 20);
    void formik.setFieldValue('displayName', next);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ACCEPTED_AVATAR_MIME_TYPES.has(file.type)) {
      setAvatarError('Selecione uma imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_AVATAR_FILE_SIZE_MB * 1024 * 1024) {
      setAvatarError(`A imagem deve ter no máximo ${MAX_AVATAR_FILE_SIZE_MB} MB.`);
      return;
    }

    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const body = new FormData();
      body.append('files', file);
      body.append('purpose', 'avatar');
      body.append('maxFileSizeMb', String(MAX_AVATAR_FILE_SIZE_MB));
      body.append('optimizeImages', 'true');

      const response = await fetch('/api/storage/files', { method: 'POST', body });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        uploaded?: StorageFileRecord[];
      } | null;

      const uploadedFile = data?.uploaded?.[0];
      if (!response.ok || !uploadedFile) {
        setAvatarError(data?.message ?? 'Não foi possível enviar a foto.');
        return;
      }

      const avatarUrl = `/api/public/storage/files/${uploadedFile.id}/content`;
      await formik.setFieldValue('avatarUrl', avatarUrl);

      // Persist immediately, bypassing Yup validation (saveUserData, not formik.submitForm) —
      // otherwise the URL only lived in local formik state: the avatar vanished on F5 (nothing
      // persisted), and it could never save at all if a required field like fullName/state/city
      // was still empty (those requirements are UI-only, see buildValidationSchema; the DB doesn't
      // enforce them, so a required-field gate here would silently drop the upload).
      const result = await saveUserData({ ...formik.values, avatarUrl });
      if (!result.ok) {
        setAvatarError(result.message ?? 'Foto enviada, mas não foi possível salvar o perfil.');
      }
    } catch {
      setAvatarError('Não foi possível enviar a foto.');
    } finally {
      setAvatarUploading(false);
    }
  }

  // Completion checklist (live feedback). The document check only shows up when the field is
  // both visible and actually required by config — an optional or hidden field shouldn't block
  // (or even mention) profile completion.
  const checks = [
    { label: 'Nome completo', ok: formik.values.fullName.trim().length > 0 },
    ...(documentField.visible && documentField.required
      ? [
          {
            label: 'Documento válido (CPF/CNPJ)',
            ok: validateDocument(formik.values.documentType, formik.values.documentNumber),
          },
        ]
      : []),
    { label: 'Foto de perfil', ok: formik.values.avatarUrl.trim().length > 0 },
    {
      label: 'Endereço (CEP, estado, cidade)',
      ok:
        formik.values.zipCode.trim().length > 0 &&
        formik.values.state.trim().length > 0 &&
        formik.values.city.trim().length > 0,
    },
  ];
  const completedChecks = checks.filter((c) => c.ok).length;

  return (
    <div className="space-y-6">
      {/* Completion checklist */}
      <Card className="border-muted/50 bg-muted/20">
        <CardContent className="pt-4">
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-border/50 bg-background/70 px-3 py-2">
            <div className="flex items-center gap-1.5 text-sm">
              <CheckCircle2
                className={
                  isAccountApproved
                    ? 'h-4 w-4 text-emerald-500'
                    : 'h-4 w-4 text-muted-foreground/40'
                }
              />
              <span className="text-muted-foreground">Status da conta:</span>
              <span
                className={
                  isAccountApproved ? 'font-medium text-emerald-600' : 'font-medium text-foreground'
                }
              >
                {accountStatusLabel}
              </span>
            </div>
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Para concluir esta etapa ({completedChecks}/{checks.length})
          </p>
          <ul className="space-y-1.5">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm">
                <CheckCircle2
                  className={c.ok ? 'h-4 w-4 text-emerald-500' : 'h-4 w-4 text-muted-foreground/40'}
                />
                <span className={c.ok ? 'text-foreground' : 'text-muted-foreground'}>
                  {c.label}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Dados pessoais</CardTitle>
              <CardDescription>Preencha suas informações para continuar.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!loaded ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <form onSubmit={form.handleSubmit} noValidate className="space-y-6">
              {/* Feedback */}
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg border border-emerald-300/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {success}
                </div>
              )}

              {/* Identificação */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Identificação
                </legend>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">
                      Nome completo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="Seu nome completo"
                      {...formik.getFieldProps('fullName')}
                    />
                    {formik.touched.fullName && formik.errors.fullName && (
                      <p className={errorTextClass}>{formik.errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="displayName">
                      Nome de exibição <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                        @
                      </span>
                      <Input
                        id="displayName"
                        placeholder="seu_usuario"
                        className="pl-7"
                        name="displayName"
                        maxLength={20}
                        value={formik.values.displayName}
                        onBlur={formik.handleBlur}
                        onChange={handleDisplayNameChange}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Sem espaços — use &quot;_&quot; para separar palavras.
                      </p>
                      <p className="shrink-0 text-xs text-muted-foreground">
                        {formik.values.displayName.length}/20
                      </p>
                    </div>
                    {/* Only once user_data has actually been saved (has an id) — before that,
                        /prestador/<displayName> 404s since the RPC finds no row to show. */}
                    {existingId && formik.values.displayName && (
                      <a
                        href={`/prestador/${formik.values.displayName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2 hover:no-underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver seu perfil público
                      </a>
                    )}
                    {formik.touched.displayName && formik.errors.displayName && (
                      <p className={errorTextClass}>{formik.errors.displayName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Foto de perfil</Label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted transition-colors hover:border-primary hover:bg-muted/70 disabled:opacity-60"
                      title="Clique para escolher uma foto"
                    >
                      {formik.values.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={formik.values.avatarUrl}
                          alt="Foto de perfil"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={avatarUploading}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        {avatarUploading
                          ? 'Enviando...'
                          : formik.values.avatarUrl
                            ? 'Alterar foto'
                            : 'Escolher foto'}
                      </Button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        JPG, PNG ou WebP · máx. 2 MB
                      </p>
                    </div>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => void handleAvatarChange(e)}
                  />
                  {avatarError && <p className={errorTextClass}>{avatarError}</p>}
                </div>
              </fieldset>

              {/* Documento — visibilidade/obrigatoriedade/tipos aceitos vêm de
                  auth.system_config (user_data.document_field), ver AccountFormProps. */}
              {documentField.visible && (
                <fieldset className="space-y-4">
                  <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Documento
                  </legend>

                  <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
                    <div className="space-y-1.5">
                      <Label htmlFor="documentType">
                        Tipo {documentField.required && <span className="text-destructive">*</span>}
                      </Label>
                      <select
                        id="documentType"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        name="documentType"
                        value={formik.values.documentType}
                        onBlur={formik.handleBlur}
                        onChange={handleDocumentTypeChange}
                      >
                        {docTypes.includes('cpf') && <option value="cpf">CPF</option>}
                        {docTypes.includes('cnpj') && <option value="cnpj">CNPJ</option>}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="documentNumber">
                        Número{' '}
                        {documentField.required && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="documentNumber"
                        placeholder={
                          formik.values.documentType === 'cpf'
                            ? '000.000.000-00'
                            : '00.000.000/0000-00'
                        }
                        name="documentNumber"
                        value={formik.values.documentNumber}
                        onBlur={formik.handleBlur}
                        onChange={handleDocumentNumberChange}
                      />
                      {formik.touched.documentNumber && formik.errors.documentNumber && (
                        <p className={errorTextClass}>{formik.errors.documentNumber}</p>
                      )}
                    </div>
                  </div>

                  {/* Birth date only applies to CPF — a CNPJ is a company (no birth date) and is
                      public record already. Its own visibility comes from
                      user_data.birth_date_field. */}
                  {birthDateField.visible && formik.values.documentType === 'cpf' && (
                    <div className="max-w-xs space-y-1.5">
                      <Label htmlFor="birthDate">
                        Data de nascimento{' '}
                        {birthDateField.required && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="birthDate"
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        {...formik.getFieldProps('birthDate')}
                      />
                      {formik.touched.birthDate && formik.errors.birthDate && (
                        <p className={errorTextClass}>{formik.errors.birthDate}</p>
                      )}
                    </div>
                  )}

                  {/* Warning text is fully configurable (or turned off entirely) via
                      user_data.document_field.warning — no hardcoded copy here anymore. */}
                  {documentField.warning && (
                    <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <p>{documentField.warning}</p>
                    </div>
                  )}
                </fieldset>
              )}

              {/* Contato */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Contato
                </legend>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      readOnly
                      aria-readonly="true"
                      className="cursor-not-allowed opacity-70"
                      {...formik.getFieldProps('email')}
                    />
                    <p
                      className={
                        emailVerified
                          ? 'flex items-center gap-1 text-xs text-emerald-600'
                          : 'flex items-center gap-1 text-xs text-amber-600'
                      }
                    >
                      <CheckCircle2
                        className={
                          emailVerified
                            ? 'h-3.5 w-3.5 text-emerald-500'
                            : 'h-3.5 w-3.5 text-amber-500'
                        }
                      />
                      {emailVerified ? 'E-mail verificado' : 'E-mail pendente de verificacao'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      O e-mail nao pode ser alterado aqui.
                    </p>
                    {formik.touched.email && formik.errors.email && (
                      <p className={errorTextClass}>{formik.errors.email}</p>
                    )}

                    {!emailVerified && (
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href="/painel/onboarding/email-verification"
                          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                        >
                          Começar verificação
                        </a>
                        <span className="text-xs text-muted-foreground">
                          Clique para ir à página de verificação
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      {...formik.getFieldProps('phone')}
                    />
                    <p
                      className={
                        phoneVerified
                          ? 'flex items-center gap-1 text-xs text-emerald-600'
                          : 'flex items-center gap-1 text-xs text-amber-600'
                      }
                    >
                      <CheckCircle2
                        className={
                          phoneVerified
                            ? 'h-3.5 w-3.5 text-emerald-500'
                            : 'h-3.5 w-3.5 text-amber-500'
                        }
                      />
                      {phoneVerified ? 'Telefone verificado' : 'Telefone pendente de verificacao'}
                    </p>
                  </div>
                </div>
              </fieldset>

              {/* Localização */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Localização
                </legend>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="zipCode">
                      CEP {cepLookupLoading && <span className="text-muted-foreground">(buscando...)</span>}
                    </Label>
                    <Input
                      id="zipCode"
                      placeholder="00000-000"
                      maxLength={9}
                      {...formik.getFieldProps('zipCode')}
                    />
                    <p className="text-xs text-muted-foreground">
                      Informe o CEP para preencher estado e cidade automaticamente.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="state">
                      Estado <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="state"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...formik.getFieldProps('state')}
                    >
                      <option value="">Selecione</option>
                      {STATES_BR.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {formik.touched.state && formik.errors.state && (
                      <p className={errorTextClass}>{formik.errors.state}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city">
                      Cidade <span className="text-destructive">*</span>
                    </Label>
                    <SearchableSelect
                      id="city"
                      value={formik.values.city}
                      onChange={(value) => formik.setFieldValue('city', value)}
                      onBlur={() => formik.setFieldTouched('city', true)}
                      options={cityOptions}
                      disabled={!formik.values.state}
                      placeholder={
                        !formik.values.state
                          ? 'Selecione o estado primeiro'
                          : cityOptionsLoading
                            ? 'Carregando cidades...'
                            : 'Selecione'
                      }
                    />
                    {formik.touched.city && formik.errors.city && (
                      <p className={errorTextClass}>{formik.errors.city}</p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Bio — same rich text editor as the service description (StepDescriptionForm),
                  so bio is HTML; the 500-char limit counts visible text (stripHtml), not markup. */}
              <div className="space-y-1.5">
                <Label htmlFor="bio">Sobre você</Label>
                <QuillEditor
                  value={formik.values.bio}
                  onChange={(value) => formik.setFieldValue('bio', value)}
                  placeholder="Conte um pouco sobre você..."
                />
                <p className="text-right text-xs text-muted-foreground">
                  {stripHtml(formik.values.bio).length}/500
                </p>
                {formik.touched.bio && formik.errors.bio && (
                  <p className={errorTextClass}>{formik.errors.bio}</p>
                )}
              </div>

              {formik.submitCount > 0 && !formik.isValid && (
                <div className="rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  Revise os campos destacados antes de salvar — alguns ainda precisam ser
                  preenchidos ou corrigidos.
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                {stepDone && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Etapa concluída
                  </p>
                )}
                <div className="ml-auto">
                  <Button type="submit" disabled={submitting || formik.isSubmitting}>
                    {submitting ? 'Salvando...' : 'Salvar e continuar'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
