import { type ReactNode } from 'react';
import type { ReviewView } from './types';
type ReviewCardProps = {
    review: ReviewView;
    canRequestModeration?: boolean;
    onRequestModeration?: (review: ReviewView) => void;
    /** Reserved: lets a caller override the mine-check done in the hook layer. */
    currentUserId?: string | null;
    actions?: ReactNode;
    className?: string;
};
export declare function ReviewCard({ review, canRequestModeration, onRequestModeration, currentUserId, actions, className, }: Readonly<ReviewCardProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=review-card.d.ts.map