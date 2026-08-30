'use client';

import { useState } from 'react';
import { Switch } from '../ui/switch';
import { cn } from '../../../lib/utils';

type WrapperStatusSwitchProps = {
  checked: boolean;
  onToggle: (nextChecked: boolean) => Promise<void> | void;
  activeLabel?: string;
  inactiveLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function WrapperStatusSwitch({
  checked,
  onToggle,
  activeLabel = 'Ativo',
  inactiveLabel = 'Inativo',
  disabled = false,
  className,
}: Readonly<WrapperStatusSwitchProps>) {
  const [pending, setPending] = useState(false);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Switch
        checked={checked}
        disabled={disabled || pending}
        onCheckedChange={(nextChecked) => {
          setPending(true);
          void Promise.resolve(onToggle(nextChecked)).finally(() => {
            setPending(false);
          });
        }}
      />
      <span className="text-xs text-muted-foreground">{checked ? activeLabel : inactiveLabel}</span>
    </div>
  );
}
