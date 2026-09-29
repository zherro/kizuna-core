// soft-theme: raio/borda/sombra/fundo via var(--ui-*) (globals.css) — classic/soft via data-ui-style
import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

type SectionVariant = 'default' | 'compact' | 'flat';

const VARIANT_CLASS: Record<SectionVariant, string> = {
  default:
    'rounded-[var(--ui-radius-card,1rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-[color:var(--ui-card-bg,var(--background))] p-5 shadow-[shadow:var(--ui-shadow-card,0_1px_3px_0_#0000001a,_0_1px_2px_-1px_#0000001a)] sm:p-6',
  compact:
    'rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-[color:var(--ui-card-bg,var(--background))] p-3.5 shadow-[shadow:var(--ui-shadow-card-compact,0_1px_3px_0_#0000001a,_0_1px_2px_-1px_#0000001a)]',
  flat: 'rounded-[var(--ui-radius-card,1rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-[color:var(--ui-card-bg,var(--background))] p-5 shadow-[shadow:var(--ui-shadow-card-flat,0_1px_3px_0_#0000001a,_0_1px_2px_-1px_#0000001a)] sm:p-6',
};

type SectionProps = {
  /** Sem `icon`/`title`, a seção vira um card simples — o wrapper é o mesmo, só sem cabeçalho. */
  icon?: ReactNode;
  title?: string;
  description?: string;
  /**
   * `default` (com cabeçalho, ex.: bloco de configurações), `compact` (sem cabeçalho, item de
   * lista, ex.: card de compromisso) ou `flat` (wrapper maior, ex.: calendário inline).
   */
  variant?: SectionVariant;
  /** Cor CSS que tinge a borda via `color-mix`, para destacar um item específico. */
  accentColor?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Card do kit `ui-better-soft` — com ou sem cabeçalho (ícone + título + descrição). O visual
 * (raio, borda, sombra, fundo) vem dos tokens `--ui-*` do globals.css, que trocam por
 * `data-ui-style` (`NEXT_PUBLIC_UI_STYLE`, resolvido uma vez por deployment); este é o único
 * componente de card do kit, não existe uma variante paralela "soft".
 */
export function Section({
  icon,
  title,
  description,
  variant = 'default',
  accentColor,
  className,
  children,
}: Readonly<SectionProps>) {
  return (
    <section
      className={cn(
        VARIANT_CLASS[variant],
        // No soft, a base não tem borda (--ui-border-w-card = 0) — só ganha uma (tingida via
        // `accentColor`) quando há destaque pontual, com a largura de --ui-border-w-chip (1px nos
        // dois estilos). No classic, o valor é o mesmo da borda base.
        accentColor ? 'border-[length:var(--ui-border-w-chip,1px)]' : undefined,
        className
      )}
      style={
        accentColor
          ? { borderColor: `color-mix(in oklch, ${accentColor} 30%, transparent)` }
          : undefined
      }
    >
      {title ? (
        <header className="mb-4 flex items-start gap-3">
          {icon ? (
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
              {icon}
            </span>
          ) : null}
          <div>
            <h2 className="text-base font-bold sm:text-lg">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </header>
      ) : null}
      {children}
    </section>
  );
}
