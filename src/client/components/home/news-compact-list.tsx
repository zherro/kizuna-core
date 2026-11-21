'use client';

import Link from 'next/link';
import { Newspaper } from 'lucide-react';
import { useId, useState, useSyncExternalStore } from 'react';
import { SectionHeading, SectionHeadingLink } from '../ui-better-soft/headers/section-heading';
import {
  NEWS_DEFAULT_TIME_ZONE,
  formatNewsAbsolute,
  formatNewsFull,
  formatNewsRelative,
  kickerTone,
  parseNewsDate,
  type NewsHighlightItem,
} from './news-highlights-format';

export type NewsCompactListProps = {
  /** Notícias já ordenadas (mais recente primeiro). Só as `limit` primeiras aparecem. */
  items: NewsHighlightItem[];
  title?: string;
  /** Destino do "Ver todas". Sem ele, sem link. */
  moreHref?: string;
  moreLabel?: string;
  /** Quantas linhas. Default 4. */
  limit?: number;
  /** Fuso das datas exibidas. Default `America/Sao_Paulo`. */
  timeZone?: string;
  /** aplica o container da home (max-w-[1280px], respiro embaixo). Default true. */
  contained?: boolean;
  className?: string;
};

/* "agora" sem hydration mismatch: servidor e hidratação mostram a data absoluta; depois o cliente
 * troca para o tempo relativo ("há 3 h"), atualizado a cada minuto. Mesmo esquema do `NewsHighlights`. */
const subscribeMinute = (onChange: () => void) => {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
};
const currentMinute = () => Math.floor(Date.now() / 60_000);
const serverMinute = () => null;

function CompactTime({ value, timeZone }: { value: NewsHighlightItem['publishedAt']; timeZone: string }) {
  const minute = useSyncExternalStore(subscribeMinute, currentMinute, serverMinute);
  const date = parseNewsDate(value, timeZone);
  if (!date) return null;
  const label =
    minute == null ? formatNewsAbsolute(date, timeZone) : formatNewsRelative(date, minute * 60_000, timeZone);
  return (
    <time dateTime={date.toISOString()} title={formatNewsFull(date, timeZone)} className="text-xs text-muted-foreground">
      {label}
    </time>
  );
}

/** Miniatura 64px (lazy, com tamanho fixo — sem salto de layout). Sem imagem: painel no matiz do chapéu. */
function Thumb({ src, kicker }: { src?: string | null; kicker: string }) {
  const [failed, setFailed] = useState(false);
  const box = 'h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted';
  if (!src || failed) {
    const tone = kickerTone(kicker);
    return (
      <span aria-hidden="true" className={`${box} flex items-center justify-center`} style={{ background: tone.wash }}>
        <Newspaper className="h-5 w-5 opacity-60" style={{ color: tone.text }} />
      </span>
    );
  }
  return (
    <span className={box}>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL de storage do app (miniatura), sem loader do next/image */}
      <img
        src={src}
        alt=""
        width={64}
        height={64}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

/**
 * Notícias em lista compacta: miniatura pequena à esquerda, título (até 2 linhas) e data. Feita
 * para o celular — 4 itens cabem em ~1 tela; a partir de containers largos vira 2 colunas.
 * Contrato puro: quem chama entrega os itens prontos e ordenados. Sem itens → `null`.
 */
export function NewsCompactList({
  items,
  title = 'Notícias',
  moreHref,
  moreLabel = 'Ver todas',
  limit = 4,
  timeZone = NEWS_DEFAULT_TIME_ZONE,
  contained = true,
  className,
}: NewsCompactListProps) {
  const headingId = useId();
  const valid = items.filter((item) => item.href && item.title?.trim()).slice(0, Math.max(0, limit));
  if (valid.length === 0) return null;

  const section = (
    <section aria-labelledby={headingId} className={`@container ${className ?? ''}`}>
      <SectionHeading
        id={headingId}
        title={title}
        className="mb-2"
        action={moreHref ? <SectionHeadingLink href={moreHref}>{moreLabel}</SectionHeadingLink> : null}
      />
      <ol className="@2xl:grid @2xl:grid-cols-2 @2xl:gap-x-8">
        {valid.map((item) => (
          <li key={item.href} className="border-b border-border last:border-b-0">
            <Link
              href={item.href}
              className="group -mx-2 flex min-h-[44px] items-center gap-3 rounded-xl px-2 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Thumb src={item.image} kicker={item.kicker} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 font-display text-[0.98rem] font-bold leading-snug text-[var(--foreground-display)] decoration-1 underline-offset-4 group-hover:underline">
                  {item.title}
                </span>
                <span className="mt-1 block">
                  <CompactTime value={item.publishedAt} timeZone={timeZone} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );

  if (!contained) return section;
  return <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 sm:px-6 sm:pb-16">{section}</div>;
}
