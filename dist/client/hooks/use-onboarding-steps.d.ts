type OnboardingStep = {
    id: string;
    name: string;
    slug: string;
    description: string;
    stepOrder: number;
    isRequired: boolean;
};
export declare function useOnboardingSteps(role?: string): {
    steps: OnboardingStep[];
    loading: boolean;
    load: () => Promise<void>;
};
export {};
//# sourceMappingURL=use-onboarding-steps.d.ts.map