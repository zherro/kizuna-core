'use client';
// soft-theme: lê activeTheme (kizuna-core/src/client/lib/ui-theme.ts) — classic/soft via NEXT_PUBLIC_UI_STYLE

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { activeTheme } from '../../lib/ui-theme';
import { cn } from '../../../lib/utils';

export type SelectPopoverOption = { value: number; label: string };

type SelectPopoverProps = {
  value: number;
  options: SelectPopoverOption[];
  onChange: (value: number) => void;
  ariaLabel: string;
  className?: string;
};

/**
 * Substitui o `<select>` nativo — no mobile ele delega a UI pro sistema (roda do iOS, lista
 * fullscreen do Android), fora do alcance de qualquer CSS. Este popover fica no nosso controle;
 * o raio/sombra do gatilho e do painel vêm de `activeTheme`, resolvido por
 * `NEXT_PUBLIC_UI_STYLE`.
 */
export function SelectPopover({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: Readonly<SelectPopoverProps>) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const fecharSeClicarFora = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    };
    const fecharComEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAberto(false);
    };

    document.addEventListener('mousedown', fecharSeClicarFora);
    document.addEventListener('keydown', fecharComEsc);
    return () => {
      document.removeEventListener('mousedown', fecharSeClicarFora);
      document.removeEventListener('keydown', fecharComEsc);
    };
  }, [aberto]);

  const rotuloAtual = options.find((o) => o.value === value)?.label ?? String(value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className={cn(
          'flex items-center gap-1 text-base font-normal transition-colors',
          activeTheme.selectTrigger,
          className
        )}
      >
        {rotuloAtual}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
            aberto && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      <div
        role="listbox"
        aria-label={ariaLabel}
        aria-hidden={!aberto}
        inert={!aberto}
        className={cn(
          'absolute top-full left-0 z-20 mt-2 max-h-56 w-max min-w-full overflow-y-auto p-1.5 transition-[opacity,transform] duration-200 ease-out',
          activeTheme.selectPanel,
          aberto ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
        )}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={option.value === value}
            onClick={() => {
              onChange(option.value);
              setAberto(false);
            }}
            className={cn(
              'block w-full rounded-xl px-3 py-2 text-left text-base font-normal whitespace-nowrap transition-colors',
              option.value === value
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-background'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
