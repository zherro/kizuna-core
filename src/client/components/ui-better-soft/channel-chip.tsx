'use client';

import { cn } from '../../../lib/utils';

type ChannelChipProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

export function ChannelChip({ label, checked, onChange }: Readonly<ChannelChipProps>) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        checked
          ? 'border-brand bg-primary text-card'
          : 'border-border bg-card text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}
