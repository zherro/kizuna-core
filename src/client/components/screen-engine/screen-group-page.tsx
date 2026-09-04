import { redirect, notFound } from 'next/navigation';
import { getSession } from '../../../server';
import type { ScreenConfig, ScreenContext } from '../../../types/screen';
import { RenderScreen } from './render-screen';

type RouteProps = {
  params?: Promise<Record<string, string> & { slug?: string }>;
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
export function createScreenGroupPage(
  registry: Record<string, ScreenConfig>,
  options: CreateScreenGroupPageOptions = {}
) {
  return async function ScreenGroupPageComponent(routeProps: RouteProps) {
    const session = await getSession();
    const canManageCatalog =
      (session?.tenant_type ?? '').toUpperCase() === 'ADMIN' || !!session?.is_root;

    if (!canManageCatalog) {
      redirect(options.redirectTo ?? '/painel');
    }

    const { slug, ...restParams } = (await routeProps.params) ?? {};
    const config = slug ? registry[slug] : undefined;

    if (!config) {
      notFound();
    }

    const context: ScreenContext = {
      params: restParams,
      searchParams: (await routeProps.searchParams) ?? {},
    };

    return <RenderScreen config={config} context={context} />;
  };
}
