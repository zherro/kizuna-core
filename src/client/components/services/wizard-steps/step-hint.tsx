import type { ReactNode } from 'react';
import { AlertTriangle, Info, Lightbulb } from 'lucide-react';
import { cn } from '../../../../lib/utils';

type HintTone = 'tip' | 'info' | 'warning';

const TONE: Record<HintTone, { icon: typeof Info; className: string }> = {
  tip: { icon: Lightbulb, className: 'bg-accent/20 text-foreground' },
  info: { icon: Info, className: 'bg-info/10 text-foreground' },
  warning: { icon: AlertTriangle, className: 'bg-warning/20 text-foreground' },
};

/**
 * Small inline note that helps the provider decide — a tip, a neutral clarification, or a
 * consequence warning. Keep the copy to one or two sentences.
 */
export function StepHint({ tone = 'tip', children }: { tone?: HintTone; children: ReactNode }) {
  const { icon: Icon, className } = TONE[tone];

  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm', className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden />
      <div className="leading-relaxed [&_strong]:font-semibold">{children}</div>
    </div>
  );
}
