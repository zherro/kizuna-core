/**
 * Admin master/detail manager for the `pages` plugin table. Migrated from the external template's
 * `admin.paginas.tsx` (which was localStorage-backed) to talk to `/api/resources/pages`:
 *
 * - list via `useTable` (resource `pages`, ordered by title)
 * - create via `POST /api/resources/pages`
 * - edit via `PATCH /api/resources/pages/:id`
 * - "delete" is a soft delete — `PATCH { active: false }`
 * - slug auto-derives from the title (`slugify`) until the user unlocks the field
 * - status toggle draft <-> published
 *
 * After any mutation it best-effort pings `/api/pages/revalidate` so the consuming app can drop
 * the cached `/[slug]` route (foco-total ships that route; the call is swallowed if absent).
 *
 * `reservedSlugs` — the consuming app's own top-level route names, rejected in the create/edit
 * form on top of the framework defaults.
 */
export declare function PagesAdmin({ reservedSlugs }: {
    reservedSlugs?: string[];
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=PagesAdmin.d.ts.map