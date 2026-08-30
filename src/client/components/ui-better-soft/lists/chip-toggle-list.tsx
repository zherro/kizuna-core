import { Check } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import type { IconChoiceAccent } from './icon-choice-grid';

export type ChipOption = {
  id: string;
  label: string;
};

type ChipToggleListProps = {
  options: ChipOption[];
  /** Ids of the currently selected options. */
  value: string[];
  onChange: (nextValue: string[]) => void;
  accent?: IconChoiceAccent;
};

const ACCENT_CHIP: Record<IconChoiceAccent, { active: string; idle: string }> = {
  brand: {
    active: 'border-brand bg-brand text-brand-foreground',
    idle: 'border-border bg-card hover:border-brand',
  },
  primary: {
    active: 'border-primary/45 bg-primary/10 font-semibold text-primary',
    idle: 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5',
  },
};

/** Row of toggleable pill chips, e.g. for picking several tags/specialties in one step. */
export function ChipToggleList({
  options,
  value,
  onChange,
  accent = 'brand',
}: Readonly<ChipToggleListProps>) {
  const selected = new Set(value);
  const tone = ACCENT_CHIP[accent];

  function toggle(id: string) {
    onChange(selected.has(id) ? value.filter((item) => item !== id) : [...value, id]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.has(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition',
              active ? tone.active : tone.idle
            )}
          >
            {active ? <Check className="h-3.5 w-3.5" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
