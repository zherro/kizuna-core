import type { FormikProps, FormikValues } from 'formik';
type WrapperCheckboxProps<TValues extends FormikValues> = {
    formik: FormikProps<TValues>;
    field: keyof TValues & string;
    label: string;
    className?: string;
};
/** @deprecated Use `FormField` from `@/components/ui-better-soft/forms/form-field` (`as="switch"`) instead. */
export declare function WrapperCheckbox<TValues extends FormikValues>({ formik, field, label, className, }: WrapperCheckboxProps<TValues>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=wrapper-checkbox.d.ts.map