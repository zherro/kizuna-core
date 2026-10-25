'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../../lib/utils';

export interface BottomBarProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'className'> {
  children: ReactNode;
  /** `nav` para navegação (tab bar); `div` para ações (rodapé de um formulário). */
  as?: 'nav' | 'div';
  /** Classes da barra (ex.: `md:hidden` para só no mobile). */
  className?: string;
  /** Classes do miolo centralizado (largura máxima, alinhamento, espaçamento). */
  innerClassName?: string;
}

/**
 * Barra fixa no rodapé da tela: borda superior, fundo translúcido com blur e respiro da
 * safe-area (iPhone). É a casca da `MobileTabBar` e do rodapé de ações do wizard — o conteúdo
 * vem por `children`. Começa depois do menu lateral do painel (`--panel-sidebar-w`) no desktop.
 * z-20: abaixo do drawer do painel (z-50), do overlay (z-40) e do chat da busca (z-30).
 */
export function BottomBar({
  children,
  as: Tag = 'div',
  className,
  innerClassName,
  ...rest
}: BottomBarProps) {
  return (
    <Tag
      {...rest}
      data-bottom-bar
      className={cn(
        'fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur',
        'pb-[env(safe-area-inset-bottom)] lg:left-[var(--panel-sidebar-w,0px)]',
        className
      )}
    >
      <div className={cn('mx-auto w-full', innerClassName)}>{children}</div>
    </Tag>
  );
}

export default BottomBar;
