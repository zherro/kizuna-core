'use client';

import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  endOfLocalDayToIso,
  isoToLocalDate,
  type ExpiresAtError,
  type ExpiresAtMode,
} from './price-options';

/** Textos do campo de validade. Todos opcionais: o que faltar cai no padrão de `EXPIRES_AT_DEFAULTS`. */
export type ExpiresAtLabels = {
  label?: string;
  optional?: string;
  hint?: string;
  clear?: string;
  required?: string;
  past?: string;
};

export const EXPIRES_AT_DEFAULTS: Required<ExpiresAtLabels> = {
  label: 'Válido até',
  optional: '(opcional)',
  hint: 'Depois dessa data o anúncio deixa de valer. O prazo termina no fim do dia escolhido.',
  clear: 'Limpar data',
  required: 'Informe até quando o anúncio vale',
  past: 'A data não pode estar no passado',
};

/** Junta os textos na ordem: `overrides` (config do projeto) → `base` (mensagens i18n) → padrão do core. */
export function resolveExpiresAtLabels(
  ...layers: Array<ExpiresAtLabels | undefined>
): Required<ExpiresAtLabels> {
  const out: Required<ExpiresAtLabels> = { ...EXPIRES_AT_DEFAULTS };
  for (const layer of layers) {
    if (!layer) continue;
    for (const key of Object.keys(out) as Array<keyof ExpiresAtLabels>) {
      const value = layer[key];
      if (typeof value === 'string' && value.trim()) out[key] = value;
    }
  }
  return out;
}

/**
 * Campo de data da validade do anúncio (`services.expires_at`, fim do dia escolhido). Compartilhado
 * entre o passo de preço e o passo do formulário dinâmico — cada um decide se e onde mostra.
 */
export function ExpiresAtField({
  id,
  mode,
  value,
  error,
  labels,
  onChange,
}: {
  id: string;
  mode: Exclude<ExpiresAtMode, 'hidden'>;
  value: string | null | undefined;
  error: ExpiresAtError;
  labels: Required<ExpiresAtLabels>;
  onChange: (iso: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {labels.label}
        {mode === 'optional' ? ` ${labels.optional}` : ''}
      </label>
      <div className="flex max-w-md gap-2">
        <Input
          id={id}
          type="date"
          value={isoToLocalDate(value)}
          min={isoToLocalDate(new Date().toISOString())}
          onChange={(event) => onChange(endOfLocalDayToIso(event.target.value))}
          aria-invalid={error ? true : undefined}
          className="h-12 text-base"
        />
        {value ? (
          <Button
            type="button"
            variant="outline"
            className="h-12 shrink-0"
            onClick={() => onChange(null)}
          >
            {labels.clear}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error === 'past' ? labels.past : labels.required}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{labels.hint}</p>
      )}
    </div>
  );
}
