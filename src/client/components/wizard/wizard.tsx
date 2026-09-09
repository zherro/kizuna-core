'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardState } from './use-wizard-state';
import { WizardShell } from './wizard-shell';
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
  modeLabels?: Partial<Record<WizardMode, string>>;
  assistant?: WizardAssistant | (() => WizardAssistant);
  onExit?: () => void;
}

export function Wizard<S extends Record<string, unknown> = Record<string, unknown>>({
  config,
  mode,
  entities,
  initialResourceId,
  initialState,
  modeLabels,
  assistant,
  onExit,
}: WizardProps<S>) {
  const router = useRouter();

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
  const headerActions =
    resolvedAssistant && activeStep?.assist ? (
      <WizardAssistControl
        assistant={resolvedAssistant}
        stepKey={activeStep.key}
        state={ctx.state}
        touched={ctx.touched}
        patch={ctx.patch}
      />
    ) : undefined;

  return (
    <WizardShell
      headerActions={headerActions}
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
