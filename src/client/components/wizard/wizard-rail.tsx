'use client';

import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type WizardRailStep = { label: string };

type StepStatus = 'done' | 'current' | 'todo';

function statusFor(index: number, current: number): StepStatus {
  if (index < current) return 'done';
  if (index === current) return 'current';
  return 'todo';
}

function Disc({ status, n }: { status: StepStatus; n: number }) {
  return (
    <span
      className={cn(
        'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors',
        status === 'done' && 'bg-primary text-primary-foreground',
        status === 'current' && 'wz-disc-current bg-background text-primary',
        status === 'todo' && 'bg-muted text-muted-foreground'
      )}
    >
      {status === 'done' ? <Check className="h-3.5 w-3.5" /> : n}
    </span>
  );
}

/** Vertical, clickable step list — desktop only (the narrow left column of the wizard). */
export function WizardRail({
  steps,
  current,
  furthest,
  onJump,
}: {
  steps: WizardRailStep[];
  current: number;
  furthest: number;
  onJump: (step: number) => void;
}) {
  return (
    <nav aria-label="Etapas">
      <ol className="space-y-0.5">
        {steps.map((step, index) => {
          const n = index + 1;
          const status = statusFor(n, current);
          const reachable = n <= furthest && n !== current;

          return (
            <li key={step.label}>
              <button
                type="button"
                disabled={!reachable}
                aria-current={status === 'current' ? 'step' : undefined}
                onClick={() => reachable && onJump(n)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                  reachable && 'hover:bg-muted/70',
                  status === 'current' ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  !reachable && status !== 'current' && 'cursor-default'
                )}
              >
                <Disc status={status} n={n} />
                <span className="min-w-0 flex-1 truncate">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Horizontal, clickable disc strip — mobile only (under the progress bar). */
export function WizardStrip({
  steps,
  current,
  furthest,
  onJump,
}: {
  steps: WizardRailStep[];
  current: number;
  furthest: number;
  onJump: (step: number) => void;
}) {
  return (
    <nav aria-label="Etapas" className="-mx-1 overflow-x-auto">
      <ol className="flex items-center gap-1 px-1">
        {steps.map((step, index) => {
          const n = index + 1;
          const status = statusFor(n, current);
          const reachable = n <= furthest && n !== current;

          return (
            <li key={step.label} className="flex items-center">
              <button
                type="button"
                disabled={!reachable}
                aria-current={status === 'current' ? 'step' : undefined}
                aria-label={`Passo ${n}: ${step.label}`}
                onClick={() => reachable && onJump(n)}
                className={cn('p-1', !reachable && 'cursor-default')}
              >
                <Disc status={status} n={n} />
              </button>
              {index < steps.length - 1 ? (
                <span aria-hidden className="h-px w-3 shrink-0 bg-border" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
