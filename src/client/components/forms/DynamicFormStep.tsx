'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FormRenderer, validate, type FormSchema, type FormValues } from '../form-builder';
import { useFormAnswers } from './use-form-answers';

export type DynamicFormStepHandle = {
  /** Persist the current answers via `fn_form_result_upsert`. Resolves `true` on success. */
  persist: () => Promise<boolean>;
  /** Current answers as the flat `{ [key]: value }` map emitted by `FormRenderer`. */
  getValues: () => FormValues;
};

type DynamicFormStepProps = {
  formKey: string;
  domain: string;
  referenceId: string;
  /** Reported whenever validity changes — the wizard gates "continuar" on this. */
  onValidChange?: (valid: boolean) => void;
  className?: string;
};

/**
 * Wizard-step wrapper around the form-builder `FormRenderer`. Loads any existing answers for the
 * `(formKey, domain, referenceId)` triple, renders the form, runs `validate()` on every change
 * and reports validity up, and exposes an imperative `persist()` (call it from the wizard's own
 * step-level persist) that upserts through `fn_form_result_upsert`.
 */
export const DynamicFormStep = forwardRef<DynamicFormStepHandle, DynamicFormStepProps>(
  function DynamicFormStep(
    { formKey, domain, referenceId, onValidChange, className },
    ref
  ) {
    const { data, loading, error, submit } = useFormAnswers({ formKey, domain, referenceId });
    const [values, setValues] = useState<FormValues>({});
    const [hydrated, setHydrated] = useState(false);

    // Prefer the frozen schema_snapshot from an existing capture; the live form schema is loaded
    // lazily below only when there is no capture yet.
    const [liveSchema, setLiveSchema] = useState<FormSchema | null>(null);
    const schema: FormSchema | null = useMemo(() => {
      if (data?.schemaSnapshot && Object.keys(data.schemaSnapshot).length > 0) {
        return data.schemaSnapshot;
      }
      return liveSchema;
    }, [data?.schemaSnapshot, liveSchema]);

    useEffect(() => {
      if (loading || hydrated) return;
      setValues(data?.answers ?? {});
      setHydrated(true);
    }, [loading, hydrated, data?.answers]);

    // No capture yet → fetch the live form definition by form_key.
    useEffect(() => {
      if (loading || data || liveSchema || !formKey) return;
      let active = true;
      (async () => {
        try {
          const query = new URLSearchParams({
            page: '1',
            pageSize: '1',
            'filter.form_key': formKey,
            'filter.active': 'true',
          });
          const response = await fetch(`/api/resources/forms?${query.toString()}`, {
            cache: 'no-store',
          });
          const payload = (await response.json().catch(() => null)) as
            | { items?: Array<{ schema?: FormSchema }> }
            | null;
          if (!active) return;
          const found = payload?.items?.[0]?.schema;
          if (found) setLiveSchema(found);
        } catch {
          /* handled by the empty-state below */
        }
      })();
      return () => {
        active = false;
      };
    }, [loading, data, liveSchema, formKey]);

    const errors = useMemo(
      () => (schema ? validate(schema, values) : {}),
      [schema, values]
    );
    const valid = Object.keys(errors).length === 0;

    const lastValidRef = useRef<boolean | null>(null);
    useEffect(() => {
      if (lastValidRef.current === valid) return;
      lastValidRef.current = valid;
      onValidChange?.(valid);
    }, [valid, onValidChange]);

    useImperativeHandle(
      ref,
      () => ({
        persist: async () => {
          const row = await submit(values);
          return row != null;
        },
        getValues: () => values,
      }),
      [submit, values]
    );

    if (loading) {
      return (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          Carregando formulario...
        </p>
      );
    }

    if (!schema) {
      return (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          {error || 'Formulario nao encontrado para esta categoria.'}
        </p>
      );
    }

    return (
      <div className={className}>
        {error ? (
          <p className="mb-3 text-xs text-red-400">{error}</p>
        ) : null}
        <FormRenderer schema={schema} values={values} onChange={setValues} />
      </div>
    );
  }
);
