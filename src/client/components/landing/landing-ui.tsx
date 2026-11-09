import type { ReactNode } from 'react';
import { MessageCircle, type LucideIcon } from 'lucide-react';

export const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Casca das seções das páginas de captação: container de 1280px (o mesmo da home), título com a
 * barrinha da cor do tema e, opcional, uma linha de apoio. O `id` do título liga a seção por aria.
 */
export function LandingSection({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mx-auto w-full max-w-[1280px] px-4 pt-12 sm:px-6 sm:pt-16">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-6 w-1 shrink-0 rounded-full bg-primary" />
          <h2 id={id} className="font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl">
            {title}
          </h2>
        </div>
        {intro ? <p className="mt-2 max-w-[62ch] text-base leading-7 text-muted-foreground">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Botão de contato (WhatsApp por padrão, link `wa.me`; serve também para `mailto:`). Cor do tema com o texto de contraste; alvo de toque ≥ 48px. */
export function WhatsAppButton({
  href,
  label = 'Falar no WhatsApp',
  variant = 'solid',
  icon: Icon = MessageCircle,
  className = '',
  ...rest
}: {
  href: string;
  label?: string;
  variant?: 'solid' | 'soft';
  /** Ícone do botão (padrão: balão do WhatsApp). */
  icon?: LucideIcon;
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>) {
  const tone =
    variant === 'solid'
      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:brightness-95'
      : 'bg-background text-foreground ring-1 ring-border hover:bg-muted';
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-bold motion-safe:transition ${tone} ${FOCUS_RING} ${className}`}
      {...rest}
    >
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      {label}
    </a>
  );
}
