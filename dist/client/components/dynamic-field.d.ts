import type { ResourceScreenField } from '../../types/resource-screen';
type DynamicFieldProps = {
    field: ResourceScreenField;
    value: unknown;
    error?: string;
    onChange: (value: unknown) => void;
    onBlur?: () => void;
    /** Only read when `field.type === 'relation'` — pre-loaded by the caller (`resource-screen.tsx`), never fetched here. */
    relationOptions?: Array<{
        value: string;
        label: string;
    }>;
};
/**
 * Renders exactly one field from a `ResourceScreenField` config. Framework-agnostic on purpose:
 * takes a plain `value`/`onChange`, not a Formik binding, so `ResourceScreen` drives it without
 * either depending on the other's state management.
 */
export declare function DynamicField({ field, value, error, onChange, onBlur, relationOptions, }: Readonly<DynamicFieldProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=dynamic-field.d.ts.map