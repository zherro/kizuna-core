type RecordValue = Record<string, unknown>;
export declare function parseActive(value: unknown): boolean;
export declare function makeSlug(value: string): string;
export type ResourceConfig = {
    schema?: string;
    table: string;
    listRequiresAuth?: boolean;
    returnRepresentation?: boolean;
    returnCountPreferDisabled?: boolean;
    select: string;
    primaryKey: string;
    defaultOrder?: string;
    searchableColumns: string[];
    maxPageSize?: number;
    requiredFields?: string[];
    softDeleteField?: string;
    mapInput?: (input: RecordValue) => RecordValue;
    mapOutput?: (record: RecordValue) => RecordValue;
};
export type RpcConfig = {
    schema?: string;
    requiresAuth?: boolean;
};
export {};
//# sourceMappingURL=resource.d.ts.map