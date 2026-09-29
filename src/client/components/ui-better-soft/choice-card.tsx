import { Badge } from '../ui/badge';
import { cn } from '../../../lib/utils';

type ChoiceCardProps = {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  badge?: string;
};

export function ChoiceCard({
  selected,
  onSelect,
  title,
  description,
  badge,
}: Readonly<ChoiceCardProps>) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col items-start gap-1.5 rounded-[var(--ui-radius-card,1rem)] border-2 p-4 text-left shadow-[shadow:var(--ui-shadow-item,0_0_#0000)] transition-all',
        selected ? 'border-brand bg-brand-soft' : 'border-border bg-card hover:border-brand/40'
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="font-semibold">{title}</span>
        {badge ? (
          <Badge
            variant="outline"
            className={cn(
              'border-transparent text-[10px]',
              selected ? 'bg-brand text-brand-foreground' : 'bg-muted'
            )}
          >
            {badge}
          </Badge>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
