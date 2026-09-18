// soft-theme: lê activeTheme (kizuna-core/src/client/lib/ui-theme.ts) — classic/soft via NEXT_PUBLIC_UI_STYLE
import type { LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { activeTheme } from '../../lib/ui-theme';
import { cn } from '../../../lib/utils';

type FabProps = {
  icon: LucideIcon;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
};

/**
 * Botão circular único, fixo no rodapé — a ação primária de uma tela mobile. Sem pílula, sem
 * slot de ação secundária. Tamanho/sombra vêm de `activeTheme.fab`, resolvido por
 * `NEXT_PUBLIC_UI_STYLE`.
 */
export function Fab({ icon: Icon, onClick, ariaLabel, className }: Readonly<FabProps>) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 flex justify-center pb-4">
      <Button
        type="button"
        size="icon"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(activeTheme.fab, className)}
      >
        <Icon className="h-6 w-6" />
      </Button>
    </div>
  );
}
