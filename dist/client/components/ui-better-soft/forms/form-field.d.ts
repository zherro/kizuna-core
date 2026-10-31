import type { HTMLAttributes, HTMLInputTypeAttribute } from 'react';
import type { FormikProps, FormikValues } from 'formik';
type FormFieldBaseProps<TValues extends FormikValues> = {
    formik: FormikProps<TValues>;
    field: keyof TValues & string;
    label?: string;
    description?: string;
    className?: string;
};
type FormFieldInputProps<TValues extends FormikValues> = FormFieldBaseProps<TValues> & {
    as?: 'input';
    type?: HTMLInputTypeAttribute;
    placeholder?: string;
    inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
    transform?: (value: string) => string;
};
type FormFieldTextareaProps<TValues extends FormikValues> = FormFieldBaseProps<TValues> & {
    as: 'textarea';
    placeholder?: string;
    rows?: number;
};
type FormFieldSwitchProps<TValues extends FormikValues> = FormFieldBaseProps<TValues> & {
    as: 'switch';
};
type FormFieldProps<TValues extends FormikValues> = FormFieldInputProps<TValues> | FormFieldTextareaProps<TValues> | FormFieldSwitchProps<TValues>;
/**
 * Normalized replacement for `wrapper-field.tsx` / `wrapper-checkbox.tsx` /
 * `wrapper-textarea.tsx` (see `src/components/wrraper/`, now deprecated) —
 * one Formik-bound field component covering input, textarea and switch,
 * styled with this app's fixed visual language instead of raw wrapper markup.
 */
export declare function FormField<TValues extends FormikValues>(props: Readonly<FormFieldProps<TValues>>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=form-field.d.ts.map