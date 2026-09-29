'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from './button';

interface SheetContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextType | undefined>(undefined);

const useSheet = () => {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error('useSheet must be used within SheetProvider');
  return context;
};

interface SheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Sheet = ({ children, open: controlledOpen, onOpenChange }: SheetProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? onOpenChange! : setUncontrolledOpen;

  return (
    <SheetContext.Provider value={{ open, onOpenChange: setOpen }}>
      {children}
    </SheetContext.Provider>
  );
};

const SheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, ...props }, ref) => {
  const { onOpenChange } = useSheet();
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onOpenChange(true);
    props.onClick?.(e);
  };

  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children as React.ReactElement<any>, {
      onClick: handleClick,
    });
  }

  return <button ref={ref} onClick={handleClick} {...props} />;
});

SheetTrigger.displayName = 'SheetTrigger';

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Botão "X" no canto do painel (default true). Desligue se o conteúdo já traz o seu. */
  showClose?: boolean;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = 'right', className = '', showClose = true, children, ...props }, ref) => {
    const { open, onOpenChange } = useSheet();

    const sideClasses = {
      top: 'top-0 left-0 right-0 rounded-b-[var(--ui-radius-sheet-top,1rem)]',
      right: 'right-0 top-0 bottom-0 w-full max-w-md rounded-l-[var(--ui-radius-sheet-top,1rem)]',
      bottom: 'bottom-0 left-0 right-0 rounded-t-[var(--ui-radius-sheet-top,1rem)]',
      left: 'left-0 top-0 bottom-0 w-full max-w-md rounded-r-[var(--ui-radius-sheet-top,1rem)]',
    };

    React.useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onOpenChange(false);
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [open, onOpenChange]);

    if (!open || typeof document === 'undefined') return null;

    // Portal no <body>: um ancestral com backdrop-filter/transform (ex.: o header
    // sticky com backdrop-blur) vira o containing block de `position: fixed` e
    // prenderia o painel dentro dele. z acima do header (z-50).
    return createPortal(
      <>
        <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => onOpenChange(false)} />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          // cn (tailwind-merge): um `w-72` do chamador substitui o `w-full` do lado
          className={cn(
            'fixed z-[70] border-[length:var(--ui-border-w-card,1px)] border-border bg-background shadow-[shadow:var(--ui-shadow-sheet,0_10px_15px_-3px_#0000001a,_0_4px_6px_-4px_#0000001a)] overflow-y-auto',
            sideClasses[side],
            className
          )}
          {...props}
        >
          {showClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Fechar"
              onClick={() => onOpenChange(false)}
              className="absolute right-3 top-3 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {children}
        </div>
      </>,
      document.body
    );
  }
);

SheetContent.displayName = 'SheetContent';

const SheetHeader = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex items-center justify-between border-b border-border p-4 ${className}`}
    {...props}
  />
);

SheetHeader.displayName = 'SheetHeader';

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h2 ref={ref} className={`text-lg font-semibold ${className}`} {...props} />
  )
);

SheetTitle.displayName = 'SheetTitle';

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle };
