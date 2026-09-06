type TenantRecord = {
    id?: string | number | null;
};
type UseTenantResourceOptions<T> = {
    resource: string;
    defaultItems: T[];
    pageSize?: number;
    loadErrorMessage?: string;
    saveErrorMessage?: string;
    saveSuccessMessage?: string;
    deleteErrorMessage?: string;
    deleteSuccessMessage?: string;
};
export declare function useTenantResource<T extends TenantRecord>({ resource, defaultItems, pageSize, loadErrorMessage, saveErrorMessage, saveSuccessMessage, deleteErrorMessage, deleteSuccessMessage, }: UseTenantResourceOptions<T>): {
    items: T[];
    setItems: import("react").Dispatch<import("react").SetStateAction<T[]>>;
    loading: boolean;
    saving: boolean;
    load: () => Promise<void>;
    save: (nextItems: T[]) => Promise<boolean>;
    saveOne: (item: T) => Promise<boolean>;
    remove: (id: string | number) => Promise<boolean>;
};
export {};
//# sourceMappingURL=use-tenant-resource.d.ts.map