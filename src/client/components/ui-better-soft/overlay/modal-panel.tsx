'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../../lib/utils';

type ModalPanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  footerFixed?: boolean;
  headerFixed?: boolean;
};

/**
 * Side panel that slides in from the right — same shape as shadcn's Sheet
 * (used e.g. by the ausencias-style reference page), rebuilt without a radix
 * dependency: a fixed backdrop + a fixed `inset-y-0 right-0` panel, full
 * width on mobile and capped at `sm:max-w-lg`, sliding in via a plain
 * transform transition.
 */
export function ModalPanel({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  footerFixed = false,
  headerFixed = false,
}: Readonly<ModalPanelProps>) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
      className={cn(
        'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
        entered ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'fixed inset-y-0 right-0 flex h-full w-full flex-col overflow-y-auto border-l border-border bg-background shadow-xl transition-transform duration-300 ease-out sm:max-w-lg',
          entered ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div
          className={`${headerFixed ? 'sticky top-0 z-40 bg-background/40 backdrop-blur' : ''} flex items-start justify-between gap-3 border-b border-border px-5 py-4`}
        >
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              {icon}
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 px-5 py-4">{children}</div>

        {footer ? (
          <div
            className={`${footerFixed ? 'sticky bottom-0 z-40 bg-background/40 backdrop-blur' : ''} flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4`}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
