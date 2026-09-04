'use client';

import { FormResultViewer, type FormSchema } from '../form-builder';
import { useFormAnswers } from './use-form-answers';

type FormResultsPanelProps = {
  formKey: string;
  domain: string;
  referenceId: string;
  /** Optional heading above the rendered answers. */
  title?: string;
  className?: string;
};

/**
 * Read-only render of the current `form_results` row for a `(formKey, domain, referenceId)`
 * triple, drawn against its frozen `schema_snapshot` so old captures stay renderable after the
 * form is edited. Use it in an admin/detail surface next to the entity the answers describe.
 */
export function FormResultsPanel({
  formKey,
  domain,
  referenceId,
  title = 'Respostas do formulario',
  className,
}: FormResultsPanelProps) {
  const { data, loading, error } = useFormAnswers({ formKey, domain, referenceId });

  return (
    <section className={className}>
      <h3 className="mb-2 text-sm font-medium text-foreground">{title}</h3>
      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : !data ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma resposta registrada para este item.
        </p>
      ) : (
        <FormResultViewer
          schema={(data.schemaSnapshot ?? {}) as FormSchema}
          values={data.answers ?? {}}
        />
      )}
    </section>
  );
}
