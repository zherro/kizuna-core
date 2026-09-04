'use client';

import { useState } from 'react';
import { FormBuilder } from './FormBuilder';
import { FormRenderer } from './FormRenderer';
import { FormResultViewer } from './FormResultViewer';
import type { FormSchema, FormValues } from './types';

const DEMO_SCHEMA: FormSchema = {
  title: 'Orçamento de serviço',
  description: 'Round-trip: builder → renderer → result viewer.',
  fields: [
    {
      id: 'f_nome',
      key: 'nome',
      name: 'nome',
      type: 'text',
      label: 'Seu nome',
      placeholder: 'João Silva',
      grid: { xs: 12, md: 6 },
      behavior: { required: true },
      validation: { minLength: 3 },
      appearance: { icon: 'User', tooltip: 'Como devemos te chamar' },
    },
    {
      id: 'f_categoria',
      key: 'categoria',
      name: 'categoria',
      type: 'select',
      label: 'Categoria',
      grid: { xs: 12, md: 6 },
      behavior: { required: true },
      validation: {},
      appearance: {},
      options: [
        { label: 'Elétrica', value: 'eletrica' },
        { label: 'Hidráulica', value: 'hidraulica' },
        { label: 'Outro', value: 'outro' },
      ],
    },
    {
      id: 'f_outro',
      key: 'qual_outro',
      name: 'qual_outro',
      type: 'text',
      label: 'Qual serviço?',
      grid: { xs: 12 },
      behavior: {},
      validation: {},
      appearance: {},
      visibleWhen: { field: 'categoria', op: 'eq', value: 'outro' },
    },
    {
      id: 'f_urgencia',
      key: 'urgencia',
      name: 'urgencia',
      type: 'slider',
      label: 'Urgência',
      grid: { xs: 12 },
      behavior: {},
      validation: {},
      appearance: { helpText: '0 = sem pressa, 10 = emergência' },
      min: 0,
      max: 10,
      step: 1,
    },
    {
      id: 'f_emergencia',
      key: 'atende_emergencia',
      name: 'atende_emergencia',
      type: 'switch',
      label: 'Preciso de atendimento hoje',
      grid: { xs: 12 },
      behavior: {},
      validation: {},
      appearance: {},
    },
  ],
};

export function FormBuilderShowcaseDemo() {
  const [schema, setSchema] = useState<FormSchema>(DEMO_SCHEMA);
  const [values, setValues] = useState<FormValues>({});

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border">
        <FormBuilder value={schema} onChange={setSchema} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
            FormRenderer (standalone)
          </p>
          <FormRenderer
            schema={schema}
            values={values}
            onChange={setValues}
            onSubmit={(out) => window.alert(JSON.stringify(out, null, 2))}
          />
        </div>
        <div className="rounded-lg border p-4">
          <FormResultViewer schema={schema} values={values} />
        </div>
      </div>
    </div>
  );
}
