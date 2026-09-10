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
export declare function isOnboardingCompletedServer(): Promise<boolean>;
//# sourceMappingURL=onboarding.d.ts.map