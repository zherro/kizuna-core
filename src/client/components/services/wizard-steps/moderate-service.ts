'use client';

/**
 * Client helper for the `fn_service_moderate` RPC. Mirrors the app's existing RPC-from-client
 * pattern (see foco-total `src/client/components/reviews/use-reviews.ts` `moderateReview`, and
 * `src/client/components/rbac/rbac-rpc.ts` `callRbacRpc`): a `POST /api/postgrest/rpc` with
 * `{ schema, functionName, params }`, params keyed `p_*`.
 *
 * The consuming app must allow-list `fn_service_moderate` in its `postgrestRpcs` registry
 * (foco-total: `src/lib/server/resources/index.ts`) — same as `fn_review_moderate`.
 *
 * `fn_service_moderate` inserts the `service_moderations` row and derives `services.status`
 * atomically, so there is no follow-up write from the client.
 */
export type ModerateServiceArgs = {
  serviceId: string | number;
  decision: string;
  note?: string;
  rejectionReason?: string;
};

export async function moderateService(args: ModerateServiceArgs): Promise<void> {
  const res = await fetch('/api/postgrest/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schema: 'public',
      functionName: 'fn_service_moderate',
      params: {
        p_service_id: Number(args.serviceId),
        p_decision: args.decision,
        p_note: args.note?.trim() ? args.note.trim() : null,
        p_rejection_reason:
          args.decision === 'rejected' && args.rejectionReason ? args.rejectionReason : null,
      },
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || 'Não foi possível registrar a decisão da revisão.');
  }
}
