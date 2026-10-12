import {
  NON_VALUE_TYPES,
  fieldKey,
  isFieldVisible,
  type FormSchema,
  type FormValues,
} from '../../form-builder';

function formatScalar(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') {
    // item de lista (sessão, ingresso…): os valores preenchidos, na ordem do formulário
    return Object.values(value as Record<string, unknown>)
      .map(formatScalar)
      .filter(Boolean)
      .join(' · ');
  }
  return String(value);
}

/** Uma linha por item: listas de objetos (sessões, ingressos) não cabem numa vírgula só. */
function formatValue(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value];
  const lines = list.map(formatScalar).filter(Boolean);
  return lines.length ? lines : ['—'];
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
    <div className="grid gap-3 rounded-[var(--ui-radius-card,1rem)] border-[length:var(--ui-border-w-card,1px)] border-border shadow-[shadow:var(--ui-shadow-item,0_0_#0000)] bg-card p-5 sm:grid-cols-2">
      {fields.map((field) => {
        const key = fieldKey(field);
        const visible = isFieldVisible(field, answers);
        if (!visible) return null;

        return (
          <div key={field.id}>
            <div className="text-xs text-muted-foreground">{field.label || key}</div>
            <div className="text-sm font-medium">
              {formatValue(answers[key]).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
