import { type ReactNode } from 'react';
import type { ReviewListFilter, ReviewListSort, ReviewView } from './types';
type ReviewListProps = {
    domain: string;
    referenceId: string;
    filter?: ReviewListFilter;
    sort?: ReviewListSort;
    pageSize?: number;
    /** Admin/moderation views pass this to drop the `status=published` pin. */
    includeAllStatuses?: boolean;
    renderItemActions?: (review: ReviewView) => ReactNode;
    className?: string;
};
export declare function ReviewList({ domain, referenceId, filter, sort, pageSize, includeAllStatuses, renderItemActions, className, }: Readonly<ReviewListProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=review-list.d.ts.map