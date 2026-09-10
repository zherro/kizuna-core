'use client';

import { WizardStrip, type WizardRailStep } from './wizard-rail';

export function WizardProgress({
  stepLabel,
  currentStep,
  totalSteps,
  progress,
  steps,
  current,
  furthest,
  onJump,
}: {
  stepLabel: string;
  currentStep: number;
  totalSteps: number;
  progress: number;
  steps: WizardRailStep[];
  current: number;
  furthest: number;
  onJump: (step: number) => void;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-2.5 sm:px-6 md:hidden">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate font-medium text-foreground">{stepLabel}</span>
        <span className="shrink-0">
          Passo {currentStep} de {totalSteps}
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2.5">
        <WizardStrip steps={steps} current={current} furthest={furthest} onJump={onJump} />
      </div>
    </div>
  );
}
