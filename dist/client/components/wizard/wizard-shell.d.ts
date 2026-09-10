import type { ReactNode } from 'react';
import type { WizardMode } from './types';
import { type WizardRailStep } from './wizard-rail';
export interface WizardShellProps {
    mode: WizardMode;
    modeLabels?: Partial<Record<WizardMode, string>>;
    /** 1-based index of the current step, for display. */
    currentStep: number;
    currentIndex: number;
    totalSteps: number;
    stepLabel: string;
    progress: number;
    railSteps: WizardRailStep[];
    furthest: number;
    onJump: (step: number) => void;
    isLastStep: boolean;
    showContinue: boolean;
    continueLabel: string;
    canContinue: boolean;
    finishBlocked?: boolean;
    submitting: boolean;
    error?: string;
    onBack: () => void;
    onContinue: () => void;
    onFinish: () => void;
    onCancel: () => void;
    headerActions?: ReactNode;
    layoutToggle?: ReactNode;
    railExtra?: ReactNode;
    children: ReactNode;
}
export declare function WizardShell({ mode, modeLabels, currentStep, currentIndex, totalSteps, stepLabel, progress, railSteps, furthest, onJump, isLastStep, showContinue, continueLabel, canContinue, finishBlocked, submitting, error, onBack, onContinue, onFinish, onCancel, headerActions, layoutToggle, railExtra, children, }: WizardShellProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=wizard-shell.d.ts.map