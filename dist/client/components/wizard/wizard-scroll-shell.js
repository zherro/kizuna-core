'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';
import { WizardLayoutContext } from './wizard-layout';
function prefersReducedMotion() {
    if (typeof window === 'undefined' || !window.matchMedia)
        return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
/**
 * Immersive vertical questionnaire layout (create mode only — see `Wizard`). Answered steps
 * collapse into accordion rows (label + ✓, click to reopen) so the page never turns into one
 * long scroll; the current step is always open and the next is revealed once it validates. Chrome
 * (mode label + toggle + Cancelar) is projected into the app's single header by `<Wizard>`.
 */
export function WizardScrollShell({ steps, currentIndex, canContinue, submitting, error, isLastStep, onAdvance, onFinish, finishBlocked, autoReveal = true, ground = 'default', naviSlot, renderStep, }) {
    const total = steps.length;
    const revealCount = Math.max(1, Math.min(currentIndex + 1, total));
    const visible = steps.slice(0, revealCount);
    const answeredPct = total > 1 ? Math.round((currentIndex / (total - 1)) * 100) : 100;
    const sectionRefs = useRef([]);
    const prevRevealRef = useRef(revealCount);
    const advancingRef = useRef(false);
    // Which answered steps the user re-opened. Current + future are always open.
    const [reopened, setReopened] = useState(() => new Set());
    const toggleReopen = (i) => setReopened((s) => {
        const next = new Set(s);
        if (next.has(i))
            next.delete(i);
        else
            next.add(i);
        return next;
    });
    // Collapse a step again once it stops being the current one, unless the user re-opened it.
    const prevCurrentRef = useRef(currentIndex);
    useEffect(() => {
        if (currentIndex > prevCurrentRef.current) {
            const justAnswered = prevCurrentRef.current;
            setReopened((s) => {
                if (!s.has(justAnswered))
                    return s;
                const next = new Set(s);
                next.delete(justAnswered);
                return next;
            });
        }
        prevCurrentRef.current = currentIndex;
    }, [currentIndex]);
    // Reveal the next step when the current one is valid. One discrete bump per pass.
    useEffect(() => {
        if (!autoReveal)
            return;
        if (submitting || advancingRef.current)
            return;
        if (isLastStep || !canContinue)
            return;
        advancingRef.current = true;
        onAdvance();
    }, [autoReveal, submitting, canContinue, isLastStep, currentIndex, onAdvance]);
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
    const contextValue = useMemo(() => ({ layout: 'scroll', stacked: true }), []);
    return (_jsx(WizardLayoutContext.Provider, { value: contextValue, children: _jsxs("div", { className: cn('flex h-full min-h-0 flex-col bg-background', ground === 'navi' && 'wz-navi-ground'), children: [_jsx("div", { className: "h-0.5 w-full shrink-0 bg-muted", children: _jsx("div", { className: "h-full bg-primary transition-[width] duration-500 ease-out", style: { width: `${answeredPct}%` } }) }), _jsx("main", { className: "min-h-0 flex-1 overflow-y-auto", children: _jsxs("div", { className: "mx-auto w-full max-w-2xl px-3 pb-40 pt-8 sm:px-6 sm:pt-12", children: [error ? (_jsx("div", { role: "alert", className: "wz-navi-error-box mb-6 rounded-md px-3 py-2 text-sm", children: error })) : null, _jsx("div", { className: "space-y-6", children: visible.map((step, index) => {
                                    const answered = index < currentIndex;
                                    const open = !answered || reopened.has(index);
                                    const isNewest = index === revealCount - 1 && revealCount > 1;
                                    return (_jsxs("section", { ref: (el) => {
                                            sectionRefs.current[index] = el;
                                        }, "data-step-key": step.key, "data-answered": answered || undefined, "data-open": open || undefined, className: cn('wz-scroll-step scroll-mt-20', isNewest && open && 'wz-scroll-reveal'), children: [answered ? (_jsxs("button", { type: "button", onClick: () => toggleReopen(index), className: "wz-scroll-summary flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm", "aria-expanded": open, children: [_jsx("span", { className: "grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground", children: _jsx(Check, { className: "h-3 w-3" }) }), _jsx("span", { className: "flex-1 font-medium text-foreground", children: step.label }), _jsx(ChevronDown, { className: cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180') })] })) : null, open ? (_jsx("div", { className: cn(answered && 'pt-3'), children: renderStep(step, index) })) : null] }, step.key));
                                }) }), naviSlot] }) }), _jsx("div", { "data-wz-footer": true, className: "sticky bottom-0 z-20 shrink-0 border-t border-border bg-background/95 backdrop-blur", children: _jsxs("div", { className: "mx-auto flex max-w-2xl items-center justify-end gap-3 px-3 py-3 sm:px-6", children: [!isLastStep ? (_jsx("span", { className: "mr-auto text-xs text-muted-foreground", children: canContinue ? 'Pronto pra avançar' : 'Continue respondendo' })) : null, !isLastStep && !autoReveal ? (_jsx(Button, { onClick: onAdvance, disabled: submitting || !canContinue, children: submitting ? ('Salvando...') : (_jsxs(_Fragment, { children: ["Avan\u00E7ar ", _jsx(ChevronRight, { className: "ml-1 h-4 w-4" })] })) })) : (_jsx(Button, { onClick: onFinish, disabled: submitting || !isLastStep || !canContinue || Boolean(finishBlocked), children: submitting ? ('Salvando...') : (_jsxs(_Fragment, { children: [_jsx(Check, { className: "mr-1 h-4 w-4" }), " Concluir"] })) }))] }) })] }) }));
}
export default WizardScrollShell;
//# sourceMappingURL=wizard-scroll-shell.js.map