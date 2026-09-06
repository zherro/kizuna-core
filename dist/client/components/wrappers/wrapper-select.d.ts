import type { FormikProps, FormikValues } from 'formik';
type SelectOption = {
    value: string;
    label: string;
};
type WrapperSelectProps<TValues extends FormikValues> = {
    formik: FormikProps<TValues>;
    field: keyof TValues & string;
    label?: string;
    className?: string;
    options: SelectOption[];
    placeholder?: string;
    onValueChange?: (value: string, formik: FormikProps<TValues>) => void;
};
export declare function WrapperSelect<TValues extends FormikValues>({ formik, field, label, className, options, placeholder, onValueChange, }: WrapperSelectProps<TValues>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=wrapper-select.d.ts.map