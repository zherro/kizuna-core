'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value?: string;
  onValueChange?: (value: string) => void;
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined);

const useSelectContext = () => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('useSelectContext must be used within Select');
  return context;
};

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

const Select = ({ value, onValueChange, children }: SelectProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <SelectContext.Provider value={{ open, onOpenChange: setOpen, value, onValueChange }}>
      {children}
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className = '', children, ...props }, ref) => {
  const { open, onOpenChange } = useSelectContext();

  return (
    <button
      ref={ref}
      onClick={() => onOpenChange(!open)}
      className={`flex items-center justify-between rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
    </button>
  );
});

SelectTrigger.displayName = 'SelectTrigger';

const SelectValue = ({ children }: { children?: React.ReactNode }) => {
  const { value } = useSelectContext();
  return children || value;
};

SelectValue.displayName = 'SelectValue';

const SelectContent = ({ children }: { children: React.ReactNode }) => {
  const { open, onOpenChange } = useSelectContext();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
      <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-card shadow-lg">
        {children}
      </div>
    </>
  );
};

SelectContent.displayName = 'SelectContent';

const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => {
  const { onValueChange, onOpenChange } = useSelectContext();

  const handleSelect = () => {
    onValueChange?.(value);
    onOpenChange(false);
  };

  return (
    <button
      onClick={handleSelect}
      className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {children}
    </button>
  );
};

SelectItem.displayName = 'SelectItem';

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
