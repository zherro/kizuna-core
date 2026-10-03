'use client';

import { ShieldCheck } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { Input } from '../../ui/input';
import type {
  UserDataBirthDateFieldConfig,
  UserDataDocumentFieldConfig,
} from '../user-data-fields-config';
import { Field, SectionCard } from './section-card';
import { fieldError, type AccountFormik } from './types';

type Props = {
  formik: AccountFormik;
  documentField: UserDataDocumentFieldConfig;
  birthDateField: UserDataBirthDateFieldConfig;
  docTypes: Array<'cpf' | 'cnpj'>;
  onDocumentTypeChange: (type: 'cpf' | 'cnpj') => void;
  onDocumentNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const DOC_LABEL = { cpf: 'CPF', cnpj: 'CNPJ' } as const;

export function PersonalSection({
  formik,
  documentField,
  birthDateField,
  docTypes,
  onDocumentTypeChange,
  onDocumentNumberChange,
}: Props) {
  const type = formik.values.documentType;
  const showBirthDate = documentField.visible && birthDateField.visible && type === 'cpf';

  return (
    <SectionCard
      id="dados-pessoais"
      title="Dados pessoais"
      description="Usados para confirmar quem você é. Não aparecem no seu perfil."
    >
      <Field label="Nome completo" htmlFor="fullName" error={fieldError(formik, 'fullName')}>
        <Input id="fullName" placeholder="Como está no seu documento" {...formik.getFieldProps('fullName')} />
      </Field>

      {documentField.visible ? (
        <Field
          label="Documento"
          htmlFor="documentNumber"
          optional={!documentField.required}
          error={fieldError(formik, 'documentNumber')}
        >
          <div className="flex gap-2">
            {docTypes.length > 1 ? (
              <div
                role="radiogroup"
                aria-label="Tipo de documento"
                className="flex shrink-0 rounded-[var(--ui-radius-field,0.375rem)] bg-muted p-0.5"
              >
                {docTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={type === t}
                    onClick={() => onDocumentTypeChange(t)}
                    className={cn(
                      'rounded-[calc(var(--ui-radius-field,0.375rem)-2px)] px-3 text-sm font-medium transition-colors',
                      type === t
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {DOC_LABEL[t]}
                  </button>
                ))}
              </div>
            ) : (
              <span className="flex shrink-0 items-center rounded-[var(--ui-radius-field,0.375rem)] bg-muted px-3 text-sm font-medium text-muted-foreground">
                {DOC_LABEL[type]}
              </span>
            )}
            <Input
              id="documentNumber"
              name="documentNumber"
              inputMode="numeric"
              placeholder={type === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
              value={formik.values.documentNumber}
              onBlur={formik.handleBlur}
              onChange={onDocumentNumberChange}
            />
          </div>
        </Field>
      ) : null}

      {showBirthDate ? (
        <div className="max-w-xs">
          <Field
            label="Data de nascimento"
            htmlFor="birthDate"
            optional={!birthDateField.required}
            error={fieldError(formik, 'birthDate')}
          >
            <Input
              id="birthDate"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              {...formik.getFieldProps('birthDate')}
            />
          </Field>
        </div>
      ) : null}

      {documentField.visible && documentField.warning ? (
        <p className="flex items-start gap-2 rounded-[var(--ui-radius-card-sm,0.75rem)] bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          {documentField.warning}
        </p>
      ) : null}
    </SectionCard>
  );
}
