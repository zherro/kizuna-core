'use client';

import { useMemo, useState } from 'react';
import {
  FormBuilder,
  FormRenderer,
  FormResultViewer,
  createField,
  validate,
  type FormSchema,
  type FormValues,
} from '../form-builder';

function seedSchema(): FormSchema {
  const watts = createField('number');
  watts.key = 'potencia_watts';
  watts.name = 'potencia_watts';
  watts.label = 'Potencia total (W)';
  watts.behavior = { ...watts.behavior, required: true };
  watts.validation = { ...watts.validation, min: 100 };

  const emergencia = createField('switch');
  emergencia.key = 'atende_emergencia';
  emergencia.name = 'atende_emergencia';
  emergencia.label = 'Atende chamados de emergencia';

  return {
    title: 'Detalhes do servico de som',
    description: 'Perguntas dinamicas por categoria (exemplo).',
    fields: [watts, emergencia],
  };
}

/**
 * Backend-free showcase for the `forms` plugin's consumer-facing pieces: a `FormBuilder` whose
 * schema feeds a live `FormRenderer` (with `validate()` gating a fake "continuar") and a
 * `FormResultViewer` rendering the captured answers. `FormsAdmin` / `DynamicFormStep` need the
 * resource route + RPC, so they are demoed against this same in-memory schema, not the network.
 */

export function FormsShowcaseDemo() {
  const [schema, setSchema] = useState<FormSchema>(seedSchema);
  const [values, setValues] = useState<FormValues>({});
  const [captured, setCaptured] = useState<FormValues | null>(null);

  const errors = useMemo(() => validate(schema, values), [schema, values]);
  const valid = Object.keys(errors).length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-2">
        <h4 className="text-sm font-medium">1. Autoria (FormBuilder)</h4>
        <FormBuilder value={schema} onChange={setSchema} />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">2. Preenchimento (FormRenderer + validate)</h4>
          <FormRenderer schema={schema} values={values} onChange={setValues} />
          <button
            type="button"
            disabled={!valid}
            onClick={() => setCaptured(values)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            Continuar
          </button>
          {!valid ? (
            <p className="text-xs text-red-400">
              {Object.values(errors)[0]}
            </p>
          ) : null}
        </div>

        {captured ? (
          <div className="space-y-2 border-t border-border pt-4">
            <h4 className="text-sm font-medium">3. Resultado (FormResultViewer)</h4>
            <FormResultViewer schema={schema} values={captured} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
