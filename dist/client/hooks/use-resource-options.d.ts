export type ResourceOption = {
    id: string | number;
    name?: string;
    [key: string]: any;
};
type UseResourceOptionsOptions = {
    resource: string;
    labelField?: string;
    filter?: Record<string, string | number | boolean>;
    /**
     * Teto de linhas trazidas do server. Default 1000. Para recursos que podem crescer muito
     * (`categories`, `funcoes`), prefira baixar isto e usar `search` para o usuário filtrar.
     */
    pageSize?: number;
    /**
     * Termo de busca server-side (`ilike` sobre as `searchableColumns` do recurso). Debounced
     * internamente (250 ms) — passe o texto cru do input direto.
     */
    search?: string;
    /** Coluna de ordenação (default: ordem padrão do recurso no server). */
    orderBy?: string;
};
export declare function useResourceOptions<T extends ResourceOption>({ resource, labelField, filter, pageSize, search, orderBy, }: UseResourceOptionsOptions): {
    options: T[];
    loading: boolean;
    error: string;
    getLabel: (option: T) => string;
};
export {};
//# sourceMappingURL=use-resource-options.d.ts.map