'use client';

import type { LucideIcon } from 'lucide-react';
import { Clock } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { cn } from '../../../lib/utils';

type ScheduleRowProps = {
  label: string;
  icon?: LucideIcon;
  description?: string;
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  switchAriaLabel?: string;
};

export function ScheduleRow({
  label,
  icon: Icon,
  description,
  enabled,
  onEnabledChange,
  start,
  end,
  onStartChange,
  onEndChange,
  switchAriaLabel,
}: Readonly<ScheduleRowProps>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-3 transition-colors',
        !enabled && 'opacity-70'
      )}
    >
      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
        <div className="flex min-w-[160px] items-center gap-3">
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
            aria-label={switchAriaLabel ?? label}
          />
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
            {label}
          </span>
        </div>

        {description ? (
          <p className="mr-4 flex-1 text-xs text-muted-foreground">{description}</p>
        ) : null}

        <div className="flex flex-1 items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            type="time"
            value={start}
            disabled={!enabled}
            onChange={(event) => onStartChange(event.target.value)}
            className="w-[110px]"
          />
          <span className="text-sm text-muted-foreground">até</span>
          <Input
            type="time"
            value={end}
            disabled={!enabled}
            onChange={(event) => onEndChange(event.target.value)}
            className="w-[110px]"
          />
        </div>
      </div>
    </div>
  );
}
