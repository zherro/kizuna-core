import type { ReviewView } from './types';
type ReviewModalProps = {
    open: boolean;
    onClose: () => void;
    domain: string;
    /** = referenceId of the rated entity. Comes from props, never a form field. */
    serviceId: string;
    /** Author id — informational only; the server derives it from the JWT. */
    customerId: string;
    existingReview?: ReviewView | null;
    onSubmitted?: (review: ReviewView) => void;
};
export declare function ReviewModal({ open, onClose, domain, serviceId, customerId, existingReview, onSubmitted, }: Readonly<ReviewModalProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=review-modal.d.ts.map