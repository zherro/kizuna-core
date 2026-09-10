import { submitResource } from '../../../lib/resource-submit';

export interface ResourcePersister<S> {
  readonly baseline: Record<string, unknown> | null;
  setBaseline(item: Record<string, unknown>): void;
  persist(
    overrides: Record<string, unknown>,
  ): Promise<{ ok: boolean; item: Record<string, unknown> | null }>;
  persistExtras(
    partialExtras: Record<string, unknown>,
  ): Promise<{ ok: boolean; item: Record<string, unknown> | null }>;
}

/**
 * Generic read-merge-write persister for a wizard against a single resource.
 *
 * Every write sends the FULL last-loaded baseline record spread before the
 * step's overrides (`{ ...baseline, ...overrides }`). This is deliberate: the
 * resource `mapInput` is a clean snake-only projection that rebuilds every
 * column, so the merged payload must carry every field or columns get reset.
 */
export function createResourcePersister<S extends Record<string, unknown>>(opts: {
  resource: string;
  resourceId: string | number | null;
  onError: (msg: string) => void;
  onId?: (id: string) => void;
}): ResourcePersister<S> {
  let baseline: Record<string, unknown> | null = null;
  let id = opts.resourceId;

  async function run(
    overrides: Record<string, unknown>,
  ): Promise<{ ok: boolean; item: Record<string, unknown> | null }> {
    const merged = { ...(baseline ?? {}), ...overrides };
    const result = await submitResource<
      Record<string, unknown>,
      Record<string, unknown>,
      Record<string, unknown>
    >({
      resource: opts.resource,
      values: overrides,
      selectedId: id != null ? String(id) : null,
      toPayload: () => merged,
      errorMessage: 'Não foi possível salvar.',
      successMessage: '',
      connectionErrorMessage: 'Não foi possível salvar.',
      setError: opts.onError,
      setSuccess: () => {},
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
    setBaseline(item: Record<string, unknown>) {
      baseline = item;
    },
    persist: (overrides: Record<string, unknown>) => run(overrides),
    persistExtras: (partial: Record<string, unknown>) =>
      run({
        extras: { ...((baseline?.extras as Record<string, unknown>) ?? {}), ...partial },
      }),
  };
}
