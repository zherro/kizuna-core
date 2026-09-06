export type ResourceOption = {
    id: string | number;
    name?: string;
    [key: string]: any;
};
type UseResourceOptionsOptions = {
    resource: string;
    labelField?: string;
    filter?: Record<string, string | number | boolean>;
};
export declare function useResourceOptions<T extends ResourceOption>({ resource, labelField, filter, }: UseResourceOptionsOptions): {
    options: T[];
    loading: boolean;
    error: string;
    getLabel: (option: T) => string;
};
export {};
//# sourceMappingURL=use-resource-options.d.ts.map