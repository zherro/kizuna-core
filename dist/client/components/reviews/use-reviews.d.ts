import type { ModerateReviewArgs, ReviewListFilter, ReviewListSort, ReviewStats, ReviewTagOption, ReviewView, SubmitReviewInput } from './types';
export declare function coerceReview(raw: unknown, currentUserId: string | null): ReviewView | null;
export declare function useReviewStats(domain: string, referenceId: string): {
    data: ReviewStats | null;
    loading: boolean;
    error: string;
    reload: () => Promise<void>;
};
type UseReviewListOpts = {
    filter?: ReviewListFilter;
    sort?: ReviewListSort;
    pageSize?: number;
    /** Admin/moderation: don't pin `status=published` (RLS widens the rows). */
    includeAllStatuses?: boolean;
};
export declare function useReviewList(domain: string, referenceId: string, opts?: UseReviewListOpts): {
    items: ReviewView[];
    page: number;
    total: number;
    loading: boolean;
    error: string;
    filter: ReviewListFilter;
    sort: ReviewListSort;
    setPage: (next: number) => void;
    setFilter: (next: ReviewListFilter) => void;
    setSort: import("react").Dispatch<import("react").SetStateAction<ReviewListSort>>;
    reload: () => Promise<void>;
};
export declare function useReviewTags(domain?: string): {
    tags: ReviewTagOption[];
    loading: boolean;
};
export declare function useMyReview(domain: string, referenceId: string): {
    review: ReviewView | null;
    loading: boolean;
    reload: () => Promise<void>;
};
export declare function submitReview(input: SubmitReviewInput): Promise<ReviewView>;
export declare function requestModeration(reviewId: string, reason: string): Promise<void>;
export declare function moderateReview(args: ModerateReviewArgs): Promise<ReviewView>;
export {};
//# sourceMappingURL=use-reviews.d.ts.map