'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import { resolveSteps } from './resolve-steps';
import { createResourcePersister } from './persist-resource';
export function useWizardState(opts) {
    const { config, mode, entities, initialState, initialResourceId, initialRecord, assistant } = opts;
    const [state, setState] = useState(initialState);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [furthestIndex, setFurthestIndex] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [resourceId, setResourceId] = useState(initialResourceId);
    const touchedRef = useRef(new Set());
    const persisterRef = useRef(null);
    if (persisterRef.current === null) {
        persisterRef.current = createResourcePersister({
            resource: config.resource,
            resourceId: initialResourceId,
            onError: (msg) => setError(msg),
            onId: (id) => setResourceId(id),
        });
        if (initialRecord) {
            persisterRef.current.setBaseline(initialRecord);
        }
    }
    const persister = persisterRef.current;
    const patch = useCallback((p) => {
        for (const k of Object.keys(p))
            touchedRef.current.add(k);
        setState((s) => ({ ...s, ...p }));
    }, []);
    const doPersist = useCallback(async (overrides) => {
        setSubmitting(true);
        try {
            setError('');
            const r = await persister.persist(overrides);
            return { ok: r.ok, item: r.item ?? null };
        }
        catch {
            return { ok: false, item: null };
        }
        finally {
            setSubmitting(false);
        }
    }, [persister]);
    const doPersistExtras = useCallback(async (partialExtras) => {
        setSubmitting(true);
        try {
            setError('');
            const r = await persister.persistExtras(partialExtras);
            return { ok: r.ok, item: r.item ?? null };
        }
        catch {
            return { ok: false, item: null };
        }
        finally {
            setSubmitting(false);
        }
    }, [persister]);
    const ctx = useMemo(() => ({
        state,
        patch,
        entities,
        resourceId,
        mode,
        assist: assistant,
        persist: doPersist,
        persistExtras: doPersistExtras,
        touched: touchedRef.current,
    }), [state, patch, entities, resourceId, mode, assistant, doPersist, doPersistExtras]);
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
    const currentStep = steps[clampedIndex];
    const isLastStep = clampedIndex >= steps.length - 1;
    const canContinue = currentStep?.canContinue ? currentStep.canContinue(ctx) : true;
    const runStepPersist = useCallback(async (step) => {
        if (!step?.persist)
            return true;
        setSubmitting(true);
        try {
            setError('');
            await step.persist(ctx);
            return true;
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
            return false;
        }
        finally {
            setSubmitting(false);
        }
    }, [ctx]);
    const goBack = useCallback(() => {
        if (submitting)
            return;
        setCurrentIndex((i) => Math.max(0, i - 1));
    }, [submitting]);
    const goContinue = useCallback(async () => {
        if (!currentStep)
            return;
        if (currentStep.canContinue && !currentStep.canContinue(ctx))
            return;
        const ok = await runStepPersist(currentStep);
        if (!ok)
            return;
        setCurrentIndex((i) => (i < steps.length - 1 ? i + 1 : i));
    }, [currentStep, ctx, runStepPersist, steps.length]);
    const jumpTo = useCallback(async (target) => {
        if (target === clampedIndex)
            return;
        if (target < 0 || target > furthestIndex)
            return;
        if (target > clampedIndex) {
            const ok = await runStepPersist(currentStep);
            if (!ok)
                return;
        }
        setCurrentIndex(target);
    }, [clampedIndex, furthestIndex, currentStep, runStepPersist]);
    const finish = useCallback(async () => {
        const ok = await runStepPersist(currentStep);
        if (!ok)
            return { href: null };
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
//# sourceMappingURL=use-wizard-state.js.map