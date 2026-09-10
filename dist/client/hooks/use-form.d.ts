import { type FormikConfig, type FormikValues } from 'formik';
type SubmitContext<TValues extends FormikValues> = {
    setError: (message: string) => void;
    setSuccess: (message: string) => void;
    clearFeedback: () => void;
    reset: () => void;
    resetForm: (values: TValues) => void;
};
type ResourceSubmitConfig<TValues extends FormikValues, TPayload, TItem> = {
    resource: string;
    selectedId?: string | null;
    toPayload?: (values: TValues) => TPayload;
    errorMessage: string;
    successMessage: string;
    connectionErrorMessage: string;
    onSuccess?: (result: any, context: SubmitContext<TValues>) => Promise<void> | void;
};
type UseFormOptions<TValues extends FormikValues, TPayload, TItem> = {
    initialValues: FormikConfig<TValues>['initialValues'];
    validationSchema?: FormikConfig<TValues>['validationSchema'];
    onSubmit?: (values: TValues, context: SubmitContext<TValues>) => Promise<void> | void;
    resourceSubmit?: ResourceSubmitConfig<TValues, TPayload, TItem>;
    onReset?: () => void;
};
export declare function useForm<TValues extends FormikValues, TPayload = unknown, TItem = unknown>({ initialValues, validationSchema, onSubmit, resourceSubmit, onReset, }: UseFormOptions<TValues, TPayload, TItem>): {
    formik: any;
    submitting: boolean;
    error: string;
    success: string;
    setError: import("react").Dispatch<import("react").SetStateAction<string>>;
    setSuccess: import("react").Dispatch<import("react").SetStateAction<string>>;
    clearFeedback: () => void;
    reset: () => void;
    resetForm: (values: TValues) => void;
    handleSubmit: any;
};
export {};
//# sourceMappingURL=use-form.d.ts.map