const CONTEXT_REF = /^\$(params|searchParams|session)\.(.+)$/;
/**
 * Resolves `"$params.xxx"` / `"$searchParams.xxx"` / `"$session.xxx"` string
 * references inside a block's `props` against the request's `ScreenContext`,
 * recursively through arrays/objects. Every other value passes through
 * unchanged.
 *
 * This is the ONLY way a screen config reaches a live request value — it is
 * still plain data in, plain data out. A missing key resolves to `undefined`
 * (the prop is simply not set), never throws: a screen with an optional
 * `?status=` filter — or a `$session.xxx` ref on a page that didn't pass a
 * `session` context — shouldn't 500 just because nobody passed it.
 */
export function resolveContextRefs(value, context) {
    if (typeof value === 'string') {
        const match = CONTEXT_REF.exec(value);
        if (!match)
            return value;
        const [, bucket, key] = match;
        const source = bucket === 'params'
            ? context.params
            : bucket === 'searchParams'
                ? context.searchParams
                : (context.session ?? {});
        return source[key];
    }
    if (Array.isArray(value)) {
        return value.map((item) => resolveContextRefs(item, context));
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value).map(([key, item]) => [key, resolveContextRefs(item, context)]);
        return Object.fromEntries(entries);
    }
    return value;
}
//# sourceMappingURL=context.js.map