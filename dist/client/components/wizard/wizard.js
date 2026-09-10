'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardState } from './use-wizard-state';
import { WizardShell } from './wizard-shell';
import { WizardScrollShell } from './wizard-scroll-shell';
import { WizardLayoutToggle } from './wizard-layout-toggle';
import { readStoredLayout, writeStoredLayout } from './wizard-layout';
import { applyAssistPatch } from './apply-assist-patch';
import { Button } from '../ui/button';
function WizardAssistControl({ assistant, stepKey, state, touched, patch, }) {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    if (assistant.status === 'unavailable')
        return null;
    if (assistant.status === 'degraded') {
        return (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => assistant.retry?.(), children: "Tentar de novo" }));
    }
    const run = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const res = await assistant.suggest({
                userText: '',
                state: state,
                stepKey,
            });
            const filtered = applyAssistPatch(res.patch, state, touched);
            patch(filtered);
            setMessage(res.needsMore ? `${res.message} (mais informações ajudam)` : res.message);
        }
        catch {
            setMessage('Não foi possível gerar uma sugestão.');
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("span", { className: "flex items-center gap-2", children: [message ? (_jsx("span", { className: "text-xs text-muted-foreground", role: "status", children: message })) : null, _jsx(Button, { variant: "ghost", size: "sm", onClick: () => void run(), disabled: busy, children: busy ? 'Preenchendo...' : 'Preencher com IA' })] }));
}
export function Wizard({ config, mode, entities, initialResourceId, initialState, initialRecord, modeLabels, assistant, onExit, variant, }) {
    const router = useRouter();
    // Layout is only switchable in `create`; edit/review always use the stepper (the scroll layout
    // has no persist-without-advance story). Seed from `variant` for a stable first paint, then
    // correct from localStorage on mount to avoid a hydration mismatch.
    const layoutSwitchable = mode === 'create';
    const [layout, setLayout] = useState(variant ?? 'stepper');
    useEffect(() => {
        if (!layoutSwitchable)
            return;
        const stored = readStoredLayout(config.resource);
        if (stored)
            setLayout(stored);
    }, [layoutSwitchable, config.resource]);
    const changeLayout = (next) => {
        setLayout(next);
        writeStoredLayout(config.resource, next);
    };
    const effectiveLayout = layoutSwitchable ? layout : 'stepper';
    const layoutToggle = layoutSwitchable ? (_jsx(WizardLayoutToggle, { value: layout, onChange: changeLayout })) : undefined;
    // assistant may be a hook-like factory — must be called unconditionally.
    const resolvedAssistant = typeof assistant === 'function'
        ? assistant()
        : assistant;
    const wz = useWizardState({
        config,
        mode,
        entities,
        initialState: (initialState ?? {}),
        initialResourceId,
        initialRecord,
        assistant: resolvedAssistant,
    });
    const { steps, currentIndex, furthestIndex, canContinue, isLastStep, submitting, error, goBack, goContinue, jumpTo, finish, } = wz;
    const totalSteps = steps.length;
    const currentStep = currentIndex + 1;
    const stepLabel = steps[currentIndex]?.label ?? '';
    const progress = totalSteps > 1 ? Math.round((currentIndex / (totalSteps - 1)) * 100) : 100;
    const railSteps = steps.map((s) => ({ label: s.label }));
    const continueLabel = mode === 'edit' ? 'Salvar e continuar' : 'Continuar';
    const exit = onExit ??
        (() => router.push(config.finishHrefByMode?.[mode] ?? '/painel'));
    const handleFinish = () => {
        void finish().then(({ href }) => {
            if (href)
                router.push(href);
        });
    };
    const Step = steps[currentIndex]?.Component;
    const { ctx } = wz;
    const activeStep = steps[currentIndex];
    // In the stepper each step opts into the assist button (`step.assist`). In the scroll layout the
    // whole form is on one screen, so keep the assistant reachable throughout as long as any step
    // wants it — `suggest()` already operates on the full state, not a single step.
    const showAssist = Boolean(resolvedAssistant) &&
        (effectiveLayout === 'scroll' ? steps.some((s) => s.assist) : Boolean(activeStep?.assist));
    const headerActions = showAssist && resolvedAssistant ? (_jsx(WizardAssistControl, { assistant: resolvedAssistant, stepKey: activeStep?.key ?? steps[0]?.key ?? '', state: ctx.state, touched: ctx.touched, patch: ctx.patch })) : undefined;
    if (effectiveLayout === 'scroll') {
        return (_jsx(WizardScrollShell, { mode: mode, modeLabels: modeLabels, steps: steps, currentIndex: currentIndex, canContinue: canContinue, submitting: submitting, error: error, isLastStep: isLastStep, onAdvance: () => void goContinue(), onFinish: handleFinish, onCancel: exit, headerActions: headerActions, layoutToggle: layoutToggle, renderStep: (step) => _jsx(step.Component, { ...ctx }) }));
    }
    return (_jsx(WizardShell, { headerActions: headerActions, layoutToggle: layoutToggle, mode: mode, modeLabels: modeLabels, currentStep: currentStep, currentIndex: currentIndex, totalSteps: totalSteps, stepLabel: stepLabel, progress: progress, railSteps: railSteps, furthest: Math.min(furthestIndex + 1, totalSteps), onJump: (step) => void jumpTo(step - 1), isLastStep: isLastStep, showContinue: true, continueLabel: continueLabel, canContinue: canContinue, submitting: submitting, error: error, onBack: goBack, onContinue: () => void goContinue(), onFinish: handleFinish, onCancel: exit, children: Step ? _jsx(Step, { ...ctx }) : null }));
}
export default Wizard;
//# sourceMappingURL=wizard.js.map