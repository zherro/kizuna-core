import { submitResource } from '../../../lib/resource-submit';
/**
 * Generic read-merge-write persister for a wizard against a single resource.
 *
 * Every write sends the FULL last-loaded baseline record spread before the
 * step's overrides (`{ ...baseline, ...overrides }`). This is deliberate: the
 * resource `mapInput` is a clean snake-only projection that rebuilds every
 * column, so the merged payload must carry every field or columns get reset.
 */
export function createResourcePersister(opts) {
    let baseline = null;
    let id = opts.resourceId;
    async function run(overrides) {
        const merged = { ...(baseline ?? {}), ...overrides };
        const result = await submitResource({
            resource: opts.resource,
            values: overrides,
            selectedId: id != null ? String(id) : null,
            toPayload: () => merged,
            errorMessage: 'Não foi possível salvar.',
            successMessage: '',
            connectionErrorMessage: 'Não foi possível salvar.',
            setError: opts.onError,
            setSuccess: () => { },
        });
        if (!result.ok || !result.data || !result.data.item) {
            return { ok: false, item: null };
        }
        baseline = result.data.item;
        if (id == null && result.data.item.id != null) {
            id = String(result.data.item.id);
            opts.onId?.(String(result.data.item.id));
        }
        return { ok: true, item: result.data.item };
    }
    return {
        get baseline() {
            return baseline;
        },
        setBaseline(item) {
            baseline = item;
        },
        persist: (overrides) => run(overrides),
        persistExtras: (partial) => run({
            extras: { ...(baseline?.extras ?? {}), ...partial },
        }),
    };
}
//# sourceMappingURL=persist-resource.js.map