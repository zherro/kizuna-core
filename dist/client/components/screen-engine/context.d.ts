import type { ScreenContext } from '../../../types/screen';
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
export declare function resolveContextRefs<T>(value: T, context: ScreenContext): T;
//# sourceMappingURL=context.d.ts.map