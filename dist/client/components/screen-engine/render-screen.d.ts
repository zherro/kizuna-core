import type { ScreenConfig, ScreenContext } from '../../../types/screen';
/**
 * Resolves a `ScreenConfig` (a plain, JSON-serializable block list) against
 * the component registry and renders it. Server Component by default —
 * every block that IS server-safe (see registry.ts) streams as real HTML;
 * a block that isn't (declares 'use client') still renders fine as this
 * Server Component's child, Next.js does that natively. No block here ever
 * decides business logic — it only lays the page out.
 *
 * `context` (route params / searchParams) is optional — most screens don't
 * need it. When passed, any `"$params.x"` / `"$searchParams.x"` string
 * inside a block's `props` is resolved against it first — see
 * `resolveContextRefs` in `context.ts`.
 */
export declare function RenderScreen({ config, context, }: {
    config: ScreenConfig;
    context?: ScreenContext;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=render-screen.d.ts.map