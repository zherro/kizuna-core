import { getAuthHeaderFromCookies } from './auth';
import { pgrstRpc } from './postrest/conn';
/**
 * Server-side counterpart of `src/lib/client/profile-completion.ts` — same
 * `fn_is_onboarding_completed()` DB function (zero args, already existed in the DB before this
 * gate was built), called directly instead of through `/api/resources/[resource]`.
 *
 * Needed because the client-side gate (`GatedCreateLink` in `list-block.tsx`) only intercepts the
 * "Novo servico" button's click — it never runs for someone who navigates straight to
 * `/painel/meus-servicos/novo` by URL, bookmark, or back/forward. That page is a Server Component,
 * so the actual enforcement has to happen there, server-side, before the wizard ever renders —
 * intercepting a click is a UX nicety, not an access boundary.
 */
export async function isOnboardingCompletedServer() {
    const authHeader = await getAuthHeaderFromCookies();
    // `schema: 'public'` is required, not decorative — PGRST_DB_SCHEMAS is `auth, public` on this
    // deployment, and without an explicit Accept/Content-Profile header PostgREST resolves against
    // the first schema in that list (`auth`), 404ing this function. Confirmed live via curl.
    const response = await pgrstRpc('fn_is_onboarding_completed', {}, { auth: authHeader, schema: 'public' });
    if (!response.ok) {
        // Same fail-open stance as the client check: don't trap someone behind a gate that couldn't
        // be evaluated over a transient RPC/DB error.
        return true;
    }
    const payload = (await response.json().catch(() => null));
    return payload === true;
}
//# sourceMappingURL=onboarding.js.map