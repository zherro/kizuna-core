'use client';

import { Plus } from 'lucide-react';
import { Button } from '../ui/button';

type SchedulesEmptyStateProps = {
  onCreate: () => void;
};

/**
 * Empty state for the schedules list — a light, CSS-only animated clock/calendar illustration.
 * `motion-reduce:*` disables the drift/tick for users who ask for reduced motion.
 */
export function SchedulesEmptyState({ onCreate }: Readonly<SchedulesEmptyStateProps>) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <div className="relative h-28 w-28">
        <span className="absolute left-1 top-2 text-brand/70 motion-safe:animate-pulse">✦</span>
        <span className="absolute right-0 top-6 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground motion-safe:animate-bounce">
          08:00
        </span>

        <svg viewBox="0 0 96 96" className="h-full w-full" role="img" aria-label="Relógio">
          <circle
            cx="48"
            cy="52"
            r="30"
            className="fill-brand-soft stroke-brand/40"
            strokeWidth="2"
          />
          <line
            x1="48"
            y1="52"
            x2="48"
            y2="32"
            className="stroke-brand"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 48 52"
              to="360 48 52"
              dur="8s"
              repeatCount="indefinite"
            />
          </line>
          <line
            x1="48"
            y1="52"
            x2="62"
            y2="52"
            className="stroke-brand/70"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 48 52"
              to="360 48 52"
              dur="24s"
              repeatCount="indefinite"
            />
          </line>
          <circle cx="48" cy="52" r="3" className="fill-brand" />
        </svg>
      </div>

      <h3 className="mt-4 text-base font-semibold">Você ainda não configurou seus horários</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Defina quando você está disponível para receber novos atendimentos.
      </p>
      <Button type="button" onClick={onCreate} className="mt-5">
        <Plus className="mr-1.5 h-4 w-4" />
        Criar disponibilidade
      </Button>
    </div>
  );
}
