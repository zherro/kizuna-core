type MutationResponse<TItem> = {
    message?: string;
    item?: TItem;
};
type SubmitResourceOptions<TValues, TPayload> = {
    resource: string;
    values: TValues;
    selectedId?: string | null;
    toPayload?: (values: TValues) => TPayload;
    errorMessage: string;
    successMessage: string;
    connectionErrorMessage: string;
    setError: (message: string) => void;
    setSuccess: (message: string) => void;
};
/**
 * Generic helper for create/update requests against /api/resources/:resource.
 * It centralizes method/url selection, payload serialization and default
 * error/success feedback handling.
 */
export declare function submitResource<TValues, TPayload = TValues, TItem = unknown>({ resource, values, selectedId, toPayload, errorMessage, successMessage, connectionErrorMessage, setError, setSuccess, }: SubmitResourceOptions<TValues, TPayload>): Promise<{
    ok: false;
    data: null;
} | {
    ok: true;
    data: MutationResponse<TItem>;
}>;
export {};
//# sourceMappingURL=resource-submit.d.ts.map