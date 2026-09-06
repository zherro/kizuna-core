import type { ScreenConfig } from '../../../types/screen';
type RouteProps = {
    params?: Promise<Record<string, string> & {
        slug?: string;
    }>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
type CreateScreenGroupPageOptions = {
    /** Where to send a non-admin visitor. Default '/painel'. */
    redirectTo?: string;
};
/**
 * `createScreenPage`'s sibling for when several related `ScreenConfig`s belong to the same
 * plugin/feature and don't each deserve their own URL segment — collapses them into one
 * catch-all route (`/painel/<group>/[slug]`) resolved against a `slug -> ScreenConfig` registry,
 * the same shape `root-screens/resolver.tsx` uses for ROOT-only screens (`/painel/root/[slug]`,
 * `/painel/security/[slug]`), gated on `tenant_type === 'ADMIN'` plus an `is_root` bypass
 * (root's own tenant is `USER`-typed, not `ADMIN`, so without this it gets redirected out
 * of every screen in the group) — same idea as ROOT-only screens, just not exclusively
 * `is_root`.
 *
 * Usage — the entire page.tsx becomes:
 * ```tsx
 * export default createScreenGroupPage({ arvore: TAXONOMIA_SCREEN, categorias: CATEGORIAS_SCREEN });
 * ```
 */
export declare function createScreenGroupPage(registry: Record<string, ScreenConfig>, options?: CreateScreenGroupPageOptions): (routeProps: RouteProps) => Promise<import("react/jsx-runtime").JSX.Element>;
export {};
//# sourceMappingURL=screen-group-page.d.ts.map