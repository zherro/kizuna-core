'use client';

import { useId, type KeyboardEvent } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../../lib/utils';

type RatingSize = 'sm' | 'md' | 'lg';

type RatingInputProps = {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  size?: RatingSize;
  disabled?: boolean;
  name?: string;
  /** Accessible group label; defaults to pt-BR copy. */
  label?: string;
};

// i18n(track-e): reviews.rating.*
const SIZES: Record<RatingSize, { box: string; icon: string }> = {
  sm: { box: 'h-9 w-9', icon: 'h-5 w-5' },
  md: { box: 'h-10 w-10', icon: 'h-6 w-6' },
  lg: { box: 'h-12 w-12', icon: 'h-8 w-8' },
};

/**
 * Accessible star rating picker: `role="radiogroup"`, arrow keys move the value,
 * digits 1-max jump to a value, tap targets ≥ 40px (md/lg). Colored fill uses
 * `text-amber-500` / `fill-current` (text-color utilities work project-wide;
 * border/ring color utilities do not).
 */
export function RatingInput({
  value,
  onChange,
  max = 5,
  size = 'md',
  disabled = false,
  name,
  label = 'Sua nota',
}: Readonly<RatingInputProps>) {
  const groupId = useId();
  const dims = SIZES[size];

  const clamp = (n: number) => Math.max(1, Math.min(max, n));

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const current = value || 0;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(clamp(current + 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(clamp(current - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onChange(1);
    } else if (event.key === 'End') {
      event.preventDefault();
      onChange(max);
    } else if (/^[1-9]$/.test(event.key)) {
      const n = Number(event.key);
      if (n >= 1 && n <= max) {
        event.preventDefault();
        onChange(n);
      }
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring',
        disabled && 'opacity-50'
      )}
    >
      {name ? <input type="hidden" name={name} value={value || ''} readOnly /> : null}
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1;
        const active = value >= starValue;
        return (
          <button
            key={`${groupId}-${starValue}`}
            type="button"
            role="radio"
            aria-checked={value === starValue}
            aria-label={`${starValue} de ${max}`}
            tabIndex={-1}
            disabled={disabled}
            onClick={() => !disabled && onChange(starValue)}
            className={cn(
              'grid place-items-center rounded-md transition-colors',
              dims.box,
              !disabled && 'hover:bg-accent',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer'
            )}
          >
            <Star
              className={cn(
                dims.icon,
                active ? 'fill-current text-amber-500' : 'text-muted-foreground'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
