'use client';

import { cn } from '../../../lib/utils';
import { Progress } from '../ui/progress';

export type FixedBottomProgressStep = {
  id: number;
  label: string;
  disabled?: boolean;
};

type FixedBottomProgressProps = {
  steps: FixedBottomProgressStep[];
  value: number;
  className?: string;
  fixed?: boolean;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

export function FixedBottomProgress({
  steps,
  value,
  className,
  fixed = true,
}: FixedBottomProgressProps) {
  const total = Math.max(steps.length, 1);
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === value)
  );
  const completedSteps = Math.max(currentIndex, 0);
  const percent = clampPercent(total <= 1 ? 0 : (completedSteps / (total - 1)) * 100);

  return (
    <div
      className={cn(
        fixed
          ? 'fixed inset-x-0 bottom-[61px] z-40 border-t border-border bg-background/96 backdrop-blur supports-[backdrop-filter]:bg-background/85'
          : 'rounded-xl border border-border bg-background',
        className
      )}
    >
      <div className="mx-auto w-full">
        <Progress value={percent} />
      </div>
    </div>
  );
}
