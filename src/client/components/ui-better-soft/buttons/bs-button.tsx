import type { LucideIcon } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../../../lib/utils';

type BsButtonVariant = 'default' | 'outline';

type BsButtonProps = {
  label: string;
  variant?: BsButtonVariant;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
};

const VARIANT_CLASSES: Record<BsButtonVariant, string> = {
  default: 'bg-brand text-brand-foreground hover:bg-brand/90',
  outline: '',
};

export function BsButton({
  label,
  variant = 'default',
  icon: Icon,
  onClick,
  disabled,
}: Readonly<BsButtonProps>) {
  return (
    <Button
      type="button"
      variant={variant === 'default' ? 'default' : 'outline'}
      onClick={onClick}
      disabled={disabled}
      className={cn(VARIANT_CLASSES[variant])}
    >
      {Icon ? <Icon className="mr-1.5 h-4 w-4" /> : null}
      {label}
    </Button>
  );
}
