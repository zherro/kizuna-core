'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';
import { WizardLayoutContext } from './wizard-layout';
const DEFAULT_MODE_LABELS = {
    create: 'Novo',
    edit: 'Editar',
    review: 'Revisão',
};
function prefersReducedMotion() {
    if (typeof window === 'undefined' || !window.matchMedia)
        return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
/**
 * Immersive vertical questionnaire layout (create mode only — see `Wizard`). Answered steps stay
 * stacked and editable; the next step is revealed once the current one validates and the page
 * glides to it. One "Concluir" at the end — no per-step Voltar/Continuar. Reuses `useWizardState`
 * untouched: reveal is just `goContinue()` fired from an effect, the same path the stepper button
 * takes, so per-step `persist` still runs on every advance.
 */
export function WizardScrollShell({ mode, modeLabels, steps, currentIndex, canContinue, submitting, error, isLastStep, onAdvance, onFinish, onCancel, finishBlocked, headerActions, layoutToggle, renderStep, }) {
    const modeLabel = modeLabels?.[mode] ?? DEFAULT_MODE_LABELS[mode];
    const total = steps.length;
    const revealCount = Math.max(1, Math.min(currentIndex + 1, total));
    const visible = steps.slice(0, revealCount);
    const answeredPct = total > 1 ? Math.round((currentIndex / (total - 1)) * 100) : 100;
    const sectionRefs = useRef([]);
    const prevRevealRef = useRef(revealCount);
    const advancingRef = useRef(false);
    // Reveal the next step when the current one is valid. One discrete bump per pass.
    useEffect(() => {
        if (submitting || advancingRef.current)
            return;
        if (isLastStep || !canContinue)
            return;
        advancingRef.current = true;
        onAdvance();
    }, [submitting, canContinue, isLastStep, currentIndex, onAdvance]);
    useEffect(() => {
        advancingRef.current = false;
    }, [currentIndex, submitting]);
    // Glide to the newest section, but only when the count actually grew.
    useEffect(() => {
        const grew = revealCount > prevRevealRef.current;
        prevRevealRef.current = revealCount;
        if (!grew)
            return;
        sectionRefs.current[revealCount - 1]?.scrollIntoView({
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'start',
        });
    }, [revealCount]);
    return (_jsx(WizardLayoutContext.Provider, { value: { layout: 'scroll', stacked: true }, children: _jsxs("div", { className: "flex min-h-[calc(100vh-56px)] flex-col bg-background", children: [_jsxs("div", { className: "sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur", children: [_jsxs("div", { className: "mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2 sm:px-6", children: [_jsx("p", { className: "text-sm font-semibold text-foreground", children: modeLabel }), _jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [layoutToggle, headerActions, _jsxs(Button, { variant: "ghost", size: "sm", onClick: onCancel, children: [_jsx(X, { className: "mr-1 h-4 w-4" }), " Sair"] })] })] }), _jsx("div", { className: "h-0.5 w-full bg-muted", children: _jsx("div", { className: "h-full bg-primary transition-[width] duration-500 ease-out", style: { width: `${answeredPct}%` } }) })] }), _jsx("main", { className: "min-h-0 flex-1 overflow-y-auto", children: _jsxs("div", { className: "mx-auto w-full max-w-2xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12", children: [_jsxs("p", { className: "mb-8 text-sm text-muted-foreground", children: ["Passo ", Math.min(currentIndex + 1, total), " de ", total] }), error ? (_jsx("div", { role: "alert", className: "mb-6 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive", children: error })) : null, _jsx("div", { className: "space-y-10", children: visible.map((step, index) => {
                                    const answered = index < currentIndex;
                                    const isNewest = index === revealCount - 1 && revealCount > 1;
                                    return (_jsx("section", { ref: (el) => {
                                            sectionRefs.current[index] = el;
                                        }, "data-step-key": step.key, "data-answered": answered || undefined, className: cn('wz-scroll-step scroll-mt-20', isNewest && 'wz-scroll-reveal'), children: renderStep(step, index) }, step.key));
                                }) })] }) }), _jsx("div", { className: "sticky bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur", children: _jsxs("div", { className: "mx-auto flex max-w-2xl items-center justify-end gap-3 px-4 py-3 sm:px-6", children: [!isLastStep ? (_jsx("span", { className: "mr-auto text-xs text-muted-foreground", children: "Responda as perguntas para continuar" })) : null, _jsx(Button, { onClick: onFinish, disabled: submitting || !isLastStep || !canContinue || Boolean(finishBlocked), children: submitting ? ('Salvando...') : (_jsxs(_Fragment, { children: [_jsx(Check, { className: "mr-1 h-4 w-4" }), " Concluir"] })) })] }) })] }) }));
}
export default WizardScrollShell;
//# sourceMappingURL=wizard-scroll-shell.js.map