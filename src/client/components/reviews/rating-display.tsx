import { Star } from 'lucide-react';
import { cn } from '../../../lib/utils';

type RatingSize = 'sm' | 'md' | 'lg';

type RatingDisplayProps = {
  value: number;
  max?: number;
  size?: RatingSize;
  showValue?: boolean;
  /** Optional review count rendered after the stars, e.g. "· 128". */
  count?: number;
};

const ICON_SIZE: Record<RatingSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
};

const TEXT_SIZE: Record<RatingSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

function ptNumber(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Read-only star rating. Fractional values render a partial last star via an
 * overlaid clipped copy. `aria-label` reads e.g. "4,7 de 5".
 */
export function RatingDisplay({
  value,
  max = 5,
  size = 'md',
  showValue = false,
  count,
}: Readonly<RatingDisplayProps>) {
  const safe = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
  const icon = ICON_SIZE[size];

  return (
    <span
      className={cn('inline-flex items-center gap-1', TEXT_SIZE[size])}
      aria-label={`${ptNumber(safe)} de ${max}`}
      role="img"
    >
      <span className="inline-flex" aria-hidden="true">
        {Array.from({ length: max }, (_, index) => {
          const fill = Math.max(0, Math.min(1, safe - index));
          return (
            <span key={index} className="relative inline-block">
              <Star className={cn(icon, 'text-muted-foreground/40')} />
              {fill > 0 ? (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <Star className={cn(icon, 'fill-current text-amber-500')} />
                </span>
              ) : null}
            </span>
          );
        })}
      </span>
      {showValue ? <span className="font-semibold">{ptNumber(safe)}</span> : null}
      {typeof count === 'number' ? (
        <span className="text-muted-foreground">
          · {count.toLocaleString('pt-BR')}
        </span>
      ) : null}
    </span>
  );
}
