'use client';

import { useRouter } from 'next/navigation';
import { useWizardState } from './use-wizard-state';
import { WizardShell } from './wizard-shell';
import type {
  WizardAssistant,
  WizardConfig,
  WizardEntities,
  WizardMode,
} from './types';

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

  return (
    <WizardShell
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
