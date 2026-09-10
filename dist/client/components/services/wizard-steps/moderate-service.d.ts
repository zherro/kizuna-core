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
export declare function moderateService(args: ModerateServiceArgs): Promise<void>;
//# sourceMappingURL=moderate-service.d.ts.map