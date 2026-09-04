'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

/**
 * Lightweight accordion (no @radix-ui/react-accordion in the dependency set).
 * API mirrors the shadcn/radix accordion subset used across the codebase:
 * `<Accordion type="single|multiple" collapsible defaultValue>` +
 * `<AccordionItem value>` + `<AccordionTrigger>` + `<AccordionContent>`.
 */

type AccordionContextValue = {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error('Accordion.* must be used within <Accordion>');
  return ctx;
}

type AccordionProps = {
  type?: 'single' | 'multiple';
  collapsible?: boolean;
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
};

export function Accordion({
  type = 'single',
  collapsible = true,
  defaultValue,
  className,
  children,
}: AccordionProps) {
  const [open, setOpen] = React.useState<string[]>(() => {
    if (Array.isArray(defaultValue)) return defaultValue;
    if (typeof defaultValue === 'string') return [defaultValue];
    return [];
  });

  const toggle = React.useCallback(
    (value: string) => {
      setOpen((current) => {
        const has = current.includes(value);
        if (type === 'multiple') {
          return has ? current.filter((v) => v !== value) : [...current, value];
        }
        if (has) return collapsible ? [] : current;
        return [value];
      });
    },
    [type, collapsible]
  );

  const ctx = React.useMemo<AccordionContextValue>(
    () => ({ isOpen: (value) => open.includes(value), toggle }),
    [open, toggle]
  );

  return (
    <AccordionContext.Provider value={ctx}>
      <div className={cn('divide-y divide-border', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

const ItemContext = React.createContext<string>('');

export function AccordionItem({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ItemContext.Provider value={value}>
      <div className={cn('py-1', className)}>{children}</div>
    </ItemContext.Provider>
  );
}

export function AccordionTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isOpen, toggle } = useAccordionContext();
  const value = React.useContext(ItemContext);
  const open = isOpen(value);
  return (
    <button
      type="button"
      onClick={() => toggle(value)}
      aria-expanded={open}
      className={cn(
        'flex w-full items-center justify-between gap-2 py-2 text-left text-sm font-medium transition-colors hover:text-foreground/80',
        className
      )}
    >
      {children}
      <ChevronDown
        className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
      />
    </button>
  );
}

export function AccordionContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isOpen } = useAccordionContext();
  const value = React.useContext(ItemContext);
  if (!isOpen(value)) return null;
  return <div className={cn('pb-3 pt-1 text-sm', className)}>{children}</div>;
}
