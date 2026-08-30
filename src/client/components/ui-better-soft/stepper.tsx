'use client';

import { cn } from '../../../lib/utils';

export type StepperStep = {
  id: string | number;
  title?: string;
  description?: string;
  disabled?: boolean;
};

type StepperProps = {
  steps: StepperStep[];
  value: StepperStep['id'];
  onValueChange: (value: StepperStep['id']) => void;
  className?: string;
};

export function Stepper({ steps, value, onValueChange, className }: StepperProps) {
  return (
    <div
      className={cn('grid gap-2 sm:grid-flow-col sm:auto-cols-fr', className)}
      role="tablist"
      aria-label="Etapas do formulario"
    >
      {steps.map((step, index) => {
        const active = step.id === value;
        const disabled = Boolean(step.disabled);
        const canSelect = !disabled && !active;

        return (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => {
              if (canSelect) {
                onValueChange(step.id);
              }
            }}
            className={cn(
              'rounded-md border px-3 py-2 text-left text-sm transition',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:bg-accent',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground'
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold">{step.title}</p>
                {step.description ? <p className="text-xs leading-5">{step.description}</p> : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
