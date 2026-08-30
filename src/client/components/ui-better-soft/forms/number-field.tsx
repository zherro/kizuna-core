'use client';

import type { LucideIcon } from 'lucide-react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { cn } from '../../../../lib/utils';

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  icon?: LucideIcon;
  suffix?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
};

function clamp(value: number, min?: number, max?: number) {
  let next = value;
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return next;
}

/**
 * Numeric setting field: label + stepper (-/input/+) + optional suffix and hint.
 * Card shell matches ScheduleRow/ChoiceCard so it drops into the same settings grids.
 */
export function NumberField({
  label,
  value,
  onChange,
  icon: Icon,
  suffix,
  hint,
  min,
  max,
  step = 1,
  disabled,
}: Readonly<NumberFieldProps>) {
  const id = `number-field-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', disabled && 'opacity-70')}>
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
        <Label htmlFor={id} className="text-sm font-semibold">
          {label}
        </Label>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => onChange(clamp(value - step, min, max))}
          disabled={disabled || (min !== undefined && value <= min)}
          aria-label={`Diminuir ${label.toLowerCase()}`}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <Input
          id={id}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isNaN(next)) onChange(clamp(next, min, max));
          }}
          className="h-9 w-16 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => onChange(clamp(value + step, min, max))}
          disabled={disabled || (max !== undefined && value >= max)}
          aria-label={`Aumentar ${label.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </Button>

        {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
      </div>

      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
