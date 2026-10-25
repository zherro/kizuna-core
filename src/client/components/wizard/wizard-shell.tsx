'use client';

import type { ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';
import { BottomBar } from '../ui-better-soft/bottom-bar';
import { WizardRail, type WizardRailStep } from './wizard-rail';
import { WizardTopBar } from './wizard-top-bar';
import { WizardCancelLink } from './wizard-cancel-link';

export interface WizardShellProps {
  /** 1-based index of the current step, for display. */
  currentStep: number;
  currentIndex: number;
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
  /** Slot à direita do cabeçalho do formulário no mobile (`WizardTopBar`). */
  topBarExtra?: ReactNode;
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
  topBarExtra,
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
      <WizardTopBar
        steps={railSteps}
        current={currentStep}
        furthest={furthest}
        progress={progress}
        onJump={onJump}
        extra={topBarExtra}
      />

      {/* Sem `overflow`: a página rola no documento — um contêiner de rolagem aqui prenderia o
          `sticky` do rail (ele subia junto com o passo). */}
      <main className="min-h-0 flex-1">
        <div
          className={cn(
            'mx-auto grid max-w-5xl gap-8 px-3 pt-8 pb-28 sm:px-6 md:grid-cols-[13rem_1fr] md:gap-12 md:pb-28',
            onCancel ? 'md:pt-6 lg:max-w-6xl lg:gap-14' : 'md:pt-12'
          )}
        >
          <aside className="hidden md:block">
            <div
              className={cn(
                'sticky max-h-[calc(100dvh-var(--kz-header-h,0px)-8rem)] space-y-5 overflow-y-auto',
                onCancel
                  ? 'top-[calc(var(--kz-header-h,0px)+1.5rem)]'
                  : 'top-[calc(var(--kz-header-h,0px)+2rem)]'
              )}
            >
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

      <BottomBar
        data-wz-footer
        aria-label="Navegação do formulário"
        innerClassName={cn(
          'flex max-w-5xl items-center justify-between gap-3 px-3 py-3 sm:px-6',
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
      </BottomBar>
    </div>
  );
}
