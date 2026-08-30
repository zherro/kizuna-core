'use client';

import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useId } from 'react';

type ToggleRowProps = {
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

export function ToggleRow({
  title,
  subtitle,
  checked,
  onChange,
  disabled,
}: Readonly<ToggleRowProps>) {
  const id = useId();

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {title}
        </Label>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
