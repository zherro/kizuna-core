'use client';

import { cn } from '../../../../lib/utils';
import { TONE_TEXT, type ThemeTone } from '../../../../lib/ui-tone';

type FilterStatCardProps = {
  label: string;
  /** `string` allowed for a loading placeholder (e.g. `'—'`) — see `services-list-block.tsx`'s
   * `StatusFilterTile`. */
  value: number | string;
  active: boolean;
  onClick: () => void;
  /** Same tone vocabulary as the rest of `/painel` — `src/lib/ui-tone.ts`. Omit for neutral. */
  tone?: ThemeTone;
};

export function FilterStatCard({
  label,
  value,
  active,
  onClick,
  tone = 'muted',
}: Readonly<FilterStatCardProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border p-3 text-left transition',
        active
          ? 'border-brand bg-brand-soft ring-1 ring-brand'
          : 'border-border bg-card hover:bg-muted/40'
      )}
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-2xl font-black', TONE_TEXT[tone])}>{value}</div>
    </button>
  );
}
