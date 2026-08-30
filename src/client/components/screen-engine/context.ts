import type { ScreenContext } from '../../../types/screen';

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
export function resolveContextRefs<T>(value: T, context: ScreenContext): T {
  if (typeof value === 'string') {
    const match = CONTEXT_REF.exec(value);
    if (!match) return value;

    const [, bucket, key] = match;
    const source =
      bucket === 'params'
        ? context.params
        : bucket === 'searchParams'
          ? context.searchParams
          : (context.session ?? {});
    return source[key] as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveContextRefs(item, context)) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, item]) => [key, resolveContextRefs(item, context)] as const
    );
    return Object.fromEntries(entries) as T;
  }

  return value;
}
