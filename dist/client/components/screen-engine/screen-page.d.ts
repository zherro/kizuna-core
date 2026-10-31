import type { ScreenConfig } from '../../../types/screen';
type RouteProps = {
    params?: Promise<Record<string, string>>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
type CreateScreenPageOptions = {
    /** Where to send a non-admin visitor. Default '/painel'. */
    redirectTo?: string;
};
/**
 * Turns a `ScreenConfig` into a Next.js page component — the one bit of
 * boilerplate a screen genuinely can't shed (App Router routes by file, one
 * `page.tsx` per URL), collapsed down to the two lines every screen repeats
 * today: the admin gate and reading the route's params/searchParams into a
 * `ScreenContext`.
 *
 * All three converted screens use the same gate (`tenant_type === 'ADMIN'`, plus an
 * `is_root` bypass — root's own tenant is `USER`-typed, not `ADMIN`, so without this it
 * gets redirected out of every admin screen) because that's genuinely what they all
 * require today — this is not yet wired to the finer `perms` claim (`AuthUser.hasPerm`,
 * see .claude/auth.md).
 * A screen that needs a specific permission instead of blanket admin access
 * should NOT stretch this helper; write that page by hand until enough
 * screens need it to justify a `requiredPerm` option here.
 *
 * Usage — the entire page.tsx becomes:
 * ```tsx
 * export default createScreenPage(CATEGORIAS_SCREEN);
 * ```
 */
export declare function createScreenPage(config: ScreenConfig, options?: CreateScreenPageOptions): (routeProps: RouteProps) => Promise<import("react/jsx-runtime").JSX.Element>;
export {};
//# sourceMappingURL=screen-page.d.ts.map