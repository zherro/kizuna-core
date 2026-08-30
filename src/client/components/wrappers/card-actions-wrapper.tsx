import Link from 'next/link';
import { Save } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, buttonVariants } from '../ui/button';
import { cn } from '../../../lib/utils';

type CardActionsWrapperProps = {
  children: ReactNode;
  cancelHref: string;
  action: 'create' | 'update';
  submitting: boolean;
  className?: string;
};

export function CardActionsWrapper({
  children,
  cancelHref,
  action,
  submitting,
  className,
}: Readonly<CardActionsWrapperProps>) {
  const submitLabel = action === 'update' ? 'Atualizar' : 'Salvar';
  const submittingLabel = action === 'update' ? 'Atualizando...' : 'Salvando...';

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t pt-2 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="text-sm text-muted-foreground">{children}</div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Link href={cancelHref} className={cn(buttonVariants({ variant: 'outline' }), 'sm:w-auto')}>
          Cancelar
        </Link>

        <Button type="submit" disabled={submitting}>
          <Save className="mr-2 h-4 w-4" />
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
