'use client';

import { cn } from '../../../lib/utils';
import type { SelectOption } from './types';

export type ChoiceChipsProps = {
  options: SelectOption[];
  /** Currently active values — one entry for single-select, N for multi-select. */
  selected: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
};

/**
 * Pill/chip picker shared by `radio` (single-select) and `multiselect` (multi-select) in
 * `FormRenderer` — same visual for both, callers just differ in how `selected`/`onToggle` are
 * wired (`radio`: single value swapped on each click; `multiselect`: toggled in/out of the
 * array). Bigger touch target (`px-4 py-2.5`) than the old inline `multiselect`-only version —
 * chips are the primary input pattern on small screens.
 */
export function ChoiceChips({ options, selected, onToggle, disabled }: ChoiceChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            type="button"
            key={o.value}
            disabled={disabled}
            onClick={() => onToggle(o.value)}
            aria-pressed={active}
            className={cn(
              'rounded-full border px-4 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-primary/50'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
