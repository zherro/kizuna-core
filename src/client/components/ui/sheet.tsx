'use client';

import * as React from 'react';
import { X } from 'lucide-react';
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
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = 'right', className = '', children, ...props }, ref) => {
    const { open, onOpenChange } = useSheet();

    const sideClasses = {
      top: 'top-0 left-0 right-0 rounded-b-2xl',
      right: 'right-0 top-0 bottom-0 w-full max-w-md rounded-l-2xl',
      bottom: 'bottom-0 left-0 right-0 rounded-t-2xl',
      left: 'left-0 top-0 bottom-0 w-full max-w-md rounded-r-2xl',
    };

    if (!open) return null;

    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => onOpenChange(false)} />
        <div
          ref={ref}
          className={`fixed z-50 border border-border bg-background shadow-lg overflow-y-auto ${sideClasses[side]} ${className}`}
          {...props}
        >
          {children}
        </div>
      </>
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
