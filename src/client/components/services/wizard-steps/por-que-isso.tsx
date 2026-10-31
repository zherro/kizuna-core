'use client';

import { useId, useState, type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * "Por que pedimos isso?" — a text link that reveals an inline explanation balloon on click
 * (not hover, so it works on touch). Each wizard step passes its own reason as children.
 */
export function PorQueIsso({
  children,
  label = 'Por que pedimos isso?',
}: {
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        {open ? 'Ocultar explicação' : label}
      </button>

      {open ? (
        <div
          id={panelId}
          className="relative mt-2 max-w-prose rounded-xl bg-muted px-3.5 py-3 text-sm leading-relaxed text-muted-foreground"
        >
          <span aria-hidden className="absolute -top-1 left-4 h-2.5 w-2.5 rotate-45 bg-muted" />
          {children}
        </div>
      ) : null}
    </div>
  );
}
