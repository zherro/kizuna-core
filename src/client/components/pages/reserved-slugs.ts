/**
 * Framework-level reserved slugs — names the pages plugin must never let a DB-backed `/[slug]`
 * page shadow, regardless of the consuming app. The consuming app extends this with its own
 * top-level route segment names (see foco-total `src/app/[slug]/page.tsx`).
 */
export const DEFAULT_RESERVED_SLUGS: string[] = ['api', 'login', 'logout', 'register'];

/**
 * True when `slug` collides with a framework reserved name or one of the app-supplied `extra`
 * names. Case-insensitive; trims surrounding whitespace.
 */
export function isReservedSlug(slug: string, extra: string[] = []): boolean {
  const normalized = String(slug ?? '').trim().toLowerCase();
  if (!normalized) return true;
  const all = new Set([...DEFAULT_RESERVED_SLUGS, ...extra].map((s) => s.toLowerCase()));
  return all.has(normalized);
}
