import type { HTMLInputTypeAttribute } from 'react';
import type { FormikProps, FormikValues } from 'formik';
type WrapperFieldProps<TValues extends FormikValues> = {
    formik: FormikProps<TValues>;
    field: keyof TValues & string;
    label?: string;
    className?: string;
    placeholder?: string;
    type?: HTMLInputTypeAttribute;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
    transform?: (value: string) => string;
};
/** @deprecated Use `FormField` from `@/components/ui-better-soft/forms/form-field` (`as="input"`) instead. */
export declare function WrapperField<TValues extends FormikValues>({ formik, field, label, className, placeholder, type, inputMode, transform, }: WrapperFieldProps<TValues>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=wrapper-field.d.ts.map