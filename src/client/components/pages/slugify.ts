/**
 * Port of the external template's `slugify()` (NFD strip, lowercase, non-alphanumeric ->
 * single dash, trim dashes). Produces a value matching the `pages.slug` CHECK
 * (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).
 *
 * Kept local to the pages plugin rather than reusing `components/taxonomy`'s private copy —
 * this plugin should not depend on the taxonomy one.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
