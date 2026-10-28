'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Sheet, SheetContent, SheetTitle } from '../ui/sheet';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Painel lateral de detalhe: 100% da largura no celular e 70% a partir de `md`. O conteúdo vem por
 * `children` (genérico). Esc e o fundo fecham (via `Sheet`); aqui entra o foco: vai para o painel
 * ao abrir, fica preso nele com Tab e volta para quem abriu ao fechar.
 */
export function PlaceSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={dialogRef}
        side="right"
        aria-label={title}
        tabIndex={-1}
        closeClassName="right-3 top-3 h-11 w-11 rounded-full bg-brand text-brand-foreground shadow-md hover:bg-brand hover:text-brand-foreground hover:brightness-110"
        className="w-full max-w-none rounded-none outline-none md:w-[70%] md:rounded-l-2xl"
      >
        <div className="border-b border-border py-4 pl-4 pr-16 md:pl-6">
          <SheetTitle className="font-display text-xl font-black leading-tight">{title}</SheetTitle>
        </div>
        <div className="p-4 pb-10 md:p-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
