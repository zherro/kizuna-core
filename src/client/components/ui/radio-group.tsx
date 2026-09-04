'use client';

import * as React from 'react';
import { cn } from '../../../lib/utils';

/**
 * Minimal radio group (no @radix-ui/react-radio-group in the dependency set).
 * API subset: `<RadioGroup value onValueChange disabled>` + `<RadioGroupItem value id>`.
 */

type RadioGroupContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  name: string;
  disabled?: boolean;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

let groupCounter = 0;

export function RadioGroup({
  value,
  onValueChange,
  disabled,
  className,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const name = React.useMemo(() => `radio-group-${(groupCounter += 1)}`, []);
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name, disabled }}>
      <div role="radiogroup" className={cn('grid gap-2', className)}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export function RadioGroupItem({
  value,
  id,
  className,
}: {
  value: string;
  id?: string;
  className?: string;
}) {
  const ctx = React.useContext(RadioGroupContext);
  if (!ctx) throw new Error('RadioGroupItem must be used within RadioGroup');
  const checked = ctx.value === value;
  return (
    <button
      type="button"
      role="radio"
      id={id}
      aria-checked={checked}
      disabled={ctx.disabled}
      onClick={() => ctx.onValueChange?.(value)}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary text-primary shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
    </button>
  );
}
