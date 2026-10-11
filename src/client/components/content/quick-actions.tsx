import type { LucideIcon } from 'lucide-react';

export type QuickAction = {
  label: string;
  /** Renderizado como veio: DEVE ser validado/sanitizado por quem chama (ex.: só http/https, tel:, mailto:). */
  href: string;
  icon?: LucideIcon;
  external?: boolean;
};

/** Faixa de ações rápidas em chips, para o mobile (rola na horizontal se não couber). */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  if (actions.length === 0) return null;
  return (
    <nav aria-label="Ações rápidas" className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {actions.map(({ label, href, icon: Icon, external }, index) => (
        <a
          key={`${index}-${label}`}
          href={href}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {Icon ? <Icon className="h-4 w-4 text-brand" aria-hidden="true" /> : null}
          {label}
        </a>
      ))}
    </nav>
  );
}
