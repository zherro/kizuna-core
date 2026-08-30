import type { ReactNode } from 'react';
import { cn } from '../../../../lib/utils';

export type IconChoiceItem = {
  id: string;
  icon: ReactNode;
  title: string;
  description?: string;
};

/** Which design token drives the active/hover accent — the two variants already coexisting in
 * the app before this component existed (ad-wizard used `brand`, the services wizard `primary`). */
export type IconChoiceAccent = 'brand' | 'primary';

type IconChoiceGridProps = {
  items: IconChoiceItem[];
  value?: string;
  onChange: (id: string) => void;
  accent?: IconChoiceAccent;
  disabled?: boolean;
  /** `vertical`: icon on top of title/description (default). `horizontal`: icon to the left. */
  layout?: 'vertical' | 'horizontal';
  /** Tailwind grid-cols classes for the responsive breakpoints. Defaults to a 2/3/4 column ramp. */
  columnsClassName?: string;
  emptyMessage?: string;
};

const ACCENT_CARD: Record<IconChoiceAccent, { active: string; idle: string }> = {
  brand: {
    active: 'border-brand ring-2 ring-brand/30',
    idle: 'border-border bg-card hover:border-brand hover:shadow-sm',
  },
  primary: {
    active: 'border-primary/50 bg-primary/10 text-primary shadow-sm',
    idle: 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5',
  },
};

const ACCENT_ICON: Record<IconChoiceAccent, { active: string; idle: string }> = {
  brand: { active: 'bg-brand text-brand-foreground', idle: 'bg-muted group-hover:bg-brand/10' },
  primary: { active: 'bg-primary text-primary-foreground', idle: 'bg-muted' },
};

/** Grid of selectable cards (icon + title + description), e.g. for a category/group picker step. */
export function IconChoiceGrid({
  items,
  value,
  onChange,
  accent = 'brand',
  disabled,
  layout = 'vertical',
  columnsClassName,
  emptyMessage = 'Nenhuma opção disponível.',
}: Readonly<IconChoiceGridProps>) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const cardTone = ACCENT_CARD[accent];
  const iconTone = ACCENT_ICON[accent];

  return (
    <div
      className={cn(
        'grid gap-3',
        columnsClassName ?? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
      )}
    >
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              'group flex gap-2 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60',
              layout === 'horizontal' ? 'items-start gap-3' : 'flex-col items-start',
              active ? cardTone.active : cardTone.idle
            )}
          >
            <div
              className={cn(
                'grid h-10 w-10 shrink-0 place-items-center rounded-xl transition',
                active ? iconTone.active : iconTone.idle
              )}
            >
              {item.icon}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{item.title}</div>
              {item.description ? (
                <div className="line-clamp-2 text-xs text-muted-foreground">
                  {item.description}
                </div>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
