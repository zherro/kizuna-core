'use client';

import { useEffect, useRef, useState } from 'react';
import { ArticleCredits } from './article-credits';

export type ArticleFigureCredit = {
  author?: string | null;
  license?: string | null;
  /** Texto da licença (http/https já validado por quem chama). */
  licenseUrl?: string | null;
  /** Página de origem da foto (http/https já validado por quem chama). */
  sourceUrl?: string | null;
};

export type ArticleFigureProps = {
  src: string;
  alt: string;
  /** Legenda da foto. */
  caption?: string | null;
  credit?: ArticleFigureCredit | null;
  /** Foto acima da dobra (capa): carrega sem `lazy`. */
  priority?: boolean;
};

const LINK =
  'underline decoration-current/30 underline-offset-2 hover:text-foreground hover:decoration-current focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {children}
    </a>
  );
}

/** "Foto: Autor / Licença" — autor ligado à página de origem, licença ao texto da licença. */
function CreditLine({ credit }: { credit: ArticleFigureCredit }) {
  const author = credit.author?.trim() || null;
  const license = credit.license?.trim() || null;
  if (!author && !license && !credit.sourceUrl) return null;
  return (
    <ArticleCredits>
      Foto:{' '}
      {author ? (
        credit.sourceUrl ? <ExternalLink href={credit.sourceUrl}>{author}</ExternalLink> : author
      ) : credit.sourceUrl ? (
        <ExternalLink href={credit.sourceUrl}>origem</ExternalLink>
      ) : null}
      {license ? (
        <>
          {author || credit.sourceUrl ? ' / ' : null}
          {credit.licenseUrl ? <ExternalLink href={credit.licenseUrl}>{license}</ExternalLink> : license}
        </>
      ) : null}
    </ArticleCredits>
  );
}

/** Abaixo desta proporção (largura/altura) a foto é "alta" (retrato, quadrada): recortá-la no
 * quadro panorâmico perderia a maior parte dela. */
const TALL_RATIO = 1.2;

function isTall(img: HTMLImageElement): boolean {
  return img.naturalWidth > 0 && img.naturalWidth / img.naturalHeight < TALL_RATIO;
}

/**
 * Foto de abertura de uma matéria, com legenda e crédito. Uma foto só (não galeria), num quadro 3:2
 * no celular e mais panorâmico em telas largas (o texto não fica abaixo da dobra); legenda e,
 * abaixo dela, o crédito em texto miúdo. Foto paisagem preenche o quadro (`object-cover`); foto
 * em pé/quadrada aparece inteira (`object-contain`) sobre uma cópia desfocada dela mesma — o
 * quadro não muda de tamanho, então não há salto de layout quando a orientação é descoberta.
 */
export function ArticleFigure({ src, alt, caption, credit, priority = false }: ArticleFigureProps) {
  const hasCaption = Boolean(caption?.trim());
  const imgRef = useRef<HTMLImageElement>(null);
  const [tall, setTall] = useState(false);

  // A foto de capa costuma terminar de carregar antes da hidratação (o onLoad não dispara de novo).
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) setTall(isTall(img));
  }, [src]);

  return (
    <figure>
      <div className="relative overflow-hidden rounded-[var(--ui-radius-card-lg,1.5rem)] bg-muted">
        {tall ? (
          // eslint-disable-next-line @next/next/no-img-element -- fundo decorativo da própria foto
          <img
            src={src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl brightness-90"
          />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem servida pelo storage do app */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...(priority ? { fetchPriority: 'high' as const } : {})}
          onLoad={(e) => setTall(isTall(e.currentTarget))}
          className={`relative aspect-[3/2] w-full sm:aspect-[16/9] lg:aspect-[2/1] ${tall ? 'object-contain' : 'object-cover'}`}
        />
      </div>
      {hasCaption || credit ? (
        <figcaption className="mt-3 space-y-0.5 px-1">
          {hasCaption ? <p className="text-pretty text-sm leading-6 text-foreground/80">{caption!.trim()}</p> : null}
          {credit ? <CreditLine credit={credit} /> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
