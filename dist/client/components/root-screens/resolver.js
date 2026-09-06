import { redirect, notFound } from 'next/navigation';
import { getSession } from '../../../server';
import { ROOT_SCREEN_REGISTRY } from './registry';
/**
 * The one place the `is_root` gate lives for every ROOT-only administration screen — a screen
 * registered in `registry.ts` never repeats this check itself. Called by the thin `page.tsx` of
 * each catch-all route (`/painel/root/[slug]`, `/painel/security/[slug]`) with the slug from the
 * route and the group that route owns; resolves the slug against `ROOT_SCREEN_REGISTRY`,
 * `notFound()`s on an unknown slug or a slot nobody supplied a component for (Next.js's normal
 * 404, not a 500 — same pattern already used in `panel-shell.tsx`'s `checkPagePermission`).
 */
export async function resolveRootScreen(group, slug, options = {}) {
    const session = await getSession();
    if (!session || !session.is_root) {
        redirect(options.redirectTo ?? '/painel');
    }
    const entry = ROOT_SCREEN_REGISTRY[slug];
    if (!entry || entry.group !== group) {
        notFound();
    }
    const Component = entry.component ?? options.slotComponents?.[slug];
    if (!Component) {
        notFound();
    }
    return { entry, Component };
}
//# sourceMappingURL=resolver.js.map