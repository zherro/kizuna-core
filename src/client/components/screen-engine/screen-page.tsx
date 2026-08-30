import { redirect } from 'next/navigation';
import { getSession } from '../../../server';
import type { ScreenConfig, ScreenContext } from '../../../types/screen';
import { RenderScreen } from './render-screen';

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
 * All three converted screens use the same gate (`tenant_type === 'ADMIN'`)
 * because that's genuinely what they all require today — this is not yet
 * wired to the finer `perms` claim (`AuthUser.hasPerm`, see .claude/auth.md).
 * A screen that needs a specific permission instead of blanket admin access
 * should NOT stretch this helper; write that page by hand until enough
 * screens need it to justify a `requiredPerm` option here.
 *
 * Usage — the entire page.tsx becomes:
 * ```tsx
 * export default createScreenPage(CATEGORIAS_SCREEN);
 * ```
 */
export function createScreenPage(config: ScreenConfig, options: CreateScreenPageOptions = {}) {
  return async function ScreenPageComponent(routeProps: RouteProps) {
    const session = await getSession();
    const canManageCatalog = (session?.tenant_type ?? '').toUpperCase() === 'ADMIN';

    if (!canManageCatalog) {
      redirect(options.redirectTo ?? '/painel');
    }

    const context: ScreenContext = {
      params: (await routeProps.params) ?? {},
      searchParams: (await routeProps.searchParams) ?? {},
    };

    return <RenderScreen config={config} context={context} />;
  };
}
