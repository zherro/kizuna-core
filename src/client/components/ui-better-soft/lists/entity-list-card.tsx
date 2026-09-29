import type { ReactNode } from 'react';
import { cn } from '../../../../lib/utils';
import { TONE_BORDER_L, type ThemeTone } from '../../../../lib/ui-tone';

type EntityListCardProps = {
  leading: ReactNode;
  trailing?: ReactNode;
  /** Optional left accent strip, same tone vocabulary as `services-list-block.tsx`/
   * `responsive-resource-table.tsx` (`src/lib/ui-tone.ts`). Omit for the plain neutral border. */
  tone?: ThemeTone;
};

export function EntityListCard({ leading, trailing, tone }: Readonly<EntityListCardProps>) {
  return (
    <li
      className={cn(
        'rounded-[var(--ui-radius-card,1rem)] border-[length:var(--ui-border-w-card,1px)] border-l-4 border-border bg-card p-4 shadow-[shadow:var(--ui-shadow-card-compact,0_1px_3px_0_#0000001a,_0_1px_2px_-1px_#0000001a)]',
        tone ? TONE_BORDER_L[tone] : 'border-l-border'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{leading}</div>
        {trailing ? <div className="flex flex-col items-end gap-2">{trailing}</div> : null}
      </div>
    </li>
  );
}
