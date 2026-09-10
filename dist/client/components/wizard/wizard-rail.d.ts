export type WizardRailStep = {
    label: string;
};
/** Vertical, clickable step list — desktop only (the narrow left column of the wizard). */
export declare function WizardRail({ steps, current, furthest, onJump, }: {
    steps: WizardRailStep[];
    current: number;
    furthest: number;
    onJump: (step: number) => void;
}): import("react/jsx-runtime").JSX.Element;
/** Horizontal, clickable disc strip — mobile only (under the progress bar). */
export declare function WizardStrip({ steps, current, furthest, onJump, }: {
    steps: WizardRailStep[];
    current: number;
    furthest: number;
    onJump: (step: number) => void;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=wizard-rail.d.ts.map