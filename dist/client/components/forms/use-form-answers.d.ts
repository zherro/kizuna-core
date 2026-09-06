import type { FormSchema, FormValues } from '../form-builder';
/**
 * Loads (and upserts) the current `form_results` row for a `(formKey, domain, referenceId)`
 * triple. Reads go through the generic resource route; the write goes through the
 * `fn_form_result_upsert` RPC via the consuming app's `/api/postgrest/rpc` proxy — never a
 * direct POST/PATCH, because the singleton key is composite and no row id is known at capture
 * time (see the forms-manager design doc + `.claude/domains/forms.md`).
 */
export type FormAnswerRow = {
    id: string | number;
    formId: string | number | null;
    formKey: string;
    referenceId: string;
    domain: string;
    version: number;
    schemaSnapshot: FormSchema;
    answers: FormValues;
    submittedBy: string | null;
    createdAt?: string;
    updatedAt?: string;
};
type UseFormAnswersArgs = {
    formKey: string;
    domain: string;
    referenceId: string;
    /** Skip loading until the caller has a real referenceId / formKey. */
    enabled?: boolean;
};
type UseFormAnswersResult = {
    data: FormAnswerRow | null;
    loading: boolean;
    error: string;
    submitting: boolean;
    reload: () => Promise<void>;
    submit: (answers: FormValues) => Promise<FormAnswerRow | null>;
};
export declare function useFormAnswers({ formKey, domain, referenceId, enabled, }: UseFormAnswersArgs): UseFormAnswersResult;
export {};
//# sourceMappingURL=use-form-answers.d.ts.map