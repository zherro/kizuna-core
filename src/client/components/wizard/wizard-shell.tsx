'use client';

import type { ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';
import { WizardRail, type WizardRailStep } from './wizard-rail';
import { WizardProgress } from './wizard-progress';
import { WizardCancelLink } from './wizard-cancel-link';

export interface WizardShellProps {
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
  /** Quando presente, o Cancelar aparece no rodapé ao lado do Voltar (cabeçalho compacto). */
  onCancel?: () => void;
  onContinue: () => void;
  onFinish: () => void;
  railExtra?: ReactNode;
  /** `'navi'` washes the ground with a soft brand tint (conversational Naví active). */
  ground?: 'default' | 'navi';
  /** Persistent Naví dock, rendered once at the end of the scroll column (sticks to the bottom). */
  naviSlot?: ReactNode;
  children: ReactNode;
}

/**
 * Stepper layout. With `onCancel` (compact header) Cancelar sits in the footer next to Voltar;
 * otherwise chrome (mode label + layout toggle + Cancelar) is projected into the app's
 * single header by `<Wizard>` via `WizardHeaderPortal` — this shell renders no top bar of its
 * own. Flex column of fixed height: progress `shrink-0`, step area scrolls, footer `shrink-0`.
 */
export function WizardShell({
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
  onCancel,
  onContinue,
  onFinish,
  railExtra,
  ground = 'default',
  naviSlot,
  children,
}: WizardShellProps) {
  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col bg-background',
        ground === 'navi' && 'wz-navi-ground'
      )}
    >
      <div className="shrink-0 border-b border-border md:hidden">
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
        <div
          className={cn(
            'mx-auto grid max-w-5xl gap-8 px-3 pt-8 pb-28 sm:px-6 md:grid-cols-[13rem_1fr] md:gap-12 md:pb-28',
            onCancel ? 'md:pt-6 lg:max-w-6xl lg:gap-14' : 'md:pt-12'
          )}
        >
          <aside className="hidden md:block">
            <div className={cn('sticky space-y-5', onCancel ? 'top-2' : 'top-4')}>
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
                <div role="alert" className="wz-navi-error-box rounded-md px-3 py-2 text-sm">
                  {error}
                </div>
              </div>
            ) : null}

            <div key={currentIndex} className="wz-step-in">
              {children}
            </div>

            {naviSlot ? <div className="pb-32">{naviSlot}</div> : null}
          </div>
        </div>
      </main>

      <div
        data-wz-footer
        className="fixed inset-x-0 bottom-0 z-20 lg:left-[var(--panel-sidebar-w,0px)] border-t border-border bg-background/95 backdrop-blur"
      >
        <div
          className={cn(
            'mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-3 sm:px-6',
            onCancel && 'lg:max-w-6xl'
          )}
        >
          <div className="flex items-center gap-1 sm:gap-3">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={currentStep === 1 || submitting}
            className={cn(currentStep === 1 && (onCancel ? 'hidden' : 'invisible'))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          {onCancel ? <WizardCancelLink onClick={onCancel} disabled={submitting} /> : null}
          </div>

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
