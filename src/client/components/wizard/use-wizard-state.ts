'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { resolveSteps } from './resolve-steps';
import { createResourcePersister, type ResourcePersister } from './persist-resource';
import type {
  WizardAssistant,
  WizardConfig,
  WizardEntities,
  WizardMode,
  WizardStep,
  WizardStepContext,
} from './types';

export interface UseWizardStateOptions<S> {
  config: WizardConfig<S>;
  mode: WizardMode;
  entities: WizardEntities;
  initialState: S;
  initialResourceId: string | null;
  assistant?: WizardAssistant;
}

export interface UseWizardStateReturn<S> {
  ctx: WizardStepContext<S>;
  steps: WizardStep<S>[];
  currentIndex: number;
  furthestIndex: number;
  state: S;
  patch: (p: Partial<S>) => void;
  resourceId: string | null;
  canContinue: boolean;
  isLastStep: boolean;
  submitting: boolean;
  error: string;
  goBack: () => void;
  goContinue: () => Promise<void>;
  jumpTo: (i: number) => Promise<void>;
  finish: () => Promise<{ href: string | null }>;
}

export function useWizardState<S extends Record<string, unknown>>(
  opts: UseWizardStateOptions<S>,
): UseWizardStateReturn<S> {
  const { config, mode, entities, initialState, initialResourceId, assistant } = opts;

  const [state, setState] = useState<S>(initialState);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [furthestIndex, setFurthestIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resourceId, setResourceId] = useState<string | null>(initialResourceId);

  const touchedRef = useRef<Set<keyof S>>(new Set());

  const persisterRef = useRef<ResourcePersister<S> | null>(null);
  if (persisterRef.current === null) {
    persisterRef.current = createResourcePersister<S>({
      resource: config.resource,
      resourceId: initialResourceId,
      onError: (msg) => setError(msg),
      onId: (id) => setResourceId(id),
    });
  }
  const persister = persisterRef.current;

  const patch = useCallback((p: Partial<S>) => {
    for (const k of Object.keys(p) as (keyof S)[]) touchedRef.current.add(k);
    setState((s) => ({ ...s, ...p }));
  }, []);

  const doPersist = useCallback(
    async (overrides: Partial<S>): Promise<{ ok: boolean }> => {
      setSubmitting(true);
      try {
        setError('');
        const r = await persister.persist(overrides);
        return { ok: r.ok };
      } finally {
        setSubmitting(false);
      }
    },
    [persister],
  );

  const doPersistExtras = useCallback(
    async (partialExtras: Record<string, unknown>): Promise<{ ok: boolean }> => {
      setSubmitting(true);
      try {
        setError('');
        const r = await persister.persistExtras(partialExtras);
        return { ok: r.ok };
      } finally {
        setSubmitting(false);
      }
    },
    [persister],
  );

  const ctx = useMemo<WizardStepContext<S>>(
    () => ({
      state,
      patch,
      entities,
      resourceId,
      mode,
      assist: assistant,
      persist: doPersist,
      persistExtras: doPersistExtras,
      touched: touchedRef.current,
    }),
    [state, patch, entities, resourceId, mode, assistant, doPersist, doPersistExtras],
  );

  const steps = useMemo(() => resolveSteps(config, ctx), [config, ctx]);

  // clamp if the enabled() list shrank mid-flow
  const clampedIndex = steps.length > 0 ? Math.min(currentIndex, steps.length - 1) : 0;
  if (clampedIndex !== currentIndex) {
    setCurrentIndex(clampedIndex);
  }

  // "highest index reached" — bump during render (sanctioned pattern)
  const furthestTarget = mode === 'create' ? clampedIndex : Math.max(0, steps.length - 1);
  if (furthestTarget > furthestIndex) {
    setFurthestIndex(furthestTarget);
  }

  const currentStep: WizardStep<S> | undefined = steps[clampedIndex];
  const isLastStep = clampedIndex >= steps.length - 1;
  const canContinue = currentStep?.canContinue ? currentStep.canContinue(ctx) : true;

  const runStepPersist = useCallback(
    async (step: WizardStep<S> | undefined): Promise<boolean> => {
      if (!step?.persist) return true;
      setSubmitting(true);
      try {
        setError('');
        await step.persist(ctx);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [ctx],
  );

  const goBack = useCallback(() => {
    if (submitting) return;
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, [submitting]);

  const goContinue = useCallback(async () => {
    if (!currentStep) return;
    if (currentStep.canContinue && !currentStep.canContinue(ctx)) return;
    const ok = await runStepPersist(currentStep);
    if (!ok) return;
    setCurrentIndex((i) => (i < steps.length - 1 ? i + 1 : i));
  }, [currentStep, ctx, runStepPersist, steps.length]);

  const jumpTo = useCallback(
    async (target: number) => {
      if (target === clampedIndex) return;
      if (target < 0 || target > furthestIndex) return;
      if (target > clampedIndex) {
        const ok = await runStepPersist(currentStep);
        if (!ok) return;
      }
      setCurrentIndex(target);
    },
    [clampedIndex, furthestIndex, currentStep, runStepPersist],
  );

  const finish = useCallback(async (): Promise<{ href: string | null }> => {
    const ok = await runStepPersist(currentStep);
    if (!ok) return { href: null };
    return { href: config.finishHrefByMode?.[mode] ?? null };
  }, [runStepPersist, currentStep, config, mode]);

  return {
    ctx,
    steps,
    currentIndex: clampedIndex,
    furthestIndex,
    state,
    patch,
    resourceId,
    canContinue,
    isLastStep,
    submitting,
    error,
    goBack,
    goContinue,
    jumpTo,
    finish,
  };
}
