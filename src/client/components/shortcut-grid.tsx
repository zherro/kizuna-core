import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type ShortcutGridItem = {
  href: string;
  title: string;
  text?: string;
  Icon: LucideIcon;
  /** Selo à direita do título (ex.: contagem de pendências). */
  badge?: ReactNode;
};

/** Grade de atalhos (cards) para o topo de uma home de painel. Sem itens, não renderiza. */
export function ShortcutGrid({ items, label = 'Atalhos' }: { items: ShortcutGridItem[]; label?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label}>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ href, title, text, Icon, badge }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full min-h-11 items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold text-foreground group-hover:text-primary">
                  {title}
                  {badge ?? null}
                </span>
                {text ? <span className="block text-sm text-muted-foreground">{text}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
