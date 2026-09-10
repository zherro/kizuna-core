import { type ReactNode } from 'react';
import type { WizardMode, WizardStep } from './types';
export interface WizardScrollShellProps<S extends Record<string, unknown>> {
    mode: WizardMode;
    modeLabels?: Partial<Record<WizardMode, string>>;
    steps: WizardStep<S>[];
    /** index of the step currently driving `canContinue` — also the count of answered steps */
    currentIndex: number;
    canContinue: boolean;
    submitting: boolean;
    error?: string;
    isLastStep: boolean;
    /** persist the current step and reveal the next (= `goContinue`) */
    onAdvance: () => void;
    onFinish: () => void;
    onCancel: () => void;
    finishBlocked?: boolean;
    headerActions?: ReactNode;
    layoutToggle?: ReactNode;
    renderStep: (step: WizardStep<S>, index: number) => ReactNode;
}
/**
 * Immersive vertical questionnaire layout (create mode only — see `Wizard`). Answered steps stay
 * stacked and editable; the next step is revealed once the current one validates and the page
 * glides to it. One "Concluir" at the end — no per-step Voltar/Continuar. Reuses `useWizardState`
 * untouched: reveal is just `goContinue()` fired from an effect, the same path the stepper button
 * takes, so per-step `persist` still runs on every advance.
 */
export declare function WizardScrollShell<S extends Record<string, unknown>>({ mode, modeLabels, steps, currentIndex, canContinue, submitting, error, isLastStep, onAdvance, onFinish, onCancel, finishBlocked, headerActions, layoutToggle, renderStep, }: WizardScrollShellProps<S>): import("react/jsx-runtime").JSX.Element;
export default WizardScrollShell;
//# sourceMappingURL=wizard-scroll-shell.d.ts.map