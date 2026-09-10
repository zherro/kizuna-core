// Reviews plugin — generic client components + data hooks.
// TODO(track-e): re-export the types below from the @kizuna/core/types barrel + STATUS.md.

export { RatingInput } from './rating-input';
export { RatingDisplay } from './rating-display';
export { ReviewTags } from './review-tags';
export { ReviewSummary } from './review-summary';
export { ReviewCard } from './review-card';
export { ReviewList } from './review-list';
export { ReviewModal } from './review-modal';
export { ReviewModerationRequestModal } from './review-moderation-request-modal';
export { ReviewModerationTable } from './review-moderation-table';

export {
  useReviewStats,
  useReviewList,
  useReviewTags,
  useMyReview,
  submitReview,
  requestModeration,
  moderateReview,
  coerceReview,
} from './use-reviews';

export type {
  ReviewStatus,
  ModerationAction,
  ReviewTagRef,
  ReviewView,
  ReviewStats,
  ReviewTagOption,
  ReviewModerationEvent,
  ReviewListFilter,
  ReviewListSort,
  SubmitReviewInput,
  ModerateReviewArgs,
  ReviewModerationTableConfig,
} from './types';
