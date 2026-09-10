import { type WizardRailStep } from './wizard-rail';
export declare function WizardProgress({ stepLabel, currentStep, totalSteps, progress, steps, current, furthest, onJump, }: {
    stepLabel: string;
    currentStep: number;
    totalSteps: number;
    progress: number;
    steps: WizardRailStep[];
    current: number;
    furthest: number;
    onJump: (step: number) => void;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=wizard-progress.d.ts.map