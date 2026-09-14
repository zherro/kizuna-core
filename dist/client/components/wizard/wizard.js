'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardState } from './use-wizard-state';
import { WizardShell } from './wizard-shell';
import { WizardScrollShell } from './wizard-scroll-shell';
import { WizardLayoutToggle } from './wizard-layout-toggle';
import { WizardHeaderPortal } from './wizard-header-portal';
import { useWizardConversation } from './use-wizard-conversation';
import { NaviLayer } from './navi-layer';
import { NaviPanel } from './navi-panel';
import { readStoredLayout, writeStoredLayout } from './wizard-layout';
import { applyAssistPatch } from './apply-assist-patch';
import { Button } from '../ui/button';
const DEFAULT_MODE_LABELS = {
    create: 'Novo',
    edit: 'Editar',
    review: 'Revisão',
};
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
export function Wizard({ config, mode, entities, initialResourceId, initialState, initialRecord, modeLabels, assistant, conversation, onExit, variant, }) {
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
    // assistant / conversation may be hook-like factories — must be called unconditionally.
    const resolvedAssistant = typeof assistant === 'function' ? assistant() : assistant;
    const resolvedConversation = typeof conversation === 'function'
        ? conversation()
        : conversation;
    const wz = useWizardState({
        config,
        mode,
        entities,
        initialState: initialState ?? {},
        initialResourceId,
        initialRecord,
        assistant: resolvedAssistant,
    });
    const { steps, currentIndex, furthestIndex, canContinue, isLastStep, submitting, error, goBack, goContinue, jumpTo, finish, ctx, } = wz;
    const conv = useWizardConversation({
        adapter: resolvedConversation,
        steps,
        currentIndex,
        ctx,
        goContinue,
        submitting,
        canContinue,
        isLastStep,
    });
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
            const ok = typeof window === 'undefined' ||
                window.confirm('Sair agora descarta este anúncio. Tem certeza?');
            if (!ok)
                return;
        }
        leave();
    };
    const handleFinish = () => {
        void finish().then(({ href }) => {
            if (href)
                router.push(href);
        });
    };
    const Step = steps[currentIndex]?.Component;
    const activeStep = steps[currentIndex];
    // The one-shot assist button only shows when there is NO conversational Naví active.
    const showAssist = !conv.active &&
        Boolean(resolvedAssistant) &&
        (effectiveLayout === 'scroll' ? steps.some((s) => s.assist) : Boolean(activeStep?.assist));
    const assistControl = showAssist && resolvedAssistant ? (_jsx(WizardAssistControl, { assistant: resolvedAssistant, stepKey: activeStep?.key ?? steps[0]?.key ?? '', state: ctx.state, touched: ctx.touched, patch: ctx.patch })) : undefined;
    // Single header: mode label + layout toggle + assist affordance + Cancelar, projected into the
    // app's one full-bleed header via portal (no second header bar).
    const chrome = (_jsxs(WizardHeaderPortal, { children: [_jsx("span", { className: "hidden truncate text-sm font-semibold text-foreground sm:inline", children: modeLabel }), layoutToggle, assistControl, _jsx(Button, { variant: "ghost", size: "sm", onClick: exit, children: "Cancelar" })] }));
    const naviShown = conv.active || conv.endedMidway;
    const naviSlot = naviShown ? _jsx(NaviLayer, { conv: conv }) : undefined;
    const shell = effectiveLayout === 'scroll' ? (_jsx(WizardScrollShell, { steps: steps, currentIndex: currentIndex, canContinue: canContinue, submitting: submitting, error: error, isLastStep: isLastStep, onAdvance: () => void goContinue(), onFinish: handleFinish, autoReveal: !conv.active || conv.minimized, ground: conv.active ? 'navi' : 'default', naviSlot: naviSlot, renderStep: (step) => _jsx(step.Component, { ...ctx }) })) : (_jsx(WizardShell, { currentStep: currentStep, currentIndex: currentIndex, totalSteps: totalSteps, stepLabel: stepLabel, progress: progress, railSteps: railSteps, furthest: Math.min(furthestIndex + 1, totalSteps), onJump: (step) => void jumpTo(step - 1), isLastStep: isLastStep, showContinue: true, continueLabel: continueLabel, canContinue: canContinue, submitting: submitting, error: error, onBack: goBack, onContinue: () => void goContinue(), onFinish: handleFinish, ground: conv.active ? 'navi' : 'default', naviSlot: naviSlot, children: Step ? _jsx(Step, { ...ctx }) : null }));
    return (_jsxs(_Fragment, { children: [chrome, shell, conv.active ? _jsx(NaviPanel, { conv: conv }) : null] }));
}
export default Wizard;
//# sourceMappingURL=wizard.js.map