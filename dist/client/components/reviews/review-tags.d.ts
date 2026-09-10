import type { ReviewTagOption, ReviewTagRef } from './types';
type AnyTag = ReviewTagOption | ReviewTagRef;
type ReviewTagsProps = {
    tags: AnyTag[];
    /** Selected slugs (selection mode). */
    selected?: string[];
    onToggle?: (slug: string) => void;
    readOnly?: boolean;
};
/**
 * Wrapping chip list. Two modes:
 *  - selection (`onToggle` + `selected`) — used inside `ReviewModal`;
 *  - display (`readOnly`) — used inside `ReviewCard`.
 * Colored state uses `bg-*`/`text-*` (border-color utilities are dead here).
 */
export declare function ReviewTags({ tags, selected, onToggle, readOnly, }: Readonly<ReviewTagsProps>): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=review-tags.d.ts.map