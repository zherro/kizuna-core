import type { ComponentType } from 'react';
export type RegistryEntry = {
    /** Heterogeneous registry: each entry has its own prop type, resolved dynamically from screen-config JSON, not statically. */
    component: ComponentType<any>;
    /** True when the component has no 'use client' directive and can render on the server. */
    serverSafe: boolean;
};
/**
 * Every component a screen config can reference by name. Adding a screen
 * never means writing a one-off page component — it means either reusing a
 * block already here, or registering a new one once so every future screen
 * can reuse it too.
 *
 * `serverSafe` is metadata for humans/AI composing a screen, not something
 * this file enforces — Next.js already lets a Server Component
 * (`render-screen.tsx`) render a Client Component as a child natively, so a
 * `serverSafe: false` entry works here too. It's there so a screen author
 * knows which blocks stream real HTML immediately (`page-header`) and which
 * ones wait for hydration (`resource-screen`, `taxonomy-manager`).
 */
export declare const SCREEN_COMPONENT_REGISTRY: Record<string, RegistryEntry>;
//# sourceMappingURL=registry.d.ts.map