type ReviewModerationRequestModalProps = {
    open: boolean;
    onClose: () => void;
    reviewId: string;
    onSubmitted?: () => void;
};
/**
 * Owner-only "ask for a re-review" flow. Sends `fn_review_moderation_request`;
 * a 403 (not the owner) surfaces as an inline message from the hook.
 */
export declare function ReviewModerationRequestModal({ open, onClose, reviewId, onSubmitted, }: Readonly<ReviewModerationRequestModalProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=review-moderation-request-modal.d.ts.map