type ReviewSummaryProps = {
    domain: string;
    referenceId: string;
    variant?: 'compact' | 'full';
    className?: string;
};
/**
 * Aggregate rating widget. **Only** reads `/api/resources/review_stats` — never
 * `/reviews` (see `useReviewStats`). Renders the empty state as a neutral "no
 * reviews yet" line rather than an error.
 */
export declare function ReviewSummary({ domain, referenceId, variant, className, }: Readonly<ReviewSummaryProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=review-summary.d.ts.map