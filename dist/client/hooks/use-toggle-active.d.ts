type UseToggleActiveOptions = {
    resource: string;
    itemId: string | null | undefined;
    currentStatus: boolean;
    onSuccess?: (newStatus: boolean) => void;
    onError?: (message: string) => void;
};
export declare function useToggleActive({ resource, itemId, currentStatus, onSuccess, onError, }: UseToggleActiveOptions): {
    toggling: boolean;
    toggle: () => Promise<void>;
};
export {};
//# sourceMappingURL=use-toggle-active.d.ts.map