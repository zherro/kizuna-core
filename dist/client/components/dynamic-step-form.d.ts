import type { ResourceScreenField } from '../../types/resource-screen';
type DynamicStepFormProps = {
    fields: ResourceScreenField[];
    values: Record<string, unknown>;
    errors?: Record<string, string>;
    onChange: (name: string, value: unknown) => void;
};
/**
 * A wizard step as a dynamic, config-driven form — the step-level counterpart to
 * `ResourceScreen`'s `fields[]`, built on the same `ResourceScreenField` vocabulary and the same
 * `DynamicField` renderer. Same single-`relation`-field limit as `ResourceScreen`, same reason:
 * rules of hooks.
 *
 * Not every step fits this shape. A step whose UI is genuinely bespoke — file upload, a map
 * picker, a rich-text editor — stays its own component. This is only for steps that really are
 * just "a few fields" (see `services/steps/StepStatusForm.tsx` for the first real usage).
 */
export declare function DynamicStepForm({ fields, values, errors, onChange, }: Readonly<DynamicStepFormProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=dynamic-step-form.d.ts.map