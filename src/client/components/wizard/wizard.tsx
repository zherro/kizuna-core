'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardState } from './use-wizard-state';
import { WizardShell } from './wizard-shell';
import { WizardScrollShell } from './wizard-scroll-shell';
import { WizardLayoutToggle } from './wizard-layout-toggle';
import { WizardHeaderPortal } from './wizard-header-portal';
import { useWizardConversation } from './use-wizard-conversation';
import { NaviLayer } from './navi-layer';
import { NaviPanel } from './navi-panel';
import { type WizardLayout, readStoredLayout, writeStoredLayout } from './wizard-layout';
import { applyAssistPatch } from './apply-assist-patch';
import { Button } from '../ui/button';
import type {
  WizardAssistant,
  WizardConfig,
  WizardConversationAdapter,
  WizardEntities,
  WizardMode,
} from './types';

const DEFAULT_MODE_LABELS: Record<WizardMode, string> = {
  create: 'Novo',
  edit: 'Editar',
  review: 'Revisão',
};

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
      <Button variant="ghost" size="sm" onClick={() => assistant.retry?.()}>
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
      const filtered = applyAssistPatch(res.patch as Partial<S>, state, touched as Set<keyof S>);
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
  /**
   * Conversational Naví (additive contract, `WizardConversation`). When present and not
   * `unavailable`, the wizard renders the assisted layer (dock + panel) and the one-shot
   * `assistant` button is suppressed. `create`-only by convention (the app decides).
   */
  conversation?: WizardConversationAdapter | (() => WizardConversationAdapter);
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
  conversation,
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

  // assistant / conversation may be hook-like factories — must be called unconditionally.
  const resolvedAssistant =
    typeof assistant === 'function' ? (assistant as () => WizardAssistant)() : assistant;
  const resolvedConversation =
    typeof conversation === 'function'
      ? (conversation as () => WizardConversationAdapter)()
      : conversation;

  const wz = useWizardState<S>({
    config,
    mode,
    entities,
    initialState: initialState ?? ({} as S),
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
    ctx,
  } = wz;

  const conv = useWizardConversation<S>({
    adapter: resolvedConversation,
    steps,
    currentIndex,
    ctx,
    goContinue,
    submitting,
    canContinue,
    isLastStep,
  });

  // Um passo pode pedir pra esconder a Naví por um tempo (ex.: categoria força seleção manual
  // das tags de especialidade antes de liberar o avanço). Reseta ao trocar de passo — sem isto,
  // um passo que suprimiu e nunca limpou (ex. saiu por "Voltar") deixaria a Naví escondida pro
  // resto do wizard.
  const [naviSuppressed, setNaviSuppressed] = useState(false);
  useEffect(() => {
    setNaviSuppressed(false);
  }, [currentIndex]);

  const stepCtx = useMemo(
    () => ({ ...ctx, setNaviSuppressed }),
    [ctx]
  );

  const totalSteps = steps.length;
  const currentStep = currentIndex + 1;
  const stepLabel = steps[currentIndex]?.label ?? '';
  const progress = totalSteps > 1 ? Math.round((currentIndex / (totalSteps - 1)) * 100) : 100;
  const railSteps = steps.map((s) => ({ label: s.label }));
  const continueLabel = mode === 'edit' ? 'Salvar e continuar' : 'Continuar';
  const modeLabel = modeLabels?.[mode] ?? DEFAULT_MODE_LABELS[mode];

  const leave = onExit ?? (() => router.push(config.finishHrefByMode?.[mode] ?? '/painel'));
  // Sair de um cadastro novo descarta o rascunho — confirma. Em edit/review a linha já existe.
  const exit = () => {
    if (mode === 'create') {
      const ok =
        typeof window === 'undefined' ||
        window.confirm('Sair agora descarta este anúncio. Tem certeza?');
      if (!ok) return;
    }
    leave();
  };

  const handleFinish = () => {
    void finish().then(({ href }) => {
      if (href) router.push(href);
    });
  };

  const Step = steps[currentIndex]?.Component;
  const activeStep = steps[currentIndex];

  // The one-shot assist button only shows when there is NO conversational Naví active.
  const showAssist =
    !conv.active &&
    Boolean(resolvedAssistant) &&
    (effectiveLayout === 'scroll' ? steps.some((s) => s.assist) : Boolean(activeStep?.assist));
  const assistControl =
    showAssist && resolvedAssistant ? (
      <WizardAssistControl
        assistant={resolvedAssistant}
        stepKey={activeStep?.key ?? steps[0]?.key ?? ''}
        state={ctx.state}
        touched={ctx.touched}
        patch={ctx.patch}
      />
    ) : undefined;

  // Single header: mode label + layout toggle + assist affordance + Cancelar, projected into the
  // app's one full-bleed header via portal (no second header bar).
  const chrome = (
    <WizardHeaderPortal>
      <span className="hidden truncate text-sm font-semibold text-foreground sm:inline">
        {modeLabel}
      </span>
      {layoutToggle}
      {assistControl}
      <Button variant="ghost" size="sm" onClick={exit}>
        Cancelar
      </Button>
    </WizardHeaderPortal>
  );

  const naviShown = (conv.active || conv.endedMidway) && !naviSuppressed;
  const naviSlot = naviShown ? <NaviLayer conv={conv} /> : undefined;

  const shell =
    effectiveLayout === 'scroll' ? (
      <WizardScrollShell
        steps={steps}
        currentIndex={currentIndex}
        state={ctx.state}
        canContinue={canContinue}
        submitting={submitting}
        error={error}
        isLastStep={isLastStep}
        onAdvance={() => void goContinue()}
        onFinish={handleFinish}
        autoReveal={!naviShown || conv.minimized}
        ground={conv.active ? 'navi' : 'default'}
        naviSlot={naviSlot}
        renderStep={(step) => <step.Component {...stepCtx} />}
      />
    ) : (
      <WizardShell
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
        ground={conv.active ? 'navi' : 'default'}
        naviSlot={naviSlot}
      >
        {Step ? <Step {...stepCtx} /> : null}
      </WizardShell>
    );

  return (
    <>
      {chrome}
      {shell}
      {naviShown ? <NaviPanel conv={conv} /> : null}
    </>
  );
}

export default Wizard;
