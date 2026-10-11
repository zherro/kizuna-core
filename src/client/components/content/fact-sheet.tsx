import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type FactRow = {
  icon?: LucideIcon;
  label: string;
  /** Texto, ou lista (uma linha por item). Vazio/`null` esconde a linha. */
  value?: string | string[] | null;
  /** Renderizado como veio: DEVE ser validado/sanitizado por quem chama (ex.: só http/https, tel:, mailto:). */
  href?: string;
};

const isExternal = (href: string) => /^https?:\/\//i.test(href);

function hasValue(value: FactRow['value']): value is string | string[] {
  if (value == null) return false;
  return Array.isArray(value) ? value.some((v) => v.trim() !== '') : value.trim() !== '';
}

/** Ficha "Informações": só mostra as linhas que têm valor; sem nenhuma, o bloco inteiro some. */
export function FactSheet({
  title = 'Informações',
  rows,
  className,
}: {
  title?: string;
  rows: FactRow[];
  className?: string;
}) {
  const visible = rows.filter((r) => hasValue(r.value));
  if (visible.length === 0) return null;

  return (
    <section className={cn('rounded-2xl border border-border bg-muted/40 p-5', className)}>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <dl className="mt-4 space-y-5">
        {visible.map((row, rowIndex) => {
          const Icon = row.icon;
          const lines = (Array.isArray(row.value) ? row.value : [row.value as string]).filter(
            (line) => line.trim() !== ''
          );
          return (
            <div key={`${rowIndex}-${row.label}`}>
              <dt className="flex items-start gap-3 text-sm font-medium text-muted-foreground">
                {Icon ? <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" /> : null}
                <span className="min-w-0">{row.label}</span>
              </dt>
              {lines.map((line, lineIndex) => (
                <dd
                  key={`${lineIndex}-${line}`}
                  className={cn('text-base leading-7 text-foreground', Icon && 'pl-8')}
                >
                  {row.href ? (
                    <a
                      href={row.href}
                      className="inline-block min-h-11 rounded-sm py-2 font-medium underline underline-offset-4 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      {...(isExternal(row.href)
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                    >
                      {line}
                    </a>
                  ) : (
                    line
                  )}
                </dd>
              ))}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
