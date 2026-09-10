function isEmpty(v: unknown): boolean {
  return v === '' || v === null || v === undefined || v === 0 ||
    (Array.isArray(v) && v.length === 0);
}

export function applyAssistPatch<S extends Record<string, unknown>>(
  patch: Partial<S>, state: S, touched: Set<keyof S>, opts?: { always?: (keyof S)[] },
): Partial<S> {
  const always = new Set(opts?.always ?? []);
  const out: Partial<S> = {};
  for (const k of Object.keys(patch) as (keyof S)[]) {
    if (patch[k] === undefined) continue;
    if (always.has(k) || (!touched.has(k) && isEmpty(state[k]))) out[k] = patch[k];
  }
  return out;
}
