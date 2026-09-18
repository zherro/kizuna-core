import { type ReactNode } from 'react';
import type { WizardStep } from './types';
export interface WizardScrollShellProps<S extends Record<string, unknown>> {
    steps: WizardStep<S>[];
    /** index of the step currently driving `canContinue` — also the count of answered steps */
    currentIndex: number;
    /** wizard state — only used to reset the auto-reveal grace delay whenever it changes (see
     * effect below); not read otherwise. */
    state: S;
    canContinue: boolean;
    submitting: boolean;
    error?: string;
    isLastStep: boolean;
    /** persist the current step and reveal the next (= `goContinue`) */
    onAdvance: () => void;
    onFinish: () => void;
    finishBlocked?: boolean;
    /**
     * When false, the automatic reveal-on-valid is suppressed — the conversational Naví drives the
     * advance instead. Defaults to `true` (classic questionnaire behaviour).
     */
    autoReveal?: boolean;
    /** `'navi'` washes the ground with a soft brand tint (conversational Naví active). */
    ground?: 'default' | 'navi';
    /** Persistent Naví dock, rendered once at the end of the scroll column (sticks to the bottom). */
    naviSlot?: ReactNode;
    renderStep: (step: WizardStep<S>, index: number) => ReactNode;
}
/**
 * Immersive vertical questionnaire layout (create mode only — see `Wizard`). Answered steps
 * collapse into accordion rows (label + ✓, click to reopen) so the page never turns into one
 * long scroll; the current step is always open and the next is revealed once it validates. Chrome
 * (mode label + toggle + Cancelar) is projected into the app's single header by `<Wizard>`.
 */
export declare function WizardScrollShell<S extends Record<string, unknown>>({ steps, currentIndex, state, canContinue, submitting, error, isLastStep, onAdvance, onFinish, finishBlocked, autoReveal, ground, naviSlot, renderStep, }: WizardScrollShellProps<S>): import("react/jsx-runtime").JSX.Element;
export default WizardScrollShell;
//# sourceMappingURL=wizard-scroll-shell.d.ts.map