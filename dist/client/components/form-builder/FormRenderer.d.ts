import { type FormSchema, type FormValues } from './types';
type Props = {
    schema: FormSchema;
    values: FormValues;
    onChange: (values: FormValues) => void;
    onSubmit?: (values: FormValues) => void;
    className?: string;
    widthOverride?: number;
};
export declare function FormRenderer({ schema, values, onChange, onSubmit, className, widthOverride, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=FormRenderer.d.ts.map