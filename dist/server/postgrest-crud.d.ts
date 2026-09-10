type RecordValue = Record<string, unknown>;
export declare function listResource(resource: string, request: Request): Promise<any>;
export declare function createResource(resource: string, request: Request): Promise<any>;
export declare function getResourceById(resource: string, id: string): Promise<any>;
export declare function updateResource(resource: string, id: string, request: Request, options?: {
    skipMapInput: boolean;
}): Promise<any>;
export declare function deleteResource(resource: string, id: string): Promise<any>;
/**
 * Fetch resource items directly from a server component or API route,
 * bypassing the HTTP /api/resources/ layer. Auth is explicit — pass null
 * for public resources, or an auth header string for authenticated calls.
 *
 * Applies the resource config's select and mapOutput automatically.
 */
export declare function serverFetchResource<T = RecordValue>(resource: string, filters?: Record<string, string>, options?: {
    auth?: string | null;
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    /**
     * Segundos de cache (ISR) para esta leitura. Só use em leitura pública, estável e sem
     * `auth` — ex.: config global lida no layout raiz (ver docs/HARDENING.md §1/§2). Omitido =
     * `no-store` (default, sempre fresco).
     */
    revalidate?: number;
}): Promise<T[]>;
export declare function isRpcResource(resource: string): boolean;
export declare function executeRpcResource(resource: string, request: Request): Promise<any>;
export {};
//# sourceMappingURL=postgrest-crud.d.ts.map