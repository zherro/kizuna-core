import type { LucideIcon } from 'lucide-react';
type NumberFieldProps = {
    label: string;
    value: number;
    onChange: (value: number) => void;
    icon?: LucideIcon;
    suffix?: string;
    hint?: string;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
};
/**
 * Numeric setting field: label + stepper (-/input/+) + optional suffix and hint.
 * Card shell matches ScheduleRow/ChoiceCard so it drops into the same settings grids.
 */
export declare function NumberField({ label, value, onChange, icon: Icon, suffix, hint, min, max, step, disabled, }: Readonly<NumberFieldProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=number-field.d.ts.map