import type { LucideIcon } from 'lucide-react';
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
export declare function Fab({ icon: Icon, onClick, ariaLabel, className }: Readonly<FabProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=fab.d.ts.map