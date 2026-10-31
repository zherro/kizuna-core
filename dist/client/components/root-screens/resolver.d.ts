import type { ComponentType } from 'react';
import { type RootScreenGroup } from './registry';
type ResolveRootScreenOptions = {
    /** Where to send a non-root visitor. Default '/painel'. */
    redirectTo?: string;
    /**
     * Components for "slot" slugs (registry entries with `component: null`) — the consuming
     * project's own component, keyed by slug. See `registry.ts`'s `RootScreenEntry.component` doc.
     */
    slotComponents?: Record<string, ComponentType<any>>;
};
/**
 * The one place the `is_root` gate lives for every ROOT-only administration screen — a screen
 * registered in `registry.ts` never repeats this check itself. Called by the thin `page.tsx` of
 * each catch-all route (`/painel/root/[slug]`, `/painel/security/[slug]`) with the slug from the
 * route and the group that route owns; resolves the slug against `ROOT_SCREEN_REGISTRY`,
 * `notFound()`s on an unknown slug or a slot nobody supplied a component for (Next.js's normal
 * 404, not a 500 — same pattern already used in `panel-shell.tsx`'s `checkPagePermission`).
 */
export declare function resolveRootScreen(group: RootScreenGroup, slug: string, options?: ResolveRootScreenOptions): Promise<{
    entry: import("./registry").RootScreenEntry;
    Component: ComponentType<any> | undefined;
}>;
export {};
//# sourceMappingURL=resolver.d.ts.map