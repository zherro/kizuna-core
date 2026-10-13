'use client';

import type { ReactNode } from 'react';
import { resolveLucideIcon } from '../../../../lib/lucide-icon';
import { cn } from '../../../../lib/utils';

/** Ícone lucide pelo nome gravado no banco; sem nome (ou nome inválido) não desenha nada. */
export function FilterIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = resolveLucideIcon(name);
  return Icon ? <Icon className={className} aria-hidden="true" /> : null;
}

/** Micro-badge de contagem ("2 selecionadas"). */
export function CountBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full bg-primary/10 px-2 text-[11px] font-semibold leading-none text-primary',
        className
      )}
    >
      {children}
    </span>
  );
}

/** Bloco do painel: título curto (frase, sem caixa-alta) + conteúdo; `aside` fica à direita do título. */
export function FilterSection({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-2', className)}>
      <div className="flex min-h-5 items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Linha de carregamento leve (esqueleto) para as listas do filtro. */
export function FilterSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true" data-testid="filter-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-[var(--ui-radius-card-sm,0.5rem)] bg-muted motion-reduce:animate-none sm:h-8"
          style={{ opacity: 1 - i * 0.18 }}
        />
      ))}
    </div>
  );
}

/** Aviso amigável de lista vazia / falha (borda tracejada, mesmo vocabulário do carrossel). */
export function FilterNotice({
  children,
  action,
  tone = 'muted',
}: {
  children: ReactNode;
  action?: ReactNode;
  tone?: 'muted' | 'danger';
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cn(
        'flex flex-col items-start gap-2 rounded-[var(--ui-radius-card-sm,0.5rem)] border border-dashed border-border bg-muted/30 px-3 py-3 text-sm',
        tone === 'danger' ? 'text-danger' : 'text-muted-foreground'
      )}
    >
      <p>{children}</p>
      {action}
    </div>
  );
}
