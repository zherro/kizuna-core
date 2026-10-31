import { type FormField } from './types';
type Props = {
    field: FormField;
    onChange: (f: FormField) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    mode?: 'simple' | 'advanced';
    /** fields that appear before this one — the only valid `visibleWhen` targets */
    priorFields?: FormField[];
    /** duplicate/invalid-key message for this field, surfaced by FormBuilder */
    keyError?: string;
};
export declare function FieldEditor({ field, onChange, onDelete, onDuplicate, mode, priorFields, keyError, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=FieldEditor.d.ts.map