function isEmpty(v) {
    return v === '' || v === null || v === undefined || v === 0 ||
        (Array.isArray(v) && v.length === 0);
}
export function applyAssistPatch(patch, state, touched, opts) {
    const always = new Set(opts?.always ?? []);
    const out = {};
    for (const k of Object.keys(patch)) {
        if (patch[k] === undefined)
            continue;
        if (always.has(k) || (!touched.has(k) && isEmpty(state[k])))
            out[k] = patch[k];
    }
    return out;
}
//# sourceMappingURL=apply-assist-patch.js.map