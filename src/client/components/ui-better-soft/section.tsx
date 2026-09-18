// soft-theme: lê activeTheme (kizuna-core/src/client/lib/ui-theme.ts) — classic/soft via NEXT_PUBLIC_UI_STYLE
import type { ReactNode } from 'react';
import { activeTheme } from '../../lib/ui-theme';
import { cn } from '../../../lib/utils';

type SectionVariant = 'default' | 'compact' | 'flat';

const VARIANT_TOKEN: Record<SectionVariant, keyof typeof activeTheme> = {
  default: 'card',
  compact: 'cardCompact',
  flat: 'cardFlat',
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
 * (raio, borda, sombra) vem de `activeTheme`, resolvido uma vez por deployment via
 * `NEXT_PUBLIC_UI_STYLE`; este é o único componente de card do kit, não existe uma variante
 * paralela "soft".
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
        activeTheme[VARIANT_TOKEN[variant]] as string,
        // No soft, a base não tem borda — só ganha uma (tingida via `accentColor`) quando há
        // destaque pontual. No classic, o token já inclui `border`; repetir aqui é inofensivo.
        accentColor ? 'border' : undefined,
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
