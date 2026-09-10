export type StepperStep = {
    id: string | number;
    title?: string;
    description?: string;
    disabled?: boolean;
};
type StepperProps = {
    steps: StepperStep[];
    value: StepperStep['id'];
    onValueChange: (value: StepperStep['id']) => void;
    className?: string;
};
export declare function Stepper({ steps, value, onValueChange, className }: StepperProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=stepper.d.ts.map