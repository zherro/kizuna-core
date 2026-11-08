import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { FOCUS_RING, LandingSection } from './landing-ui';

export type LandingPoint = { title: string; text: string; icon?: LucideIcon };

/**
 * Lista curta de pontos (problema, benefícios, pilares): 1 coluna no celular, 3 do tablet para cima.
 * Com `highlightLast`, o último cartão ganha o tom do tema — usado quando ele é a resposta (“O Bora junta”).
 */
export function LandingPoints({
  id,
  title,
  intro,
  items,
  highlightLast = false,
}: {
  id: string;
  title: string;
  intro?: string;
  items: LandingPoint[];
  highlightLast?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <LandingSection id={id} title={title} intro={intro}>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((item, i) => {
          const hot = highlightLast && i === items.length - 1;
          const Icon = item.icon;
          return (
            <li
              key={item.title}
              className={`flex flex-col gap-2 rounded-2xl border p-5 ${
                hot ? 'border-primary/30 bg-primary/10' : 'border-border bg-card'
              }`}
            >
              {Icon ? (
                <span className="mb-1 grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
              ) : null}
              <h3 className="font-display text-lg font-black leading-snug tracking-tight">{item.title}</h3>
              <p className="text-base leading-7 text-muted-foreground">{item.text}</p>
            </li>
          );
        })}
      </ul>
    </LandingSection>
  );
}

export type LandingStep = { title: string; text?: string };

/** Passos numerados (“Como entrar”). Lista ordenada de verdade, para leitores de tela. */
export function LandingSteps({ id, title, steps }: { id: string; title: string; steps: LandingStep[] }) {
  if (steps.length === 0) return null;
  return (
    <LandingSection id={id} title={title}>
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-black text-primary-foreground"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-black leading-snug tracking-tight">{step.title}</h3>
              {step.text ? <p className="mt-1 text-base leading-7 text-muted-foreground">{step.text}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </LandingSection>
  );
}

/**
 * Bloco de destaque com texto de cartaz: o `quote` aparece como um cartaz de balcão e `children`
 * traz a explicação ao lado. Opcional: link para a página que o cartaz aponta.
 */
export function LandingPoster({
  id,
  title,
  quote,
  href,
  linkLabel,
  children,
}: {
  id: string;
  title: string;
  quote: string;
  href?: string;
  linkLabel?: string;
  children?: ReactNode;
}) {
  return (
    <LandingSection id={id} title={title}>
      <div className="grid items-center gap-6 md:grid-cols-2">
        <figure
          className="rounded-3xl border-2 border-dashed border-primary/40 p-6 text-center sm:p-8"
          style={{
            backgroundImage:
              'linear-gradient(135deg, color-mix(in oklch, var(--primary) 14%, var(--background)) 0%, color-mix(in oklch, var(--accent) 22%, var(--background)) 100%)',
          }}
        >
          <blockquote className="font-display text-xl font-black leading-snug tracking-tight text-foreground sm:text-2xl">
            {quote}
          </blockquote>
        </figure>
        <div className="space-y-3 text-base leading-7 text-muted-foreground">
          {children}
          {href && linkLabel ? (
            <Link
              href={href}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 font-bold text-primary underline-offset-4 hover:underline ${FOCUS_RING}`}
            >
              {linkLabel}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </LandingSection>
  );
}

export type LandingLinkCard = { href: string; title: string; text: string; icon?: LucideIcon };

/** Cartões que levam a outras páginas (os públicos de /anuncie). O cartão inteiro é o link. */
export function LandingLinkCards({
  id,
  title,
  intro,
  items,
}: {
  id: string;
  title: string;
  intro?: string;
  items: LandingLinkCard[];
}) {
  if (items.length === 0) return null;
  return (
    <LandingSection id={id} title={title} intro={intro}>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map(({ href, title: t, text, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={`group flex h-full min-h-28 items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:bg-primary/5 motion-safe:transition-colors ${FOCUS_RING}`}
            >
              {Icon ? (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block font-display text-xl font-black leading-tight tracking-tight">{t}</span>
                <span className="mt-1 block text-base leading-6 text-muted-foreground">{text}</span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-primary motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}

/** Fecho da página: título, texto opcional e as ações (botão de WhatsApp, link para /hoje). `id` é a âncora do botão fixo. */
export function LandingCta({
  id,
  title,
  text,
  children,
  footnote,
}: {
  id: string;
  title: string;
  text?: string;
  children: ReactNode;
  /** Linha pequena abaixo das ações (ex.: e-mail de contato). */
  footnote?: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-12 sm:px-6 sm:pt-16">
      <div
        id={id}
        className="rounded-3xl border border-primary/20 px-5 py-10 text-center sm:px-10 sm:py-14"
        style={{
          backgroundImage:
            'linear-gradient(135deg, color-mix(in oklch, var(--primary) 18%, var(--background)) 0%, color-mix(in oklch, var(--accent) 26%, var(--background)) 100%)',
        }}
      >
        <h2
          id={`${id}-title`}
          className="font-display text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl"
        >
          {title}
        </h2>
        {text ? <p className="mx-auto mt-3 max-w-[52ch] text-base leading-7 text-muted-foreground">{text}</p> : null}
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">{children}</div>
        {footnote ? <p className="mt-5 text-sm text-muted-foreground">{footnote}</p> : null}
      </div>
    </section>
  );
}
