import {
  NON_VALUE_TYPES,
  fieldKey,
  isFieldVisible,
  type FormSchema,
  type FormValues,
} from '../../form-builder';

function formatValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return String(value);
}

/**
 * Renderização pública das respostas dinâmicas por categoria de um serviço (ver
 * `fn_get_public_service_form_answers`, plugin `services`) — uma versão mais leve do
 * `FormResultViewer` do core, que é pensado pra revisão admin/dev, não pra quem está lendo um
 * anúncio.
 */
export function AdExtraFields({ schema, answers }: { schema: FormSchema; answers: FormValues }) {
  const fields = schema.fields.filter(
    (field) => !NON_VALUE_TYPES.has(field.type) && field.type !== 'hidden'
  );
  if (fields.length === 0) return null;

  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
      {fields.map((field) => {
        const key = fieldKey(field);
        const visible = isFieldVisible(field, answers);
        if (!visible) return null;

        return (
          <div key={field.id}>
            <div className="text-xs text-muted-foreground">{field.label || key}</div>
            <div className="text-sm font-medium">{formatValue(answers[key])}</div>
          </div>
        );
      })}
    </div>
  );
}
