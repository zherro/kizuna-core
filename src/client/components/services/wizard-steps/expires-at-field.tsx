'use client';

import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  endOfLocalDayToIso,
  isoToLocalDate,
  isoToLocalTime,
  localDateTimeToIso,
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
  /** Rótulo do campo de hora de término. */
  timeLabel?: string;
  /** Dica sob o campo, mostrada quando já há data. */
  timeHint?: string;
};

export const EXPIRES_AT_DEFAULTS: Required<ExpiresAtLabels> = {
  label: 'Válido até',
  optional: '(opcional)',
  hint: 'Depois dessa data o anúncio deixa de valer. Sem hora de término, o prazo vai até o fim do dia escolhido.',
  clear: 'Limpar data',
  required: 'Informe até quando o anúncio vale',
  past: 'A data não pode estar no passado',
  timeLabel: 'Hora de término (opcional)',
  timeHint: 'Informe a hora para o anúncio sair no horário certo. Sem hora, vale o fim do dia.',
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
 * Campo da validade do anúncio (`services.expires_at`): data + hora de término opcional. Sem hora,
 * grava o fim do dia escolhido; com hora, aquele horário local. Compartilhado entre os passos do
 * wizard — cada um decide se e onde mostra.
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
  const date = isoToLocalDate(value);
  const time = isoToLocalTime(value);
  const labelClass = 'block text-sm font-medium text-foreground';
  return (
    <div className="space-y-1.5">
      <div className="grid max-w-xl grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_9.5rem_auto]">
        <div className="space-y-1.5">
          <label htmlFor={id} className={labelClass}>
            {labels.label}
            {mode === 'optional' ? ` ${labels.optional}` : ''}
          </label>
          <Input
            id={id}
            type="date"
            value={date}
            min={isoToLocalDate(new Date().toISOString())}
            onChange={(event) => {
              const next = event.target.value;
              // trocar o dia mantém a hora de término já escolhida
              onChange(time ? localDateTimeToIso(next, time) : endOfLocalDayToIso(next));
            }}
            aria-invalid={error ? true : undefined}
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${id}-time`} className={labelClass}>
            {labels.timeLabel}
          </label>
          <Input
            id={`${id}-time`}
            type="time"
            value={time}
            disabled={!date}
            onChange={(event) => {
              const next = event.target.value;
              // hora limpa volta ao fim do dia, mantendo a data
              onChange(next ? localDateTimeToIso(date, next) : endOfLocalDayToIso(date));
            }}
            aria-invalid={error ? true : undefined}
            className="h-12 text-base"
          />
        </div>
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
      {date && !error ? <p className="text-xs text-muted-foreground">{labels.timeHint}</p> : null}
    </div>
  );
}
