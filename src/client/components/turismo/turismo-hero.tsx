import type { ReactNode } from 'react';

export type TurismoHeroProps = {
  title: string;
  summary?: string;
  /** Foto de fundo (opcional). Sem ela, o hero é um fundo quente claro com a trilha desenhada. */
  image?: string | null;
  /** Abaixo do texto: normalmente o `TurismoSubnav`. */
  children?: ReactNode;
  /** h1 por padrão; use `as="h2"` se a página já tiver um h1. */
  as?: 'h1' | 'h2';
};

/** Trilha tracejada com três pontos: a "rota" que dá nome à seção. Decorativa. */
function Trail() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 200"
      fill="none"
      className="pointer-events-none absolute -right-6 -top-1 h-24 w-40 text-primary/45 sm:right-4 sm:top-0 sm:h-60 sm:w-96 lg:right-12"
    >
      <path
        d="M8 176 C 70 176, 80 110, 140 112 S 214 168, 252 96 S 300 30, 312 24"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 11"
      />
      <circle cx="8" cy="176" r="6" fill="currentColor" />
      <circle cx="140" cy="112" r="6" fill="currentColor" />
      <circle cx="312" cy="24" r="9" fill="currentColor" />
    </svg>
  );
}

/**
 * Abertura das páginas de turismo. Texto à esquerda, título grande, trilha laranja atrás.
 * Com foto, o texto vai em branco sobre um escurecido (contraste garantido).
 */
export function TurismoHero({ title, summary, image, children, as: Heading = 'h1' }: TurismoHeroProps) {
  const dark = Boolean(image);
  return (
    <header className="mx-auto w-full max-w-[1280px] px-4 pt-4 sm:px-6 sm:pt-6">
      <div
        className="relative isolate overflow-hidden rounded-3xl border border-primary/15 px-5 pb-6 pt-10 sm:px-10 sm:pb-9 sm:pt-16"
        style={
          dark
            ? undefined
            : {
                backgroundImage:
                  'linear-gradient(135deg, color-mix(in oklch, var(--primary) 14%, var(--background)) 0%, color-mix(in oklch, var(--accent) 20%, var(--background)) 100%)',
              }
        }
      >
        {image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto de capa estática */}
            <img src={image} alt="" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover" />
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10"
              style={{ backgroundImage: 'linear-gradient(to top, rgb(0 0 0 / 0.78), rgb(0 0 0 / 0.35))' }}
            />
          </>
        ) : (
          <Trail />
        )}
        <Heading
          className={`relative max-w-[16ch] text-balance font-display text-[clamp(2.25rem,7vw,4.25rem)] font-black leading-[1.02] tracking-[-0.03em] ${dark ? 'text-white' : 'text-foreground'}`}
        >
          {title}
        </Heading>
        {summary ? (
          <p
            className={`relative mt-4 max-w-[52ch] text-base leading-7 sm:text-lg ${dark ? 'text-white/90' : 'text-muted-foreground'}`}
          >
            {summary}
          </p>
        ) : null}
        {children ? <div className="relative mt-7">{children}</div> : null}
      </div>
    </header>
  );
}
