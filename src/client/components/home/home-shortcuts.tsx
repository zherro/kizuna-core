import Link from 'next/link';
import type { ReactNode } from 'react';

export type HomeShortcut = {
  href: string;
  label: string;
  /** Ícone (lucide, ~20px). */
  icon: ReactNode;
  /** Destaca o atalho (fundo na cor primária suave) — use em um só. */
  featured?: boolean;
  /** Desliga o prefetch do link (ex. telas pesadas como o swipe). */
  prefetch?: boolean;
};

export type HomeShortcutsProps = {
  items: HomeShortcut[];
  /** Rótulo da navegação para leitor de tela. Default "Atalhos". */
  label?: string;
  className?: string;
};

/**
 * Atalhos da home numa linha só (ícone sobre o rótulo, colunas iguais): a versão de celular dos
 * cartões "Hoje", "Mapa", "Descobrir" — ocupa ~60px em vez de dois cartões grandes, para a 1ª
 * trilha de conteúdo entrar na primeira tela. Server Component, sem estado. Sem itens → `null`.
 */
export function HomeShortcuts({ items, label = 'Atalhos', className }: HomeShortcutsProps) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label} className={className}>
      <ul className="grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              prefetch={item.prefetch}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border px-1.5 py-2 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] ${
                item.featured
                  ? 'border-primary/30 bg-primary/10 hover:bg-primary/15'
                  : 'border-border bg-card hover:bg-muted/60'
              }`}
            >
              <span aria-hidden="true" className="text-primary [&_svg]:h-5 [&_svg]:w-5">
                {item.icon}
              </span>
              <span className="max-w-full truncate text-[0.8rem] font-bold leading-tight text-foreground">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
