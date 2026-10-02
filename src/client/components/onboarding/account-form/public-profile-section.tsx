'use client';

import { Input } from '../../ui/input';
import { QuillEditor } from '../../ui/quill-editor';
import { stripHtml } from '../../../../lib/helper/text.helper';
import { Field, SectionCard } from './section-card';
import { fieldError, type AccountFormik } from './types';

const BIO_MAX = 500;
const DISPLAY_NAME_MAX = 20;

export function PublicProfileSection({ formik }: { formik: AccountFormik }) {
  // Vira o slug do perfil público (/prestador/<nome>): só letras, números, "_" e "-". Espaço
  // vira "_" em vez de ser recusado (mais amigável digitando); o resto é descartado.
  function handleDisplayNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
      .replace(/\s/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, DISPLAY_NAME_MAX);
    void formik.setFieldValue('displayName', next);
  }

  const bioLength = stripHtml(formik.values.bio).length;

  return (
    <SectionCard title="Perfil público" description="O que as pessoas veem quando visitam seu perfil.">
      <Field
        label="Nome de exibição"
        htmlFor="displayName"
        hint='Aparece no endereço do seu perfil. Sem espaços, use "_" para separar.'
        error={fieldError(formik, 'displayName')}
        aside={
          <span className="text-xs text-muted-foreground">
            {formik.values.displayName.length}/{DISPLAY_NAME_MAX}
          </span>
        }
      >
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            @
          </span>
          <Input
            id="displayName"
            name="displayName"
            placeholder="seu_usuario"
            className="pl-7"
            maxLength={DISPLAY_NAME_MAX}
            value={formik.values.displayName}
            onBlur={formik.handleBlur}
            onChange={handleDisplayNameChange}
          />
        </div>
      </Field>

      <Field
        label="Sobre você"
        optional
        error={fieldError(formik, 'bio')}
        aside={
          <span className={bioLength > BIO_MAX ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
            {bioLength}/{BIO_MAX}
          </span>
        }
      >
        <QuillEditor
          value={formik.values.bio}
          onChange={(value) => formik.setFieldValue('bio', value)}
          placeholder="Conte um pouco sobre você e o que você faz..."
        />
      </Field>
    </SectionCard>
  );
}
