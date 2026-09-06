export type OnboardingProgressStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
type OnboardingProgressItem = {
    id: string;
    userId: string;
    stepId: string;
    status: OnboardingProgressStatus;
    completedAt: string | null;
};
export declare function useOnboardingProgress(userId: string | null): {
    progress: Record<string, OnboardingProgressItem>;
    loading: boolean;
    load: () => Promise<void>;
    updateStep: (stepId: string, status: OnboardingProgressStatus) => Promise<boolean>;
};
export {};
//# sourceMappingURL=use-onboarding-progress.d.ts.map