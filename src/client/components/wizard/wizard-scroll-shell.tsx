'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';
import { WizardLayoutContext } from './wizard-layout';
import type { WizardStep } from './types';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface WizardScrollShellProps<S extends Record<string, unknown>> {
  steps: WizardStep<S>[];
  /** index of the step currently driving `canContinue` — also the count of answered steps */
  currentIndex: number;
  /** wizard state — only used to reset the auto-reveal grace delay whenever it changes (see
   * effect below); not read otherwise. */
  state: S;
  canContinue: boolean;
  submitting: boolean;
  error?: string;
  isLastStep: boolean;
  /** persist the current step and reveal the next (= `goContinue`) */
  onAdvance: () => void;
  onFinish: () => void;
  finishBlocked?: boolean;
  /**
   * When false, the automatic reveal-on-valid is suppressed — the conversational Naví drives the
   * advance instead. Defaults to `true` (classic questionnaire behaviour).
   */
  autoReveal?: boolean;
  /** `'navi'` washes the ground with a soft brand tint (conversational Naví active). */
  ground?: 'default' | 'navi';
  /** Persistent Naví dock, rendered once at the end of the scroll column (sticks to the bottom). */
  naviSlot?: ReactNode;
  renderStep: (step: WizardStep<S>, index: number) => ReactNode;
}

/**
 * Immersive vertical questionnaire layout (create mode only — see `Wizard`). Answered steps
 * collapse into accordion rows (label + ✓, click to reopen) so the page never turns into one
 * long scroll; the current step is always open and the next is revealed once it validates. Chrome
 * (mode label + toggle + Cancelar) is projected into the app's single header by `<Wizard>`.
 */
export function WizardScrollShell<S extends Record<string, unknown>>({
  steps,
  currentIndex,
  state,
  canContinue,
  submitting,
  error,
  isLastStep,
  onAdvance,
  onFinish,
  finishBlocked,
  autoReveal = true,
  ground = 'default',
  naviSlot,
  renderStep,
}: WizardScrollShellProps<S>) {
  const total = steps.length;
  const revealCount = Math.max(1, Math.min(currentIndex + 1, total));
  const visible = steps.slice(0, revealCount);
  const answeredPct = total > 1 ? Math.round((currentIndex / (total - 1)) * 100) : 100;

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const prevRevealRef = useRef(revealCount);
  const advancingRef = useRef(false);

  // Which answered steps the user re-opened. Current + future are always open.
  const [reopened, setReopened] = useState<Set<number>>(() => new Set());
  const toggleReopen = (i: number) =>
    setReopened((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  // Collapse a step again once it stops being the current one, unless the user re-opened it.
  const prevCurrentRef = useRef(currentIndex);
  useEffect(() => {
    if (currentIndex > prevCurrentRef.current) {
      const justAnswered = prevCurrentRef.current;
      setReopened((s) => {
        if (!s.has(justAnswered)) return s;
        const next = new Set(s);
        next.delete(justAnswered);
        return next;
      });
    }
    prevCurrentRef.current = currentIndex;
  }, [currentIndex]);

  // Reveal the next step when the current one is valid. One discrete bump per pass. A short
  // grace delay — sem isto, uma resposta que já nasce válida de uma vez só (ex.: clicar num
  // exemplo pronto, que preenche o campo inteiro num clique) avançava/colapsava o passo
  // instantaneamente, sem o usuário ter tempo de ver o que preencheu ou reconsiderar. `state` no
  // array de deps REINICIA a contagem a cada mudança — sem isto, marcar a 1ª tag de um campo
  // multi-seleção (ex. especialidades) já disparava o timer, e ele avançava no meio da seleção
  // das próximas tags porque nada mais o resetava depois (só `canContinue` virando true de novo,
  // o que não acontece pra seleções seguintes — ele já era true).
  useEffect(() => {
    if (!autoReveal) return;
    if (submitting || advancingRef.current) return;
    if (isLastStep || !canContinue) return;
    const t = setTimeout(() => {
      advancingRef.current = true;
      onAdvance();
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReveal, submitting, canContinue, isLastStep, currentIndex, onAdvance, state]);

  useEffect(() => {
    advancingRef.current = false;
  }, [currentIndex, submitting]);

  // Glide to the newest section, but only when the count actually grew.
  useEffect(() => {
    const grew = revealCount > prevRevealRef.current;
    prevRevealRef.current = revealCount;
    if (!grew) return;
    sectionRefs.current[revealCount - 1]?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [revealCount]);

  const contextValue = useMemo(() => ({ layout: 'scroll' as const, stacked: true }), []);

  return (
    <WizardLayoutContext.Provider value={contextValue}>
      <div
        className={cn(
          'flex h-full min-h-0 flex-col bg-background',
          ground === 'navi' && 'wz-navi-ground'
        )}
      >
        <div className="h-0.5 w-full shrink-0 bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${answeredPct}%` }}
          />
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-3 pb-40 pt-8 sm:px-6 sm:pt-12">
            {error ? (
              <div role="alert" className="wz-navi-error-box mb-6 rounded-md px-3 py-2 text-sm">
                {error}
              </div>
            ) : null}

            <div className="space-y-6">
              {visible.map((step, index) => {
                const answered = index < currentIndex;
                const open = !answered || reopened.has(index);
                const isNewest = index === revealCount - 1 && revealCount > 1;
                return (
                  <section
                    key={step.key}
                    ref={(el) => {
                      sectionRefs.current[index] = el;
                    }}
                    data-step-key={step.key}
                    data-answered={answered || undefined}
                    data-open={open || undefined}
                    className={cn(
                      'wz-scroll-step scroll-mt-20',
                      isNewest && open && 'wz-scroll-reveal'
                    )}
                  >
                    {answered ? (
                      <button
                        type="button"
                        onClick={() => toggleReopen(index)}
                        className="wz-scroll-summary flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm"
                        aria-expanded={open}
                      >
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="flex-1 font-medium text-foreground">{step.label}</span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform',
                            open && 'rotate-180'
                          )}
                        />
                      </button>
                    ) : null}
                    {open ? (
                      <div className={cn(answered && 'pt-3')}>{renderStep(step, index)}</div>
                    ) : null}
                  </section>
                );
              })}
            </div>

            {naviSlot}
          </div>
        </main>

        <div
          data-wz-footer
          className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur"
        >
          <div className="mx-auto flex max-w-2xl items-center justify-end gap-3 px-3 py-3 sm:px-6">
            {!isLastStep ? (
              <span className="mr-auto text-xs text-muted-foreground">
                {canContinue ? 'Pronto pra avançar' : 'Continue respondendo'}
              </span>
            ) : null}
            {/* Sem auto-reveal (a Naví dirige), cada passo precisa do seu "Avançar" — habilitado
                quando o passo valida. Com auto-reveal, o próprio revelar progride. */}
            {!isLastStep && !autoReveal ? (
              <Button onClick={onAdvance} disabled={submitting || !canContinue}>
                {submitting ? (
                  'Salvando...'
                ) : (
                  <>
                    Avançar <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={onFinish}
                disabled={submitting || !isLastStep || !canContinue || Boolean(finishBlocked)}
              >
                {submitting ? (
                  'Salvando...'
                ) : (
                  <>
                    <Check className="mr-1 h-4 w-4" /> Concluir
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </WizardLayoutContext.Provider>
  );
}

export default WizardScrollShell;
