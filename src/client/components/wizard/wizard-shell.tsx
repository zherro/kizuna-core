'use client';

import type { ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';
import type { WizardMode } from './types';
import { WizardRail, type WizardRailStep } from './wizard-rail';
import { WizardProgress } from './wizard-progress';

const DEFAULT_MODE_LABELS: Record<WizardMode, string> = {
  create: 'Novo',
  edit: 'Editar',
  review: 'Revisão',
};

export interface WizardShellProps {
  mode: WizardMode;
  modeLabels?: Partial<Record<WizardMode, string>>;
  /** 1-based index of the current step, for display. */
  currentStep: number;
  currentIndex: number;
  totalSteps: number;
  stepLabel: string;
  progress: number;
  railSteps: WizardRailStep[];
  furthest: number;
  onJump: (step: number) => void;
  isLastStep: boolean;
  showContinue: boolean;
  continueLabel: string;
  canContinue: boolean;
  finishBlocked?: boolean;
  submitting: boolean;
  error?: string;
  onBack: () => void;
  onContinue: () => void;
  onFinish: () => void;
  onCancel: () => void;
  headerActions?: ReactNode;
  railExtra?: ReactNode;
  children: ReactNode;
}

export function WizardShell({
  mode,
  modeLabels,
  currentStep,
  currentIndex,
  totalSteps,
  stepLabel,
  progress,
  railSteps,
  furthest,
  onJump,
  isLastStep,
  showContinue,
  continueLabel,
  canContinue,
  finishBlocked,
  submitting,
  error,
  onBack,
  onContinue,
  onFinish,
  onCancel,
  headerActions,
  railExtra,
  children,
}: WizardShellProps) {
  const modeLabel = modeLabels?.[mode] ?? DEFAULT_MODE_LABELS[mode];

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col bg-background">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <p className="text-sm font-semibold text-foreground">{modeLabel}</p>
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </div>

        {/* Mobile progress — the desktop rail replaces this from md up. */}
        <WizardProgress
          stepLabel={stepLabel}
          currentStep={currentStep}
          totalSteps={totalSteps}
          progress={progress}
          steps={railSteps}
          current={currentStep}
          furthest={furthest}
          onJump={onJump}
        />
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[13rem_1fr] md:gap-12 md:py-12">
          <aside className="hidden md:block">
            <div className="sticky top-4 space-y-5">
              <WizardRail
                steps={railSteps}
                current={currentStep}
                furthest={furthest}
                onJump={onJump}
              />
              {railExtra}
            </div>
          </aside>

          <div className="min-w-0">
            {error ? (
              <div className="mb-4">
                <div
                  role="alert"
                  className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              </div>
            ) : null}

            <div key={currentIndex} className="wz-step-in">
              {children}
            </div>
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={currentStep === 1 || submitting}
            className={cn(currentStep === 1 && 'invisible')}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>

          {isLastStep ? (
            <Button onClick={onFinish} disabled={submitting || Boolean(finishBlocked)}>
              {submitting ? (
                'Salvando...'
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" /> Concluir
                </>
              )}
            </Button>
          ) : showContinue ? (
            <Button onClick={onContinue} disabled={submitting || !canContinue}>
              {submitting ? 'Salvando...' : continueLabel}
              {!submitting ? <ChevronRight className="ml-1 h-4 w-4" /> : null}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
