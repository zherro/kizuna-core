'use client';

import { cn } from '../../../lib/utils';
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
export function ReviewTags({ tags, selected = [], onToggle, readOnly = false }: Readonly<ReviewTagsProps>) {
  if (!tags.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isSelected = selected.includes(tag.slug);
        const base =
          'inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors';

        if (readOnly || !onToggle) {
          return (
            <span
              key={tag.slug}
              className={cn(base, 'bg-muted text-muted-foreground')}
            >
              {tag.label}
            </span>
          );
        }

        return (
          <button
            key={tag.slug}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            onClick={() => onToggle(tag.slug)}
            className={cn(
              base,
              'cursor-pointer',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground hover:bg-accent'
            )}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}
