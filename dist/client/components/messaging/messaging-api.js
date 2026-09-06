async function json(res) {
    const body = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(body.message || 'Erro na requisição.');
    return body;
}
export const fetchConfig = () => fetch('/api/chat/config').then((r) => json(r));
export const fetchConversations = (before) => fetch(`/api/chat/conversations${before ? `?before=${encodeURIComponent(before)}` : ''}`).then((r) => json(r));
export const fetchMessages = (uid, p) => {
    const qs = new URLSearchParams();
    if (p.limit)
        qs.set('limit', String(p.limit));
    if (p.before)
        qs.set('before', String(p.before));
    if (p.after != null)
        qs.set('after', String(p.after));
    return fetch(`/api/chat/conversations/${uid}/messages?${qs}`).then((r) => json(r));
};
export const postMessage = (uid, body) => fetch(`/api/chat/conversations/${uid}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
}).then((r) => json(r));
export const patchRead = (uid, upToMessageId) => fetch(`/api/chat/conversations/${uid}/read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upToMessageId }),
});
//# sourceMappingURL=messaging-api.js.map