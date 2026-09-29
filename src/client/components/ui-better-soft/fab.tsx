// soft-theme: tamanho/sombra via var(--ui-fab-size / --ui-shadow-fab) (globals.css) — classic/soft via data-ui-style
import type { LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../../lib/utils';

type FabProps = {
  icon: LucideIcon;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
};

/**
 * Botão circular único, fixo no rodapé — a ação primária de uma tela mobile. Sem pílula, sem
 * slot de ação secundária. Tamanho/sombra vêm dos tokens `--ui-fab-size` e `--ui-shadow-fab`,
 * que trocam por `data-ui-style` (`NEXT_PUBLIC_UI_STYLE`).
 */
export function Fab({ icon: Icon, onClick, ariaLabel, className }: Readonly<FabProps>) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 flex justify-center pb-4">
      <Button
        type="button"
        size="icon"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          'h-[var(--ui-fab-size,3rem)] w-[var(--ui-fab-size,3rem)] rounded-full shadow-[shadow:var(--ui-shadow-fab,0_4px_6px_-1px_#0000001a,_0_2px_4px_-2px_#0000001a)]',
          className
        )}
      >
        <Icon className="h-6 w-6" />
      </Button>
    </div>
  );
}
