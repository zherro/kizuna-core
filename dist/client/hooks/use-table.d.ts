import { type ChangeEvent, type FormEvent } from 'react';
export type TableOrderDirection = 'asc' | 'desc';
export type ResourceListResponse<TItem> = {
    items: TItem[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
};
type UseTableOptions = {
    resource: string;
    endpoint?: string;
    pageSize?: number;
    orderBy?: string;
    orderDirection?: TableOrderDirection;
    filters?: Record<string, string | number | boolean | null | undefined>;
    initialSearch?: string;
    listOnLoad?: boolean;
};
export type UseTableResult<TItem> = {
    items: TItem[];
    setItems: (items: TItem[]) => void;
    loading: boolean;
    error: string;
    setError: (message: string) => void;
    clearError: () => void;
    search: string;
    setSearch: (value: string) => void;
    searchInputProps: {
        value: string;
        onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    };
    searchFormProps: {
        onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    };
    page: number;
    total: number;
    totalPages: number;
    pageSize: number;
    canGoPrevious: boolean;
    canGoNext: boolean;
    load: (targetPage: number, searchTerm: string) => Promise<void>;
    goToPage: (targetPage: number) => Promise<void>;
    refresh: () => Promise<void>;
    submitSearch: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};
export declare function useTable<TItem>({ resource, endpoint, pageSize: configuredPageSize, orderBy, orderDirection, filters, initialSearch, listOnLoad, }: UseTableOptions): {
    items: TItem[];
    setItems: import("react").Dispatch<import("react").SetStateAction<TItem[]>>;
    loading: boolean;
    error: string;
    setError: import("react").Dispatch<import("react").SetStateAction<string>>;
    clearError: () => void;
    search: string;
    setSearch: import("react").Dispatch<import("react").SetStateAction<string>>;
    searchInputProps: {
        value: string;
        onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    };
    searchFormProps: {
        onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    };
    page: number;
    total: number;
    totalPages: number;
    pageSize: number;
    canGoPrevious: boolean;
    canGoNext: boolean;
    load: (targetPage: number, searchTerm: string) => Promise<void>;
    goToPage: (targetPage: number) => Promise<void>;
    refresh: () => Promise<void>;
    submitSearch: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};
export {};
//# sourceMappingURL=use-table.d.ts.map