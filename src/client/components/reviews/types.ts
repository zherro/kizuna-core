// Shared types for the reviews plugin UI.
// TODO(track-e): re-export from @kizuna/core/types barrel + STATUS.md
// (Track C cannot edit STATUS.md / src/types/index.ts — types live here and are
//  re-exported from ./index.ts for now.)

export type ReviewStatus = 'pending' | 'published' | 'hidden' | 'rejected';

export type ModerationAction =
  | 'published'
  | 'hidden'
  | 'rejected'
  | 'reopened'
  | 'removed'
  | 'request_reviewed';

export type ReviewTagRef = { slug: string; label: string };

/** Public shape of a review row — never carries `id_customer` / `tenant_id` (privacy §12). */
export type ReviewView = {
  id: string;
  domain: string;
  referenceId: string;
  rating: number;
  comment: string;
  tags: ReviewTagRef[];
  authorName: string;
  createdAt: string;
  status: ReviewStatus;
  /** Computed in the hook layer from `useAuth()` — see `use-reviews.ts`. */
  isMine: boolean;
};

/** O(1) aggregate row from `review_stats` — the only source of totals/average. */
export type ReviewStats = {
  domain: string;
  referenceId: string;
  totalReviews: number;
  averageRating: number;
  dist: Record<'1' | '2' | '3' | '4' | '5', number>;
};

export type ReviewTagOption = {
  id: string;
  slug: string;
  label: string;
  domain: string | null;
  sortOrder: number;
  selectable: boolean;
  active: boolean;
};

export type ReviewModerationEvent = {
  id: string;
  reviewId: string;
  actorUserId: string;
  action: string;
  fromStatus: ReviewStatus | null;
  toStatus: ReviewStatus | null;
  note: string | null;
  requestId: string | null;
  createdAt: string;
};

export type ReviewListFilter = 'all' | '5' | '4' | '3' | '2' | '1';
export type ReviewListSort = 'recent' | 'oldest';

export type SubmitReviewInput = {
  domain: string;
  referenceId: string;
  rating: number;
  comment?: string;
  tagIds?: string[];
  /** When present, edits an existing review via PATCH instead of `fn_review_create`. */
  existingReviewId?: string;
};

export type ModerateReviewArgs = {
  reviewId: string;
  toStatus: ReviewStatus;
  note?: string;
  softDelete?: boolean;
  requestId?: string;
};

/** Serializable config for the `review-moderation` screen-engine block. */
export type ReviewModerationTableConfig = {
  /** Base href for the "Analisar" row action — `${hrefBase}/${id}`. */
  hrefBase?: string;
  title?: string;
  domain?: string;
  pageSize?: number;
};
