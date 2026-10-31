export interface ResourcePersister<S> {
    readonly baseline: Record<string, unknown> | null;
    setBaseline(item: Record<string, unknown>): void;
    persist(overrides: Record<string, unknown>): Promise<{
        ok: boolean;
        item: Record<string, unknown> | null;
    }>;
    persistExtras(partialExtras: Record<string, unknown>): Promise<{
        ok: boolean;
        item: Record<string, unknown> | null;
    }>;
}
/**
 * Generic read-merge-write persister for a wizard against a single resource.
 *
 * Every write sends the FULL last-loaded baseline record spread before the
 * step's overrides (`{ ...baseline, ...overrides }`). This is deliberate: the
 * resource `mapInput` is a clean snake-only projection that rebuilds every
 * column, so the merged payload must carry every field or columns get reset.
 */
export declare function createResourcePersister<S extends Record<string, unknown>>(opts: {
    resource: string;
    resourceId: string | number | null;
    onError: (msg: string) => void;
    onId?: (id: string) => void;
}): ResourcePersister<S>;
//# sourceMappingURL=persist-resource.d.ts.map