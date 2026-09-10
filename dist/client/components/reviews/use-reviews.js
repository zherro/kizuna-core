'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../providers/auth-provider';
/**
 * Thin data hooks over the generic resource route (`/api/resources/*`) for the
 * reviews plugin. Writes go through the 3 RPCs exposed as resource keys
 * (`fn_review_create`, `fn_review_moderation_request`, `fn_review_moderate`).
 *
 * `isMine` is computed here (never emitted by the server `mapOutput`): the hooks
 * read the current user id from `useAuth()` and compare it against whatever
 * identity hint the row carries (`isMine` / `id_customer` / `idCustomer`), or —
 * for `useMyReview` — every returned row is mine by construction (filtered by
 * `id_customer=$session`).
 */
const RESOURCE_BASE = '/api/resources';
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
function pick(r, camel, snake, fallback) {
    const v = r[camel] ?? r[snake];
    return (v === undefined || v === null ? fallback : v);
}
function coerceTags(raw) {
    return asArray(raw)
        .map((entry) => {
        if (!entry || typeof entry !== 'object')
            return null;
        const e = entry;
        const slug = String(e.slug ?? e.tag_slug_snapshot ?? e.tagSlugSnapshot ?? '');
        const label = String(e.label ?? e.tag_label_snapshot ?? e.tagLabelSnapshot ?? slug);
        if (!slug)
            return null;
        return { slug, label };
    })
        .filter((t) => t !== null);
}
export function coerceReview(raw, currentUserId) {
    const record = (Array.isArray(raw) ? raw[0] : raw);
    if (!record || typeof record !== 'object')
        return null;
    const ownerId = String(record.idCustomer ?? record.id_customer ?? record.authorId ?? record.author_id ?? '');
    const explicitMine = record.isMine ?? record.is_mine;
    const isMine = typeof explicitMine === 'boolean'
        ? explicitMine
        : Boolean(currentUserId && ownerId && ownerId === currentUserId);
    return {
        id: String(pick(record, 'id', 'id', '')),
        domain: String(pick(record, 'domain', 'domain', '')),
        referenceId: String(pick(record, 'referenceId', 'reference_id', '')),
        rating: Number(pick(record, 'rating', 'rating', 0)),
        comment: String(pick(record, 'comment', 'comment', '') ?? ''),
        tags: coerceTags(record.tags ?? record.reviewTags ?? record.review_tag_links),
        authorName: String(pick(record, 'authorName', 'author_name', '') ?? ''),
        createdAt: String(pick(record, 'createdAt', 'created_at', '')),
        status: pick(record, 'status', 'status', 'published') ?? 'published',
        isMine,
    };
}
function coerceStats(raw) {
    const record = (Array.isArray(raw) ? raw[0] : raw);
    if (!record || typeof record !== 'object')
        return null;
    const distRaw = (pick(record, 'dist', 'dist', {}) ?? {});
    const dist = {
        '1': Number(distRaw['1'] ?? 0),
        '2': Number(distRaw['2'] ?? 0),
        '3': Number(distRaw['3'] ?? 0),
        '4': Number(distRaw['4'] ?? 0),
        '5': Number(distRaw['5'] ?? 0),
    };
    return {
        domain: String(pick(record, 'domain', 'domain', '')),
        referenceId: String(pick(record, 'referenceId', 'reference_id', '')),
        totalReviews: Number(pick(record, 'totalReviews', 'total_reviews', 0)),
        averageRating: Number(pick(record, 'averageRating', 'average_rating', 0)),
        dist,
    };
}
function coerceTagOption(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const r = raw;
    return {
        id: String(pick(r, 'id', 'id', '')),
        slug: String(pick(r, 'slug', 'slug', '')),
        label: String(pick(r, 'label', 'label', '')),
        domain: pick(r, 'domain', 'domain', null) ?? null,
        sortOrder: Number(pick(r, 'sortOrder', 'sort_order', 0)),
        selectable: Boolean(pick(r, 'selectable', 'selectable', true)),
        active: Boolean(pick(r, 'active', 'active', true)),
    };
}
async function readJson(response) {
    const body = (await response.json().catch(() => null));
    return { ok: response.ok, body };
}
function messageFrom(body, fallback) {
    const m = body?.message;
    return typeof m === 'string' && m ? m : fallback;
}
// ---------------------------------------------------------------------------
// useReviewStats — ONLY hits /api/resources/review_stats
// ---------------------------------------------------------------------------
export function useReviewStats(domain, referenceId) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const activeRef = useRef(true);
    const enabled = Boolean(domain) && Boolean(referenceId);
    const reload = useCallback(async () => {
        if (!enabled) {
            setData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const query = new URLSearchParams({
                page: '1',
                pageSize: '1',
                'filter.domain': domain,
                'filter.reference_id': referenceId,
            });
            const res = await fetch(`${RESOURCE_BASE}/review_stats?${query.toString()}`, {
                cache: 'no-store',
            });
            const { ok, body } = await readJson(res);
            if (!activeRef.current)
                return;
            if (!ok) {
                setError(messageFrom(body, 'Não foi possível carregar o resumo das avaliações.'));
                return;
            }
            const first = asArray(body?.items)[0] ?? null;
            setData(first ? coerceStats(first) : null);
        }
        catch {
            if (activeRef.current)
                setError('Erro de conexão ao carregar o resumo.');
        }
        finally {
            if (activeRef.current)
                setLoading(false);
        }
    }, [enabled, domain, referenceId]);
    useEffect(() => {
        activeRef.current = true;
        void reload();
        return () => {
            activeRef.current = false;
        };
    }, [reload]);
    // `reload` is additive to the frozen `{ data, loading, error }` contract (retry in §13).
    return { data, loading, error, reload };
}
export function useReviewList(domain, referenceId, opts = {}) {
    const { pageSize = 10, includeAllStatuses = false } = opts;
    const { user } = useAuth();
    const currentUserId = user?.user_id ?? null;
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilterState] = useState(opts.filter ?? 'all');
    const [sort, setSort] = useState(opts.sort ?? 'recent');
    const activeRef = useRef(true);
    const enabled = Boolean(domain) && Boolean(referenceId);
    const load = useCallback(async (targetPage) => {
        if (!enabled) {
            setItems([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const query = new URLSearchParams({
                page: String(targetPage),
                pageSize: String(pageSize),
                orderBy: 'created_at',
                orderDirection: sort === 'oldest' ? 'asc' : 'desc',
                'filter.domain': domain,
                'filter.reference_id': referenceId,
            });
            if (!includeAllStatuses)
                query.set('filter.status', 'published');
            if (filter !== 'all')
                query.set('filter.rating', filter);
            const res = await fetch(`${RESOURCE_BASE}/reviews?${query.toString()}`, {
                cache: 'no-store',
            });
            const { ok, body } = await readJson(res);
            if (!activeRef.current)
                return;
            if (!ok) {
                setError(messageFrom(body, 'Não foi possível carregar as avaliações.'));
                return;
            }
            const rows = asArray(body?.items)
                .map((row) => coerceReview(row, currentUserId))
                .filter((r) => r !== null);
            setItems(rows);
            setPage(typeof body?.page === 'number' ? body.page : targetPage);
            const rawTotal = typeof body?.total === 'number' ? body.total : rows.length;
            setTotal(Math.max(rawTotal, rows.length));
        }
        catch {
            if (activeRef.current)
                setError('Erro de conexão ao carregar as avaliações.');
        }
        finally {
            if (activeRef.current)
                setLoading(false);
        }
    }, [enabled, domain, referenceId, pageSize, filter, sort, includeAllStatuses, currentUserId]);
    useEffect(() => {
        activeRef.current = true;
        void load(1);
        return () => {
            activeRef.current = false;
        };
    }, [load]);
    const setFilter = useCallback((next) => {
        setFilterState(next);
        setPage(1);
    }, []);
    const goToPage = useCallback((next) => {
        void load(next);
    }, [load]);
    return {
        items,
        page,
        total,
        loading,
        error,
        filter,
        sort,
        setPage: goToPage,
        setFilter,
        setSort,
        reload: () => load(page),
    };
}
// ---------------------------------------------------------------------------
// useReviewTags
// ---------------------------------------------------------------------------
export function useReviewTags(domain) {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const activeRef = useRef(true);
    useEffect(() => {
        activeRef.current = true;
        (async () => {
            setLoading(true);
            try {
                const query = new URLSearchParams({
                    page: '1',
                    pageSize: '200',
                    orderBy: 'sort_order',
                    orderDirection: 'asc',
                    'filter.active': 'true',
                });
                const res = await fetch(`${RESOURCE_BASE}/review_tags?${query.toString()}`, {
                    cache: 'no-store',
                });
                const { ok, body } = await readJson(res);
                if (!activeRef.current)
                    return;
                if (!ok) {
                    setTags([]);
                    return;
                }
                const all = asArray(body?.items)
                    .map(coerceTagOption)
                    .filter((t) => t !== null);
                const scoped = domain ? all.filter((t) => t.domain === null || t.domain === domain) : all;
                setTags(scoped);
            }
            catch {
                if (activeRef.current)
                    setTags([]);
            }
            finally {
                if (activeRef.current)
                    setLoading(false);
            }
        })();
        return () => {
            activeRef.current = false;
        };
    }, [domain]);
    return { tags, loading };
}
// ---------------------------------------------------------------------------
// useMyReview
// ---------------------------------------------------------------------------
export function useMyReview(domain, referenceId) {
    const { user } = useAuth();
    const currentUserId = user?.user_id ?? null;
    const [review, setReview] = useState(null);
    const [loading, setLoading] = useState(true);
    const activeRef = useRef(true);
    const reload = useCallback(async () => {
        if (!currentUserId || !domain || !referenceId) {
            setReview(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: '1',
                pageSize: '1',
                'filter.domain': domain,
                'filter.reference_id': referenceId,
                'filter.id_customer': currentUserId,
            });
            const res = await fetch(`${RESOURCE_BASE}/reviews?${query.toString()}`, {
                cache: 'no-store',
            });
            const { ok, body } = await readJson(res);
            if (!activeRef.current)
                return;
            if (!ok) {
                setReview(null);
                return;
            }
            const first = asArray(body?.items)[0] ?? null;
            const parsed = first ? coerceReview(first, currentUserId) : null;
            // Filtered by id_customer=$session → every returned row is mine.
            setReview(parsed ? { ...parsed, isMine: true } : null);
        }
        catch {
            if (activeRef.current)
                setReview(null);
        }
        finally {
            if (activeRef.current)
                setLoading(false);
        }
    }, [currentUserId, domain, referenceId]);
    useEffect(() => {
        activeRef.current = true;
        void reload();
        return () => {
            activeRef.current = false;
        };
    }, [reload]);
    return { review, loading, reload };
}
// ---------------------------------------------------------------------------
// Imperative writes (RPC-backed)
// ---------------------------------------------------------------------------
function unwrapRow(body) {
    if (!body)
        return null;
    return body.item ?? body.data ?? body.payload ?? body.result ?? body;
}
export async function submitReview(input) {
    const comment = input.comment?.trim() ? input.comment.trim() : null;
    if (input.existingReviewId) {
        const res = await fetch(`${RESOURCE_BASE}/reviews/${input.existingReviewId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: input.rating, comment }),
        });
        const { ok, body } = await readJson(res);
        if (!ok)
            throw new Error(messageFrom(body, 'Não foi possível atualizar sua avaliação.'));
        const parsed = coerceReview(unwrapRow(body), null);
        if (!parsed)
            throw new Error('Resposta inválida ao atualizar a avaliação.');
        return { ...parsed, isMine: true };
    }
    const res = await fetch(`${RESOURCE_BASE}/fn_review_create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            p_domain: input.domain,
            p_reference_id: input.referenceId,
            p_rating: input.rating,
            p_comment: comment,
            p_tag_ids: (input.tagIds ?? []).map((id) => Number(id)).filter((n) => Number.isFinite(n)),
        }),
    });
    const { ok, body } = await readJson(res);
    if (!ok)
        throw new Error(messageFrom(body, 'Não foi possível enviar sua avaliação.'));
    const parsed = coerceReview(unwrapRow(body), null);
    if (!parsed)
        throw new Error('Resposta inválida ao criar a avaliação.');
    return { ...parsed, isMine: true };
}
export async function requestModeration(reviewId, reason) {
    const res = await fetch(`${RESOURCE_BASE}/fn_review_moderation_request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_review_id: Number(reviewId), p_reason: reason.trim() }),
    });
    if (!res.ok) {
        const { body } = await readJson(res);
        const fallback = res.status === 403
            ? 'Apenas o dono do anúncio pode solicitar revisão.'
            : 'Não foi possível enviar a solicitação de revisão.';
        throw new Error(messageFrom(body, fallback));
    }
}
export async function moderateReview(args) {
    const res = await fetch(`${RESOURCE_BASE}/fn_review_moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            p_review_id: Number(args.reviewId),
            p_to_status: args.toStatus,
            p_note: args.note?.trim() ? args.note.trim() : null,
            p_soft_delete: args.softDelete ?? null,
            p_request_id: args.requestId ? Number(args.requestId) : null,
        }),
    });
    const { ok, body } = await readJson(res);
    if (!ok)
        throw new Error(messageFrom(body, 'Não foi possível moderar a avaliação.'));
    const parsed = coerceReview(unwrapRow(body), null);
    if (!parsed)
        throw new Error('Resposta inválida ao moderar a avaliação.');
    return parsed;
}
//# sourceMappingURL=use-reviews.js.map