export type FixedBottomProgressStep = {
    id: number;
    label: string;
    disabled?: boolean;
};
type FixedBottomProgressProps = {
    steps: FixedBottomProgressStep[];
    value: number;
    className?: string;
    fixed?: boolean;
};
export declare function FixedBottomProgress({ steps, value, className, fixed, }: FixedBottomProgressProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=fixed-bottom-progress.d.ts.map