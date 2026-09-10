/**
 * Port of the external template's `slugify()` (NFD strip, lowercase, non-alphanumeric ->
 * single dash, trim dashes). Produces a value matching the `pages.slug` CHECK
 * (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).
 *
 * Kept local to the pages plugin rather than reusing `components/taxonomy`'s private copy —
 * this plugin should not depend on the taxonomy one.
 */
export declare function slugify(input: string): string;
//# sourceMappingURL=slugify.d.ts.map