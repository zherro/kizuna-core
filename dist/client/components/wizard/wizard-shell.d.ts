import type { ReactNode } from 'react';
import { type WizardRailStep } from './wizard-rail';
export interface WizardShellProps {
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
    railExtra?: ReactNode;
    /** `'navi'` washes the ground with a soft brand tint (conversational Naví active). */
    ground?: 'default' | 'navi';
    /** Persistent Naví dock, rendered once at the end of the scroll column (sticks to the bottom). */
    naviSlot?: ReactNode;
    children: ReactNode;
}
/**
 * Stepper layout. Chrome (mode label + layout toggle + Cancelar) is projected into the app's
 * single header by `<Wizard>` via `WizardHeaderPortal` — this shell renders no top bar of its
 * own. Flex column of fixed height: progress `shrink-0`, step area scrolls, footer `shrink-0`.
 */
export declare function WizardShell({ currentStep, currentIndex, totalSteps, stepLabel, progress, railSteps, furthest, onJump, isLastStep, showContinue, continueLabel, canContinue, finishBlocked, submitting, error, onBack, onContinue, onFinish, railExtra, ground, naviSlot, children, }: WizardShellProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=wizard-shell.d.ts.map