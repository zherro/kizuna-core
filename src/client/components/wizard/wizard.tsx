'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardState } from './use-wizard-state';
import { WizardShell } from './wizard-shell';
import { WizardScrollShell } from './wizard-scroll-shell';
import { WizardLayoutToggle } from './wizard-layout-toggle';
import { type WizardLayout, readStoredLayout, writeStoredLayout } from './wizard-layout';
import { applyAssistPatch } from './apply-assist-patch';
import { Button } from '../ui/button';
import type {
  WizardAssistant,
  WizardConfig,
  WizardEntities,
  WizardMode,
} from './types';

function WizardAssistControl<S extends Record<string, unknown>>({
  assistant,
  stepKey,
  state,
  touched,
  patch,
}: {
  assistant: WizardAssistant;
  stepKey: string;
  state: S;
  touched: ReadonlySet<keyof S>;
  patch: (p: Partial<S>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (assistant.status === 'unavailable') return null;

  if (assistant.status === 'degraded') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => assistant.retry?.()}
      >
        Tentar de novo
      </Button>
    );
  }

  const run = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await assistant.suggest({
        userText: '',
        state: state as Record<string, unknown>,
        stepKey,
      });
      const filtered = applyAssistPatch(
        res.patch as Partial<S>,
        state,
        touched as Set<keyof S>,
      );
      patch(filtered);
      setMessage(res.needsMore ? `${res.message} (mais informações ajudam)` : res.message);
    } catch {
      setMessage('Não foi possível gerar uma sugestão.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="flex items-center gap-2">
      {message ? (
        <span className="text-xs text-muted-foreground" role="status">
          {message}
        </span>
      ) : null}
      <Button variant="ghost" size="sm" onClick={() => void run()} disabled={busy}>
        {busy ? 'Preenchendo...' : 'Preencher com IA'}
      </Button>
    </span>
  );
}

export interface WizardProps<S extends Record<string, unknown> = Record<string, unknown>> {
  config: WizardConfig<S>;
  mode: WizardMode;
  entities: WizardEntities;
  initialResourceId: string | null;
  initialState?: S;
  /** Full resource record (edit/review) to hydrate the persister baseline before the first partial persist. */
  initialRecord?: Record<string, unknown>;
  modeLabels?: Partial<Record<WizardMode, string>>;
  assistant?: WizardAssistant | (() => WizardAssistant);
  onExit?: () => void;
  /**
   * Initial step layout. The header toggle can switch it live and the choice is remembered per
   * resource in localStorage. The `scroll` (immersive questionnaire) layout applies to `create`
   * only — `edit`/`review` always use the `stepper`. Defaults to `'stepper'`.
   */
  variant?: WizardLayout;
}

export function Wizard<S extends Record<string, unknown> = Record<string, unknown>>({
  config,
  mode,
  entities,
  initialResourceId,
  initialState,
  initialRecord,
  modeLabels,
  assistant,
  onExit,
  variant,
}: WizardProps<S>) {
  const router = useRouter();

  // Layout is only switchable in `create`; edit/review always use the stepper (the scroll layout
  // has no persist-without-advance story). Seed from `variant` for a stable first paint, then
  // correct from localStorage on mount to avoid a hydration mismatch.
  const layoutSwitchable = mode === 'create';
  const [layout, setLayout] = useState<WizardLayout>(variant ?? 'stepper');
  useEffect(() => {
    if (!layoutSwitchable) return;
    const stored = readStoredLayout(config.resource);
    if (stored) setLayout(stored);
  }, [layoutSwitchable, config.resource]);
  const changeLayout = (next: WizardLayout) => {
    setLayout(next);
    writeStoredLayout(config.resource, next);
  };
  const effectiveLayout: WizardLayout = layoutSwitchable ? layout : 'stepper';
  const layoutToggle = layoutSwitchable ? (
    <WizardLayoutToggle value={layout} onChange={changeLayout} />
  ) : undefined;

  // assistant may be a hook-like factory — must be called unconditionally.
  const resolvedAssistant =
    typeof assistant === 'function'
      ? (assistant as () => WizardAssistant)()
      : assistant;

  const wz = useWizardState<S>({
    config,
    mode,
    entities,
    initialState: (initialState ?? ({} as S)),
    initialResourceId,
    initialRecord,
    assistant: resolvedAssistant,
  });

  const {
    steps,
    currentIndex,
    furthestIndex,
    canContinue,
    isLastStep,
    submitting,
    error,
    goBack,
    goContinue,
    jumpTo,
    finish,
  } = wz;

  const totalSteps = steps.length;
  const currentStep = currentIndex + 1;
  const stepLabel = steps[currentIndex]?.label ?? '';
  const progress =
    totalSteps > 1 ? Math.round((currentIndex / (totalSteps - 1)) * 100) : 100;
  const railSteps = steps.map((s) => ({ label: s.label }));
  const continueLabel = mode === 'edit' ? 'Salvar e continuar' : 'Continuar';

  const exit =
    onExit ??
    (() => router.push(config.finishHrefByMode?.[mode] ?? '/painel'));

  const handleFinish = () => {
    void finish().then(({ href }) => {
      if (href) router.push(href);
    });
  };

  const Step = steps[currentIndex]?.Component;
  const { ctx } = wz;

  const activeStep = steps[currentIndex];
  // In the stepper each step opts into the assist button (`step.assist`). In the scroll layout the
  // whole form is on one screen, so keep the assistant reachable throughout as long as any step
  // wants it — `suggest()` already operates on the full state, not a single step.
  const showAssist =
    Boolean(resolvedAssistant) &&
    (effectiveLayout === 'scroll' ? steps.some((s) => s.assist) : Boolean(activeStep?.assist));
  const headerActions =
    showAssist && resolvedAssistant ? (
      <WizardAssistControl
        assistant={resolvedAssistant}
        stepKey={activeStep?.key ?? steps[0]?.key ?? ''}
        state={ctx.state}
        touched={ctx.touched}
        patch={ctx.patch}
      />
    ) : undefined;

  if (effectiveLayout === 'scroll') {
    return (
      <WizardScrollShell
        mode={mode}
        modeLabels={modeLabels}
        steps={steps}
        currentIndex={currentIndex}
        canContinue={canContinue}
        submitting={submitting}
        error={error}
        isLastStep={isLastStep}
        onAdvance={() => void goContinue()}
        onFinish={handleFinish}
        onCancel={exit}
        headerActions={headerActions}
        layoutToggle={layoutToggle}
        renderStep={(step) => <step.Component {...ctx} />}
      />
    );
  }

  return (
    <WizardShell
      headerActions={headerActions}
      layoutToggle={layoutToggle}
      mode={mode}
      modeLabels={modeLabels}
      currentStep={currentStep}
      currentIndex={currentIndex}
      totalSteps={totalSteps}
      stepLabel={stepLabel}
      progress={progress}
      railSteps={railSteps}
      furthest={Math.min(furthestIndex + 1, totalSteps)}
      onJump={(step) => void jumpTo(step - 1)}
      isLastStep={isLastStep}
      showContinue
      continueLabel={continueLabel}
      canContinue={canContinue}
      submitting={submitting}
      error={error}
      onBack={goBack}
      onContinue={() => void goContinue()}
      onFinish={handleFinish}
      onCancel={exit}
    >
      {Step ? <Step {...ctx} /> : null}
    </WizardShell>
  );
}

export default Wizard;
