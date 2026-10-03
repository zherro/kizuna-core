'use client';

import type { ComponentProps } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './ui/button';

/**
 * Botão "abrir menu" (hambúrguer) único do app: cabeçalhos do site (topbar/topbar-compact) e do
 * painel (panel-shell) usam este, para ficarem iguais e na cor do tema (`primary`).
 */
export function MobileMenuButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        'h-9 w-9 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary',
        className
      )}
      {...props}
    >
      <Menu className="h-4 w-4" />
    </Button>
  );
}
