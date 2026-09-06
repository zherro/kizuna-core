import { makeSlug, parseActive } from '../utils/resource-utils';
/** "Maria Silva Souza" -> "Maria S." ; "" / null -> "Cliente". */
function maskAuthorName(raw) {
    const name = String(raw ?? '').trim().replace(/\s+/g, ' ');
    if (!name)
        return 'Cliente';
    const [first, second] = name.split(' ');
    return second ? `${first} ${second[0].toUpperCase()}.` : first;
}
function toInt(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
}
function mapTagLinks(record) {
    const links = record.review_tag_links;
    if (!Array.isArray(links))
        return [];
    return links.map((l) => ({
        slug: String(l?.tag_slug_snapshot ?? ''),
        label: String(l?.tag_label_snapshot ?? ''),
    }));
}
const REVIEWS_RESOURCE = {
    schema: 'public',
    table: 'reviews',
    listRequiresAuth: false, // published reviews are public; RLS filters the rest
    returnRepresentation: true,
    select: 'id,uid,domain,reference_id,rating,comment,author_name,status,active,created_at,updated_at,review_tag_links(tag_slug_snapshot,tag_label_snapshot)',
    primaryKey: 'id',
    defaultOrder: 'created_at',
    searchableColumns: ['comment', 'author_name'],
    // No `requiredFields` — it is enforced on PATCH too (postgrest-crud), which would block the
    // author's rating/comment edit. A direct `POST /api/resources/reviews` fails closed anyway:
    // `mapInput` emits neither `domain` nor `reference_id` nor `tenant_id` (all NOT NULL), so the
    // insert is rejected by the DB. Creation MUST go through `fn_review_create` (cross-tenant
    // tenant resolution + owner check).
    // PATCH only — the author edits rating/comment inside the edit window (RLS enforces the
    // window + "not rejected"). Status changes are a moderation action → `fn_review_moderate`,
    // never a PATCH here, so `status` is intentionally absent from mapInput.
    mapInput: (input) => {
        const out = {};
        if (input.rating !== undefined) {
            const r = toInt(input.rating);
            out.rating = r >= 1 && r <= 5 ? r : null;
        }
        if (input.comment !== undefined) {
            out.comment = String(input.comment ?? '').trim() || null;
        }
        return out;
    },
    mapOutput: (record) => ({
        id: String(record.id ?? ''),
        uid: record.uid ?? null,
        domain: String(record.domain ?? ''),
        referenceId: String(record.reference_id ?? ''),
        rating: toInt(record.rating),
        comment: String(record.comment ?? ''),
        tags: mapTagLinks(record),
        authorName: maskAuthorName(record.author_name),
        status: String(record.status ?? 'published'),
        active: parseActive(record.active),
        createdAt: record.created_at ?? record.createdAt,
        updatedAt: record.updated_at ?? record.updatedAt,
    }),
};
const REVIEW_TAGS_RESOURCE = {
    schema: 'public',
    table: 'review_tags',
    listRequiresAuth: false, // the tag catalog is public (active only, per RLS)
    returnRepresentation: true,
    select: 'id,uid,domain,slug,label,sort_order,selectable,active,created_by,created_at,updated_at',
    primaryKey: 'id',
    defaultOrder: 'sort_order',
    searchableColumns: ['label', 'slug'],
    requiredFields: ['label'],
    maxPageSize: 200,
    // No `softDeleteField`: `active` has the wrong polarity for that mechanism (truthy = alive).
    // The admin screen PATCHes `{ active: false }` to discontinue a tag.
    mapInput: (input) => {
        const out = {};
        if (input.label !== undefined)
            out.label = String(input.label ?? '').trim();
        if (input.slug !== undefined || input.label !== undefined) {
            const slugSource = String(input.slug ?? input.label ?? '').trim();
            if (slugSource)
                out.slug = makeSlug(slugSource);
        }
        if (input.domain !== undefined) {
            const d = String(input.domain ?? '').trim();
            out.domain = d || null;
        }
        if (input.sortOrder !== undefined || input.sort_order !== undefined) {
            out.sort_order = toInt(input.sortOrder ?? input.sort_order, 0);
        }
        if (input.selectable !== undefined)
            out.selectable = parseActive(input.selectable);
        if (input.active !== undefined)
            out.active = parseActive(input.active);
        return out;
    },
    mapOutput: (record) => ({
        id: String(record.id ?? ''),
        uid: record.uid ?? null,
        domain: record.domain ?? null,
        slug: String(record.slug ?? ''),
        label: String(record.label ?? ''),
        sortOrder: toInt(record.sort_order ?? record.sortOrder, 0),
        selectable: parseActive(record.selectable),
        active: parseActive(record.active),
        createdBy: record.created_by ?? record.createdBy ?? null,
        createdAt: record.created_at ?? record.createdAt,
        updatedAt: record.updated_at ?? record.updatedAt,
    }),
};
const REVIEW_MODERATION_REQUESTS_RESOURCE = {
    schema: 'public',
    table: 'review_moderation_requests',
    listRequiresAuth: true,
    returnRepresentation: true,
    select: 'id,uid,review_id,tenant_id,requester_user_id,reason,status,moderator_id,moderator_comment,created_at,updated_at,resolved_at',
    primaryKey: 'id',
    defaultOrder: 'created_at',
    searchableColumns: ['reason', 'moderator_comment'],
    // PATCH only: moderator resolves (status + comment) OR requester cancels (status). RLS gates
    // which of those the caller may do.
    mapInput: (input) => {
        const out = {};
        if (input.status !== undefined) {
            const s = String(input.status ?? '').trim().toLowerCase();
            if (['pending', 'approved', 'rejected', 'cancelled'].includes(s))
                out.status = s;
        }
        if (input.moderatorComment !== undefined || input.moderator_comment !== undefined) {
            out.moderator_comment =
                String(input.moderatorComment ?? input.moderator_comment ?? '').trim() || null;
        }
        return out;
    },
    mapOutput: (record) => ({
        id: String(record.id ?? ''),
        uid: record.uid ?? null,
        reviewId: String(record.review_id ?? ''),
        tenantId: record.tenant_id ?? null,
        requesterUserId: record.requester_user_id ?? null,
        reason: String(record.reason ?? ''),
        status: String(record.status ?? 'pending'),
        moderatorId: record.moderator_id ?? null,
        moderatorComment: record.moderator_comment ?? '',
        createdAt: record.created_at ?? record.createdAt,
        updatedAt: record.updated_at ?? record.updatedAt,
        resolvedAt: record.resolved_at ?? null,
    }),
};
const REVIEW_MODERATION_EVENTS_RESOURCE = {
    schema: 'public',
    table: 'review_moderation_events',
    listRequiresAuth: true,
    select: 'id,review_id,actor_user_id,action,from_status,to_status,note,request_id,created_at',
    primaryKey: 'id',
    defaultOrder: 'created_at',
    searchableColumns: [],
    // Append-only audit trail — the route never writes it (only `fn_review_moderate` does).
    mapInput: () => ({}),
    mapOutput: (record) => ({
        id: String(record.id ?? ''),
        reviewId: String(record.review_id ?? ''),
        actorUserId: record.actor_user_id ?? null,
        action: String(record.action ?? ''),
        fromStatus: record.from_status ?? null,
        toStatus: record.to_status ?? null,
        note: record.note ?? '',
        requestId: record.request_id != null ? String(record.request_id) : null,
        createdAt: record.created_at ?? record.createdAt,
    }),
};
const REVIEW_STATS_RESOURCE = {
    schema: 'public',
    table: 'review_stats',
    listRequiresAuth: false,
    select: 'domain,reference_id,tenant_id,total_reviews,average_rating,dist,updated_at',
    // Composite PK `(domain, reference_id)` in the DB. The generic route only uses `primaryKey`
    // for `/:id` (getById/update/delete), which this read-only resource never receives — it is
    // consumed exclusively as `GET list` with `filter.domain` + `filter.reference_id`.
    primaryKey: 'reference_id',
    defaultOrder: 'updated_at',
    searchableColumns: [],
    mapInput: () => ({}),
    mapOutput: (record) => {
        const dist = record.dist && typeof record.dist === 'object' && !Array.isArray(record.dist)
            ? record.dist
            : {};
        return {
            domain: String(record.domain ?? ''),
            referenceId: String(record.reference_id ?? ''),
            totalReviews: toInt(record.total_reviews, 0),
            averageRating: Number(record.average_rating ?? 0),
            dist: {
                '1': toInt(dist['1'], 0),
                '2': toInt(dist['2'], 0),
                '3': toInt(dist['3'], 0),
                '4': toInt(dist['4'], 0),
                '5': toInt(dist['5'], 0),
            },
            updatedAt: record.updated_at ?? record.updatedAt,
        };
    },
};
export const resourceReviews = {
    reviews: REVIEWS_RESOURCE,
    review_tags: REVIEW_TAGS_RESOURCE,
    review_moderation_requests: REVIEW_MODERATION_REQUESTS_RESOURCE,
    review_moderation_events: REVIEW_MODERATION_EVENTS_RESOURCE,
    review_stats: REVIEW_STATS_RESOURCE,
};
//# sourceMappingURL=reviews.js.map