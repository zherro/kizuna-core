import type { WizardAssistant, WizardConfig, WizardEntities, WizardMode, WizardStep, WizardStepContext } from './types';
export interface UseWizardStateOptions<S> {
    config: WizardConfig<S>;
    mode: WizardMode;
    entities: WizardEntities;
    initialState: S;
    initialResourceId: string | null;
    /** Full resource record to seed the persister baseline (edit/review) so the first partial persist merges onto the real row instead of resetting unset columns. */
    initialRecord?: Record<string, unknown>;
    assistant?: WizardAssistant;
}
export interface UseWizardStateReturn<S> {
    ctx: WizardStepContext<S>;
    steps: WizardStep<S>[];
    currentIndex: number;
    furthestIndex: number;
    state: S;
    patch: (p: Partial<S>) => void;
    resourceId: string | null;
    canContinue: boolean;
    isLastStep: boolean;
    submitting: boolean;
    error: string;
    goBack: () => void;
    goContinue: () => Promise<void>;
    jumpTo: (i: number) => Promise<void>;
    finish: () => Promise<{
        href: string | null;
    }>;
}
export declare function useWizardState<S extends Record<string, unknown>>(opts: UseWizardStateOptions<S>): UseWizardStateReturn<S>;
//# sourceMappingURL=use-wizard-state.d.ts.map