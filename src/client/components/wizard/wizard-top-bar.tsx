'use client';

import type { ReactNode } from 'react';
import { SelectPopover } from '../ui-better-soft/select-popover';
import type { WizardRailStep } from './wizard-rail';

/**
 * Seletor de passos em popover: o gatilho mostra "Passo N de T" + o rótulo do passo atual, a
 * lista traz todos os passos (✓ nos respondidos). Passo ainda não alcançado fica desabilitado —
 * `furthest` decide (o wizard passa todos em desenvolvimento, para pular direto a qualquer um).
 */
export function WizardStepSelect({
  steps,
  current,
  furthest,
  onJump,
  className,
}: {
  steps: WizardRailStep[];
  /** 1-based. */
  current: number;
  /** 1-based: até onde dá para pular. */
  furthest: number;
  onJump: (step: number) => void;
  className?: string;
}) {
  const options = steps.map((step, index) => {
    const n = index + 1;
    return {
      value: n,
      label: `${n < current ? '✓ ' : ''}${n}. ${step.label}`,
      disabled: n > furthest,
    };
  });

  return (
    <SelectPopover
      value={current}
      options={options}
      onChange={(n) => n !== current && onJump(n)}
      ariaLabel="Ir para o passo"
      className={className}
      listClassName="max-h-[60vh] w-full [&>button]:whitespace-normal"
      triggerContent={
        <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
          <span className="text-[11px] text-muted-foreground">
            Passo {current} de {steps.length}
          </span>
          <span className="truncate text-sm font-semibold text-foreground">
            {steps[current - 1]?.label}
          </span>
        </span>
      }
    />
  );
}

/**
 * Cabeçalho do formulário no mobile (some do `md` pra cima, onde o rail lateral assume). Com o
 * modo imersivo ligado pelo `<Wizard>`, é o único cabeçalho da tela: seletor de passos, um slot à
 * direita (`extra`) e a barra de progresso. Gruda no topo enquanto a página rola.
 */
export function WizardTopBar({
  steps,
  current,
  furthest,
  progress,
  onJump,
  extra,
}: {
  steps: WizardRailStep[];
  current: number;
  furthest: number;
  /** 0–100. */
  progress: number;
  onJump: (step: number) => void;
  extra?: ReactNode;
}) {
  return (
    <div
      data-wz-top-bar
      className="sticky top-0 z-30 shrink-0 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <WizardStepSelect
            steps={steps}
            current={current}
            furthest={furthest}
            onJump={onJump}
            className="w-full border-transparent bg-transparent px-2 py-1.5 hover:bg-muted/60"
          />
        </div>
        {extra}
      </div>
      <div className="h-0.5 w-full bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
