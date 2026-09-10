/**
 * Root screen: lists every row of `auth.plugin_registry` (name, version, installed_at). Generic —
 * reads only a core table, no project-specific data — registered under slug `plugins`, group
 * `root`, in `root-screens/registry.ts`. `auth.plugin_registry` has read open to any session (not
 * sensitive data); the `is_root` gate that decides who reaches this screen lives once in
 * `root-screens/resolver.tsx`, not here.
 */
export declare function PluginsScreen(): Promise<import("react/jsx-runtime").JSX.Element>;
//# sourceMappingURL=plugins-screen.d.ts.map