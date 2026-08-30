'use client';

import { useEffect, useRef, useState } from 'react';
import * as Yup from 'yup';
import { CheckCircle2, ShieldCheck, Upload, User } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { QuillEditor } from './ui/quill-editor';
import { useAuth } from '../providers/auth-provider';
import { useForm } from '../hooks/use-form';

/**
 * Generic `user_data` plugin form template — same contract as `LoginPageContent`/
 * `RegisterPageContent` (login-page.tsx, register-page.tsx): a self-contained UI + data-fetch/save
 * template a consuming project renders directly or wraps, no business logic baked in. Ported out
 * of foco-total's `AccountForm` (see that file's own doc comment for the migration story) — what
 * stayed here is everything driven purely by the `user_data` plugin table
 * (plugins/user_data/0001_user_data.sql) and `UserDataFieldsConfig`; what got left behind in the
 * consuming project (as callbacks/slots below) is genuinely project-specific:
 *
 * - Document validation (`validateDocument` prop, required) — CPF/CNPJ algorithm is Brazil-only
 *   content, not form shape. A project targeting another country passes its own.
 * - Avatar upload (`onUploadAvatar` prop, required) — which endpoint/storage convention receives
 *   the file is entirely a project's own call (foco-total uses `/api/storage/files`).
 * - "Ver perfil público" link (`publicProfileHref` prop, optional) — the public profile route
 *   shape (foco-total: `/prestador/:id`) is a project's routing decision.
 * - `statusBadge`/`footerExtra` slots — anything a project wants to show inside this card that
 *   isn't part of the generic `user_data` table (foco-total's moderation `status` column, its
 * onboarding-step "Etapa concluída ✓" line) is NOT part of this table (see the plugin SQL's own
 *   comment on why `status` was trimmed) — inject it via these slots instead of forking the
 *   template.
 * - `onSaved` callback — anything that should happen after a successful save besides showing the
 *   success message (foco-total: marking an onboarding step complete) is the project's call.
 */

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

const DEFAULT_ACCEPTED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_MAX_AVATAR_FILE_SIZE_MB = 2;

/** Approximates visible text length of the QuillEditor's HTML output, for length checks/counters.
 * Small enough to keep as a local copy instead of importing a project's own string-utils module. */
function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Shape of the two `auth.system_config` keys this form can be driven by (a project reads them
 * server-side, e.g. via its own `system_config` resource, and passes the result as `fieldsConfig`
 * — see foco-total's `src/lib/server/user-data-fields-config.ts` for a worked example). `mask`
 * isn't a formatting-library name — this component already knows how to format both cpf and cnpj
 * on its own (`applyDocumentMask` below) — it's which document type(s) the dropdown offers.
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

/** Used when a project has no config source yet (or hasn't wired one) — everything visible,
 * nothing required, so the form never breaks waiting on config that isn't there. */
export const DEFAULT_USER_DATA_FIELDS_CONFIG: UserDataFieldsConfig = {
  documentField: { visible: true, required: false, mask: 'cpf_cnpj', warning: null },
  birthDateField: { visible: true, required: false },
};

function allowedDocumentTypes(mask: UserDataDocumentFieldConfig['mask']): Array<'cpf' | 'cnpj'> {
  if (mask === 'cpf') return ['cpf'];
  if (mask === 'cnpj') return ['cnpj'];
  return ['cpf', 'cnpj'];
}

export type UserDataFormValues = {
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

function buildInitialValues(config: UserDataFieldsConfig): UserDataFormValues {
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

function buildValidationSchema(
  config: UserDataFieldsConfig,
  validateDocument: (type: 'cpf' | 'cnpj', value: string) => boolean
) {
  const { documentField, birthDateField } = config;
  const docTypes = allowedDocumentTypes(documentField.mask);

  return Yup.object({
    fullName: Yup.string().trim().required('Informe o nome completo.'),
    displayName: Yup.string()
      .trim()
      .required('Informe o nome de exibição.')
      .max(20, 'Máximo de 20 caracteres.')
      .matches(/^\S+$/, 'Não pode conter espaços — use "_" para separar palavras.'),
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
                const type = (this.parent as UserDataFormValues).documentType;
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
                const type = (this.parent as UserDataFormValues).documentType;
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
                    .test('birth-date-min-age', 'É preciso ter pelo menos 18 anos.', (value) => {
                      if (!value) return false;
                      const birth = new Date(value);
                      if (Number.isNaN(birth.getTime())) return false;
                      const eighteenYearsAgo = new Date();
                      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
                      return birth <= eighteenYearsAgo;
                    })
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
    // `bio` is QuillEditor HTML — length must be checked on the visible text (stripHtml), not the
    // raw markup.
    bio: Yup.string().test(
      'bio-max-length',
      'Máximo de 500 caracteres.',
      (value) => stripHtml(value ?? '').length <= 500
    ),
  });
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

type SaveHelpers = {
  setSuccess: (message: string) => void;
};

export type UserDataFormProps = {
  /** Server-fetched field visibility/requirement config. Defaults to everything visible/optional. */
  fieldsConfig?: UserDataFieldsConfig;
  /** `postgrestResources` name backing this form. Defaults to `'user_data'` (the plugin's own
   * table) — override only if a project renamed it. */
  resource?: string;
  /** CPF/CNPJ (or whatever a project's document scheme is) validity check — content, not form
   * shape, so it's never baked in here. Required: pass `() => true` to disable validation. */
  validateDocument: (type: 'cpf' | 'cnpj', value: string) => boolean;
  /** Uploads the chosen avatar file and resolves the URL to store. Reject/throw (or return an
   * object with `error`) to surface a message instead. */
  onUploadAvatar: (file: File) => Promise<{ url: string } | { error: string }>;
  maxAvatarSizeMb?: number;
  acceptedAvatarMimeTypes?: string[];
  /** Optional "Ver perfil público" link builder — omit to hide the link entirely. */
  publicProfileHref?: (userId: string) => string | null | undefined;
  title?: string;
  description?: string;
  /** Extra content rendered inside the completion-checklist card, above the checklist itself —
   * e.g. a moderation/status chip that isn't part of the generic `user_data` table. */
  statusBadge?: React.ReactNode;
  /** Extra content rendered next to the submit button (e.g. an "Etapa concluída" indicator tied
   * to a project's own onboarding flow). */
  footerExtra?: React.ReactNode;
  /** Called after a successful save, in addition to the built-in success message. Receives the
   * submitted values, the saved record (already through `resource`'s `mapOutput`, if any), and a
   * `setSuccess` helper to override/append to the shown message. */
  onSaved?: (
    values: UserDataFormValues,
    item: Record<string, unknown> | undefined,
    helpers: SaveHelpers
  ) => Promise<void> | void;
  /** Called once the existing `user_data` row (if any) is fetched on mount — lets a project read
   * columns this template doesn't know about (e.g. a project-specific `status` column) off the
   * raw record. */
  onRecordLoaded?: (record: Record<string, unknown> | null) => void;
};

/**
 * `user_data` profile form: identification, document, contact, location and bio. Resolves
 * create-vs-update itself (a plain GET against `resource`, scoped by RLS to the caller's own row)
 * and feeds it to `useForm`'s `resourceSubmit.selectedId` — same create/update dispatch every
 * other resource-backed form relies on.
 */
export function UserDataForm({
  fieldsConfig = DEFAULT_USER_DATA_FIELDS_CONFIG,
  resource = 'user_data',
  validateDocument,
  onUploadAvatar,
  maxAvatarSizeMb = DEFAULT_MAX_AVATAR_FILE_SIZE_MB,
  acceptedAvatarMimeTypes = DEFAULT_ACCEPTED_AVATAR_MIME_TYPES,
  publicProfileHref,
  title = 'Dados pessoais',
  description = 'Preencha suas informações para continuar.',
  statusBadge,
  footerExtra,
  onSaved,
  onRecordLoaded,
}: UserDataFormProps) {
  const { user } = useAuth();
  const { documentField, birthDateField } = fieldsConfig;
  const docTypes = allowedDocumentTypes(documentField.mask);
  const acceptedMimeSet = new Set(acceptedAvatarMimeTypes);
  const [existingId, setExistingId] = useState<string | null | undefined>(undefined);
  const [existingRecord, setExistingRecord] = useState<Record<string, unknown> | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Resolves whether this user already has a row — drives create-vs-update below.
  useEffect(() => {
    let active = true;

    const loadExisting = async () => {
      try {
        const response = await fetch(`/api/resources/${resource}?page=1&pageSize=1`);
        if (!response.ok) {
          if (active) {
            setExistingId(null);
            onRecordLoaded?.(null);
          }
          return;
        }
        const data = (await response.json().catch(() => null)) as {
          items?: Array<Record<string, unknown>>;
        } | null;
        const record = data?.items?.[0] ?? null;
        if (!active) return;
        setExistingId(record?.id != null ? String(record.id) : null);
        if (record) {
          setExistingRecord(record);
          setEmailVerified(Boolean(record.emailVerified));
          setPhoneVerified(Boolean(record.phoneVerified));
        }
        onRecordLoaded?.(record);
      } catch {
        if (active) {
          setExistingId(null);
          onRecordLoaded?.(null);
        }
      }
    };

    void loadExisting();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  const form = useForm<UserDataFormValues, Record<string, unknown>, Record<string, unknown>>({
    initialValues: buildInitialValues(fieldsConfig),
    validationSchema: buildValidationSchema(fieldsConfig, validateDocument),
    resourceSubmit: {
      resource,
      selectedId: existingId,
      // `documentNumber` is stored as digits-only — the mask below is display-only. `userId`
      // isn't a form field: the plugin's `mapInput` requires it on create, and there's no
      // server-side default for it the way `uid`/`tenant_id`/`created_by` have.
      toPayload: (values) => ({
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
      errorMessage: 'Não foi possível salvar seus dados.',
      successMessage: 'Dados salvos com sucesso!',
      connectionErrorMessage: 'Não foi possível conectar ao servidor.',
      onSuccess: async (result, { setSuccess }) => {
        const item = result.item as Record<string, unknown> | undefined;
        if (item?.id != null) setExistingId(String(item.id));
        if (onSaved) await onSaved(form.formik.values, item, { setSuccess });
      },
    },
  });

  const { formik, error, success, submitting } = form;
  const loaded = existingId !== undefined;

  // `useForm` only submits (create/update) — it never fetches+prefills by
  // `resourceSubmit.selectedId`. Prefill is reimplemented locally here off the same
  // `existingRecord` `loadExisting` already fetches, instead of leaving the form blank on repeat
  // visits.
  useEffect(() => {
    if (!existingRecord) return;
    void formik.setValues({
      fullName: String(existingRecord.fullName ?? ''),
      displayName: String(existingRecord.displayName ?? ''),
      phone: String(existingRecord.phone ?? ''),
      email: String(existingRecord.email ?? ''),
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

  // Shown with an "@" prefix like a handle — no spaces allowed, so instead of rejecting them
  // outright (annoying mid-typing), a space becomes "_" as the user types.
  function handleDisplayNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    void formik.setFieldValue('displayName', e.target.value.replace(/\s/g, '_').slice(0, 20));
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!acceptedMimeSet.has(file.type)) {
      setAvatarError('Selecione uma imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > maxAvatarSizeMb * 1024 * 1024) {
      setAvatarError(`A imagem deve ter no máximo ${maxAvatarSizeMb} MB.`);
      return;
    }

    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const result = await onUploadAvatar(file);
      if ('error' in result) {
        setAvatarError(result.error || 'Não foi possível enviar a foto.');
        return;
      }
      void formik.setFieldValue('avatarUrl', result.url);
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
  const profileHref = user?.user_id ? publicProfileHref?.(user.user_id) : null;

  return (
    <div className="space-y-6">
      {/* Completion checklist */}
      <Card className="border-muted/50 bg-muted/20">
        <CardContent className="pt-4">
          {statusBadge && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-border/50 bg-background/70 px-3 py-2">
              {statusBadge}
            </div>
          )}
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
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
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
                    {profileHref && (
                      <a
                        href={profileHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2 hover:no-underline"
                      >
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
                        JPG, PNG ou WebP · máx. {maxAvatarSizeMb} MB
                      </p>
                    </div>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept={acceptedAvatarMimeTypes.join(',')}
                    className="hidden"
                    onChange={(e) => void handleAvatarChange(e)}
                  />
                  {avatarError && <p className={errorTextClass}>{avatarError}</p>}
                </div>
              </fieldset>

              {/* Documento — visibilidade/obrigatoriedade/tipos aceitos vêm de `fieldsConfig`. */}
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

                  {/* Birth date only applies to CPF — a CNPJ is a company (no birth date). */}
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
                      `fieldsConfig.documentField.warning` — no hardcoded copy here. */}
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
                      {emailVerified ? 'E-mail verificado' : 'E-mail pendente de verificação'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      O e-mail não pode ser alterado aqui.
                    </p>
                    {formik.touched.email && formik.errors.email && (
                      <p className={errorTextClass}>{formik.errors.email}</p>
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
                      {phoneVerified ? 'Telefone verificado' : 'Telefone pendente de verificação'}
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
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      placeholder="00000-000"
                      maxLength={9}
                      {...formik.getFieldProps('zipCode')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="state">Estado</Label>
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
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" placeholder="Sua cidade" {...formik.getFieldProps('city')} />
                  </div>
                </div>
              </fieldset>

              {/* Bio — QuillEditor HTML; the 500-char limit counts visible text (stripHtml), not
                  markup. */}
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

              <div className="flex items-center justify-between gap-4">
                {footerExtra}
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
