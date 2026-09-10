import type { FormikProps, FormikValues } from 'formik';
type WrapperTextareaProps<TValues extends FormikValues> = {
    formik: FormikProps<TValues>;
    field: keyof TValues & string;
    label?: string;
    className?: string;
    placeholder?: string;
    rows?: number;
};
/** @deprecated Use `FormField` from `@/components/ui-better-soft/forms/form-field` (`as="textarea"`) instead. */
export declare function WrapperTextarea<TValues extends FormikValues>({ formik, field, label, className, placeholder, rows, }: WrapperTextareaProps<TValues>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=wrapper-textarea.d.ts.map