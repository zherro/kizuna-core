'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Yup from 'yup';
import { useAuth } from '@kizuna/core/client/providers/auth-provider';
import { useForm } from '@kizuna/core/client';
import { validateDocument } from '../../../lib/validate-doc';
import { stripHtml } from '../../../lib/helper/text.helper';
import { useToast } from '../../hooks/use-toast';
import { useAccountLevel } from '../account-levels/use-account-level';
import { AddressSection } from './account-form/address-section';
import { ContactSection } from './account-form/contact-section';
import { PersonalSection } from './account-form/personal-section';
import { ProfileHeader } from './account-form/profile-header';
import { PublicProfileSection } from './account-form/public-profile-section';
import { SaveBar } from './account-form/save-bar';
import type { AccountFormValues } from './account-form/types';

const ACCEPTED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_AVATAR_FILE_SIZE_MB = 2;

export {
  DEFAULT_USER_DATA_FIELDS_CONFIG,
  type UserDataBirthDateFieldConfig,
  type UserDataDocumentFieldConfig,
  type UserDataFieldsConfig,
} from './user-data-fields-config';
import {
  DEFAULT_USER_DATA_FIELDS_CONFIG,
  type UserDataDocumentFieldConfig,
  type UserDataFieldsConfig,
} from './user-data-fields-config';

function allowedDocumentTypes(mask: UserDataDocumentFieldConfig['mask']): Array<'cpf' | 'cnpj'> {
  if (mask === 'cpf') return ['cpf'];
  if (mask === 'cnpj') return ['cnpj'];
  return ['cpf', 'cnpj'];
}

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
    cityIbge: '',
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
  const [legacyEmailVerified, setLegacyEmailVerified] = useState(false);
  const toast = useToast();
  const { status: levelStatus, refresh: refreshLevel } = useAccountLevel();
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
          setLegacyEmailVerified(Boolean(record.emailVerified));
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

      return progressRes.ok;
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
        const saved = form.formik.values;
        await afterUserDataSaved(item, saved);
        form.formik.resetForm({ values: saved });
        void refreshLevel();
        setSuccess(
          isStepComplete(saved, fieldsConfig) ? 'Perfil completo e salvo!' : 'Dados salvos.'
        );
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
  // resetForm (não setValues): os valores do banco viram o "estado salvo", então `dirty` só liga
  // quando o usuário mexe — é o que mostra/esconde a barra de salvar.
  useEffect(() => {
    if (!existingRecord) return;
    const docType = (
      docTypes.includes(existingRecord.documentType as 'cpf' | 'cnpj')
        ? existingRecord.documentType
        : docTypes[0]
    ) as 'cpf' | 'cnpj';
    formik.resetForm({
      values: {
      fullName: String(existingRecord.fullName ?? ''),
      displayName: String(existingRecord.displayName ?? ''),
      phone: String(existingRecord.phone ?? ''),
      // `user_data.email` is often blank on older rows — the account's real e-mail is the login
      // itself (`user.login`), so fall back to it instead of showing an empty, "not loaded" field.
      email: String(existingRecord.email || user?.login || ''),
      documentType: docType,
      documentNumber: applyDocumentMask(docType, String(existingRecord.documentNumber ?? '')),
      birthDate: existingRecord.birthDate ? String(existingRecord.birthDate).slice(0, 10) : '',
      zipCode: String(existingRecord.zipCode ?? ''),
      state: String(existingRecord.state ?? ''),
      city: String(existingRecord.city ?? ''),
      cityIbge: String(existingRecord.cityIbge ?? ''),
      bio: String(existingRecord.bio ?? ''),
      avatarUrl: String(existingRecord.avatarUrl ?? ''),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingRecord]);

  // Brand-new user (no `user_data` row yet, so the hydration effect above never runs) —
  // default the read-only e-mail field to the account's login so it isn't shown empty.
  useEffect(() => {
    if (existingRecord || existingId !== null) return;
    if (!user?.login || formik.values.email) return;
    formik.resetForm({ values: { ...formik.values, email: user.login } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingRecord, existingId, user?.login]);

  // ViaCEP integration: once the zip code has 8 digits, look up the address and auto-fill
  // state/city so the user doesn't have to type them by hand.
  useEffect(() => {
    const digits = formik.values.zipCode.replace(/\D/g, '');
    if (digits.length !== 8) return;
    // CEP já salvo: não reconsulta (sobrescreveria cidade escolhida à mão e sujaria o form).
    if (digits === formik.initialValues.zipCode.replace(/\D/g, '')) return;

    let active = true;
    setCepLookupLoading(true);

    fetch(`https://viacep.com.br/ws/${digits}/json/`)
      .then((res) => res.json())
      .then((data: { erro?: boolean; uf?: string; localidade?: string; ibge?: string }) => {
        if (!active || data.erro) return;
        if (data.uf) void formik.setFieldValue('state', data.uf);
        if (data.localidade) void formik.setFieldValue('city', data.localidade);
        // ViaCEP carries the IBGE municipality code — keep it so the exact-city match works
        // without the user re-picking the city from the dropdown.
        void formik.setFieldValue('cityIbge', data.ibge ?? '');
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
  // uses (`/api/agenda/cities?uf=`), whose `value` is the IBGE municipality code. The select
  // operates on that code (persisted to `user_data.city_ibge`); the plain-text `city` name is
  // kept in sync from the chosen option's label.
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
        setCityOptions(items.map((item) => ({ value: item.value, label: item.label })));
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

  // Legacy rows have `city` (name) but no `city_ibge` — once the option list for the state is
  // loaded, resolve the code by matching the stored name so the select shows the city and the
  // exact-match filter has something to work with.
  useEffect(() => {
    if (formik.values.cityIbge || !formik.values.city || cityOptions.length === 0) return;
    const match = cityOptions.find(
      (o) => o.label.trim().toLowerCase() === formik.values.city.trim().toLowerCase()
    );
    if (!match) return;
    if (formik.dirty) void formik.setFieldValue('cityIbge', match.value);
    else formik.resetForm({ values: { ...formik.values, cityIbge: match.value } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityOptions, formik.values.city, formik.values.cityIbge]);

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

  // Avisos do useForm viram toast — a barra de salvar fica no rodapé, longe de um aviso no topo.
  useEffect(() => {
    if (error) toast.error(error);
  }, [error, toast]);
  useEffect(() => {
    if (success) toast.success(success);
  }, [success, toast]);

  // Verificação vem do nível da conta (auth.users + user_data, ver 0115) — a mesma fonte que
  // libera as ações. `user_data.phone_verified` nunca é preenchido por fluxo verificado.
  const contactLevel = levelStatus?.levels.find((l) => l.requirement === 'contact_verified');
  const emailVerified = contactLevel
    ? !contactLevel.missing.includes('Verificar email')
    : legacyEmailVerified;
  const phoneVerified = contactLevel ? !contactLevel.missing.includes('Verificar celular') : false;

  function handleDocumentTypeChange(nextType: 'cpf' | 'cnpj') {
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
      const next = { ...formik.values, avatarUrl };

      // Persist immediately, bypassing Yup validation (saveUserData, not formik.submitForm) —
      // otherwise the URL only lived in local formik state: the avatar vanished on F5 (nothing
      // persisted), and it could never save at all if a required field like fullName/state/city
      // was still empty (those requirements are UI-only, see buildValidationSchema; the DB doesn't
      // enforce them, so a required-field gate here would silently drop the upload).
      const result = await saveUserData(next);
      if (!result.ok) {
        await formik.setFieldValue('avatarUrl', avatarUrl);
        setAvatarError(result.message ?? 'Foto enviada, mas não foi possível salvar o perfil.');
        return;
      }
      // saveUserData grava o formulário inteiro, então tudo que estava na tela agora está salvo.
      formik.resetForm({ values: next });
      void refreshLevel();
      toast.success('Foto atualizada.');
    } catch {
      setAvatarError('Não foi possível enviar a foto.');
    } finally {
      setAvatarUploading(false);
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-5" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-[var(--ui-radius-card-lg,1.5rem)] bg-muted/50"
          />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit} noValidate className="space-y-5">
      <ProfileHeader
        fullName={formik.values.fullName}
        displayName={formik.values.displayName}
        avatarUrl={formik.values.avatarUrl}
        avatarUploading={avatarUploading}
        avatarError={avatarError}
        avatarInputRef={avatarInputRef}
        onAvatarChange={(e) => void handleAvatarChange(e)}
        publicProfileAvailable={Boolean(existingId)}
        levelStatus={levelStatus}
      />

      <PublicProfileSection formik={formik} />

      <PersonalSection
        formik={formik}
        documentField={documentField}
        birthDateField={birthDateField}
        docTypes={docTypes}
        onDocumentTypeChange={handleDocumentTypeChange}
        onDocumentNumberChange={handleDocumentNumberChange}
      />

      <ContactSection
        formik={formik}
        emailVerified={emailVerified}
        phoneVerified={phoneVerified}
        onVerified={() => void refreshLevel()}
      />

      <AddressSection
        formik={formik}
        cepLoading={cepLookupLoading}
        cityOptions={cityOptions}
        cityOptionsLoading={cityOptionsLoading}
      />

      <SaveBar
        dirty={formik.dirty}
        saving={submitting || formik.isSubmitting}
        invalid={formik.submitCount > 0 && !formik.isValid}
        onDiscard={() => formik.resetForm()}
      />
    </form>
  );
}
