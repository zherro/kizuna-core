'use client';
// soft-theme: raio via var(--ui-*) (globals.css) — classic/soft via data-ui-style

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type SelectPopoverOption<T extends number | string = number> = { value: T; label: string };

type SelectPopoverProps<T extends number | string> = {
  value: T;
  options: SelectPopoverOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  /** Classes extras do painel da lista (ex.: `max-h-80`). */
  listClassName?: string;
  /** Id do gatilho, para um `<label htmlFor>` visível. */
  id?: string;
};

/**
 * Substitui o `<select>` nativo — no mobile ele delega a UI pro sistema (roda do iOS, lista
 * fullscreen do Android), fora do alcance de qualquer CSS. Este popover fica no nosso controle;
 * o raio do gatilho e do painel vêm dos tokens `--ui-radius-field` e `--ui-radius-popover`, que
 * trocam por `data-ui-style` (`NEXT_PUBLIC_UI_STYLE`).
 */
export function SelectPopover<T extends number | string = number>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  listClassName,
  id,
}: Readonly<SelectPopoverProps<T>>) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const fecharSeClicarFora = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    };
    const fecharComEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAberto(false);
        triggerRef.current?.focus();
        return;
      }
      // Setas/Home/End movem o foco entre as opções (teclado em listas longas).
      const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
      if (!keys.includes(event.key) || !listRef.current) return;
      const opts = Array.from(listRef.current.querySelectorAll<HTMLElement>('[role="option"]'));
      if (opts.length === 0) return;
      event.preventDefault();
      const cur = opts.indexOf(document.activeElement as HTMLElement);
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? opts.length - 1
            : event.key === 'ArrowDown'
              ? Math.min(opts.length - 1, cur + 1)
              : Math.max(0, cur - 1);
      opts[next]?.focus();
    };

    // Ao abrir, o foco vai para a opção atual e ela entra na área visível da lista.
    const atual = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    atual?.focus({ preventScroll: true });
    atual?.scrollIntoView({ block: 'nearest' });

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
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className={cn(
          'flex items-center gap-1 text-base font-normal transition-colors',
          'rounded-[var(--ui-radius-field,0.375rem)] border border-border bg-background px-3 py-2',
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
        ref={listRef}
        role="listbox"
        aria-label={ariaLabel}
        aria-hidden={!aberto}
        inert={!aberto}
        className={cn(
          'absolute top-full left-0 z-20 mt-2 max-h-56 w-max min-w-full overflow-y-auto p-1.5 transition-[opacity,transform] duration-200 ease-out',
          'rounded-[var(--ui-radius-popover,0.375rem)] border border-border bg-popover shadow-md',
          aberto ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0',
          listClassName
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
              triggerRef.current?.focus();
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
