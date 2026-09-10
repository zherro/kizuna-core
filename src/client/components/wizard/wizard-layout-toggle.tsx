'use client';

import { AlignLeft, Rows3 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { WizardLayout } from './wizard-layout';

const OPTIONS: { value: WizardLayout; label: string; hint: string; Icon: typeof Rows3 }[] = [
  { value: 'stepper', label: 'Passo a passo', hint: 'Um passo por vez', Icon: Rows3 },
  { value: 'scroll', label: 'Questionário', hint: 'Tudo em uma página', Icon: AlignLeft },
];

/**
 * Segmented control that switches the wizard between its two layouts. Presentational only — the
 * parent owns the value and its persistence. Active state rides on `data-active` (Tailwind
 * `border-*`/`ring-*` colour utilities are dead project-wide; `.wz-layout-toggle` styles it).
 */
export function WizardLayoutToggle({
  value,
  onChange,
  className,
}: {
  value: WizardLayout;
  onChange: (layout: WizardLayout) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Formato do formulário"
      className={cn(
        'wz-layout-toggle inline-flex items-center gap-0.5 rounded-full p-0.5',
        className,
      )}
    >
      {OPTIONS.map(({ value: v, label, hint, Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            title={hint}
            data-active={active}
            onClick={() => !active && onChange(v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default WizardLayoutToggle;
