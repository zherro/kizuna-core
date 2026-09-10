import type { ComponentType } from 'react';
export type RootScreenGroup = 'root' | 'security';
export type RootScreenEntry = {
    title: string;
    group: RootScreenGroup;
    /**
     * `null` marks a "slot": this slug is a registered, navigable ROOT screen, but its component is
     * project-specific and never lives in the core (e.g. `configuracoes` — the actual config keys
     * edited are business config of the consuming app, not core mechanism). The consuming project's
     * `page.tsx` supplies the component for a slot slug via `resolveRootScreen`'s `slotComponents`
     * argument; a slot with no component supplied resolves to `notFound()` same as an unknown slug.
     */
    component: ComponentType<any> | null;
};
/**
 * Every ROOT-only administration screen a project can route to via the catch-all routes
 * `/painel/root/[slug]` (group `root`) and `/painel/security/[slug]` (group `security`) — see
 * `resolver.tsx`. Adding a screen here never means writing a new `page.tsx` by hand in a
 * consuming project: the catch-all route already resolves any slug registered here (or, for a
 * slot, any slug the project itself supplies a component for).
 */
export declare const ROOT_SCREEN_REGISTRY: Record<string, RootScreenEntry>;
//# sourceMappingURL=registry.d.ts.map