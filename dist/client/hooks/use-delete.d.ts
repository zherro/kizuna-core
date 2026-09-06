type UseDeleteOptions = {
    resource: string;
    selectedId?: string | null;
    errorMessage: string;
    successMessage: string;
    connectionErrorMessage: string;
    setError: (message: string) => void;
    setSuccess: (message: string) => void;
    onSuccess?: () => Promise<void> | void;
};
export declare function useDelete({ resource, selectedId, errorMessage, successMessage, connectionErrorMessage, setError, setSuccess, onSuccess, }: UseDeleteOptions): {
    deleting: boolean;
    remove: () => Promise<void>;
};
export {};
//# sourceMappingURL=use-delete.d.ts.map