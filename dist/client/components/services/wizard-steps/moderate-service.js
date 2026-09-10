'use client';
export async function moderateService(args) {
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
                p_rejection_reason: args.decision === 'rejected' && args.rejectionReason ? args.rejectionReason : null,
            },
        }),
    });
    if (!res.ok) {
        const body = (await res.json().catch(() => null));
        throw new Error(body?.message || 'Não foi possível registrar a decisão da revisão.');
    }
}
//# sourceMappingURL=moderate-service.js.map