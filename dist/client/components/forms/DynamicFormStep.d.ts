import { type FormValues } from '../form-builder';
export type DynamicFormStepHandle = {
    /** Persist the current answers via `fn_form_result_upsert`. Resolves `true` on success. */
    persist: () => Promise<boolean>;
    /** Current answers as the flat `{ [key]: value }` map emitted by `FormRenderer`. */
    getValues: () => FormValues;
};
type DynamicFormStepProps = {
    formKey: string;
    domain: string;
    referenceId: string;
    /** Reported whenever validity changes — the wizard gates "continuar" on this. */
    onValidChange?: (valid: boolean) => void;
    className?: string;
};
/**
 * Wizard-step wrapper around the form-builder `FormRenderer`. Loads any existing answers for the
 * `(formKey, domain, referenceId)` triple, renders the form, runs `validate()` on every change
 * and reports validity up, and exposes an imperative `persist()` (call it from the wizard's own
 * step-level persist) that upserts through `fn_form_result_upsert`.
 */
export declare const DynamicFormStep: import("react").ForwardRefExoticComponent<DynamicFormStepProps & import("react").RefAttributes<DynamicFormStepHandle>>;
export {};
//# sourceMappingURL=DynamicFormStep.d.ts.map