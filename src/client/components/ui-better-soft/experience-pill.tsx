import { Zap } from 'lucide-react';
import { cn } from '../../../lib/utils';

type ExperiencePillProps = {
  text?: string;
  className?: string;
};

export function ExperiencePill({
  text = 'Experiencia rapida para comprar e vender local',
  className,
}: ExperiencePillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary',
        className
      )}
    >
      <Zap className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}
