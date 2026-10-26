'use client';

import Link from 'next/link';
import { Newspaper } from 'lucide-react';
import { useId, useState, useSyncExternalStore } from 'react';
import { NewsTags } from './news-tags';
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

export type { NewsHighlightItem } from './news-highlights-format';
export { kickerHue, kickerTone, parseNewsDate, formatNewsRelative } from './news-highlights-format';

export type NewsHighlightsProps = {
  /** Os primeiros `leadCount` itens são as manchetes; os seguintes (até `listLimit`) viram a lista ao lado. */
  items: NewsHighlightItem[];
  title?: string;
  /** Destino do "Ver todas" (ex.: a busca filtrada pelo grupo de notícias). Sem ele, sem link. */
  moreHref?: string;
  moreLabel?: string;
  /** Quantas notícias na lista além das manchetes. Default 5. */
  listLimit?: number;
  /** Manchetes em destaque: 1 (grande, padrão) ou 2 (lado a lado no espaço da manchete; no celular
   * empilham). Com 2, peça `2 + listLimit` itens a quem carrega. */
  leadCount?: 1 | 2;
  /** Fuso das datas exibidas. Default `America/Sao_Paulo`. */
  timeZone?: string;
  /** aplica o container da home (max-w-[1600px]). Default true. */
  contained?: boolean;
  className?: string;
};

/* ---------- "agora" sem hydration mismatch ----------
 * Servidor e hidratação usam o snapshot do servidor (`null`) → data absoluta, idêntica nos dois
 * lados. Logo depois o React troca pro snapshot do cliente (minuto atual) → tempo relativo, que
 * se atualiza sozinho a cada minuto. */
const subscribeMinute = (onChange: () => void) => {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
};
const currentMinute = () => Math.floor(Date.now() / 60_000);
const serverMinute = () => null;

function useNowMinute(): number | null {
  return useSyncExternalStore(subscribeMinute, currentMinute, serverMinute);
}

function NewsTime({
  value,
  timeZone,
  className,
}: {
  value: NewsHighlightItem['publishedAt'];
  timeZone: string;
  className?: string;
}) {
  const minute = useNowMinute();
  const date = parseNewsDate(value, timeZone);
  if (!date) return null;
  const label =
    minute == null ? formatNewsAbsolute(date, timeZone) : formatNewsRelative(date, minute * 60_000, timeZone);
  return (
    <time dateTime={date.toISOString()} title={formatNewsFull(date, timeZone)} className={className}>
      {label}
    </time>
  );
}

function ItemTags({ item, className = '' }: { item: NewsHighlightItem; className?: string }) {
  return <NewsTags group={item.group} category={item.category?.trim() || item.kicker} className={className} />;
}

/** Imagem com fallback: sem `src` (ou se ela falhar) mostra um painel no matiz do chapéu. */
function NewsImage({
  src,
  kicker,
  size,
  className = '',
}: {
  src?: string | null;
  kicker: string;
  size: 'lead' | 'thumb';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const tone = kickerTone(kicker);
  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={`relative flex items-center justify-center overflow-hidden ${className}`}
        style={{ background: tone.wash }}
      >
        {size === 'lead' ? (
          <span
            className="pointer-events-none absolute -bottom-[0.18em] left-4 select-none whitespace-nowrap font-display text-[clamp(5rem,14vw,11rem)] font-black leading-none opacity-[0.16]"
            style={{ color: tone.solid }}
          >
            {kicker}
          </span>
        ) : null}
        <Newspaper
          className={size === 'lead' ? 'relative h-10 w-10 opacity-50' : 'h-6 w-6 opacity-60'}
          style={{ color: tone.text }}
        />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL de storage do app, sem loader do next/image
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

function Lead({ item, timeZone }: { item: NewsHighlightItem; timeZone: string }) {
  return (
    <article className="min-w-0 @4xl:col-span-7">
      <Link
        href={item.href}
        className="group block rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      >
        <span className="block overflow-hidden rounded-3xl bg-muted">
          <NewsImage
            src={item.image}
            kicker={item.kicker}
            size="lead"
            className="aspect-[16/10] w-full transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.03] @4xl:aspect-[3/2]"
          />
        </span>
        {/* a "tira" de papel sobre a foto: o elemento de assinatura do bloco */}
        <span className="relative -mt-12 mx-3 block rounded-2xl border border-border bg-card p-5 shadow-[0_18px_40px_-24px_color-mix(in_oklch,var(--foreground)_45%,transparent)] @md:-mt-20 @md:mx-6 @md:p-7 @4xl:mr-10">
          <span className="flex items-center justify-between gap-3">
            <ItemTags item={item} />
            <NewsTime value={item.publishedAt} timeZone={timeZone} className="shrink-0 text-xs text-muted-foreground" />
          </span>
          <h3 className="mt-3 text-balance font-display text-[1.65rem] font-black leading-[1.08] tracking-tight text-[var(--foreground-display)] decoration-2 underline-offset-[6px] group-hover:underline @md:text-[2.1rem] @6xl:text-[2.5rem]">
            {item.title}
          </h3>
          {item.summary ? (
            <p className="mt-3 line-clamp-3 max-w-[62ch] text-[0.95rem] leading-relaxed text-muted-foreground @md:text-base">
              {item.summary}
            </p>
          ) : null}
        </span>
      </Link>
    </article>
  );
}

/** Uma das duas manchetes lado a lado: o cartão é o próprio container, então título e "tira"
 * escalam pela largura dele (e não da seção); a foto fica 4:3 para a dupla não passar da lista. */
function PairLead({ item, timeZone }: { item: NewsHighlightItem; timeZone: string }) {
  return (
    <article className="@container flex min-w-0 flex-col">
      <Link
        href={item.href}
        className="group flex flex-1 flex-col rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      >
        {/* A proporção é o mínimo; ao lado da lista (grid esticado) a foto cresce até a altura dela,
            sem deixar faixa vazia embaixo da dupla. */}
        <span className="relative block flex-1 overflow-hidden rounded-3xl bg-muted">
          <span aria-hidden="true" className="block aspect-[16/10] @sm:aspect-[4/3]" />
          <NewsImage
            src={item.image}
            kicker={item.kicker}
            size="lead"
            className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.03]"
          />
        </span>
        <span className="relative -mt-10 mx-3 block rounded-2xl border border-border bg-card p-5 shadow-[0_18px_40px_-24px_color-mix(in_oklch,var(--foreground)_45%,transparent)] @sm:-mt-14 @sm:mx-4 @md:p-6">
          <span className="flex items-center justify-between gap-3">
            <ItemTags item={item} />
            <NewsTime value={item.publishedAt} timeZone={timeZone} className="shrink-0 text-xs text-muted-foreground" />
          </span>
          <h3 className="mt-3 text-balance font-display text-[1.45rem] font-black leading-[1.1] tracking-tight text-[var(--foreground-display)] decoration-2 underline-offset-[6px] group-hover:underline @md:text-[1.7rem]">
            {item.title}
          </h3>
          {item.summary ? (
            <p className="mt-2.5 line-clamp-3 text-[0.95rem] leading-relaxed text-muted-foreground">{item.summary}</p>
          ) : null}
        </span>
      </Link>
    </article>
  );
}

function Row({ item, index, timeZone }: { item: NewsHighlightItem; index: number; timeZone: string }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={item.href}
        className="group -mx-2 flex min-h-[44px] items-start gap-3 rounded-xl px-2 py-4 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring @md:gap-4"
      >
        <span
          aria-hidden="true"
          className="w-7 shrink-0 pt-0.5 text-right font-display text-[1.9rem] font-black leading-none tabular-nums text-muted-foreground/35 transition-colors group-hover:text-foreground/70"
        >
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <ItemTags item={item} />
          <span className="mt-2 line-clamp-3 font-display text-[1.05rem] font-bold leading-snug text-[var(--foreground-display)] decoration-1 underline-offset-4 group-hover:underline">
            {item.title}
          </span>
          <NewsTime value={item.publishedAt} timeZone={timeZone} className="mt-1.5 block text-xs text-muted-foreground" />
        </span>
        <span className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-muted @md:h-20 @md:w-20">
          <NewsImage src={item.image} kicker={item.kicker} size="thumb" className="h-full w-full" />
        </span>
      </Link>
    </li>
  );
}

/**
 * Bloco "Notícias" da home: manchete grande (foto + tira de papel sobreposta com chapéu, título,
 * resumo e tempo), ou duas lado a lado com `leadCount={2}`, ao lado de uma lista numerada das seguintes, em ordem de publicação. Contrato
 * puro — quem chama já entrega os itens ordenados (mais recente primeiro). Sem itens → `null`.
 */
export function NewsHighlights({
  items,
  title = 'Notícias',
  moreHref,
  moreLabel = 'Ver todas',
  listLimit = 5,
  leadCount = 1,
  timeZone = NEWS_DEFAULT_TIME_ZONE,
  contained = true,
  className,
}: NewsHighlightsProps) {
  const headingId = useId();
  const valid = items.filter((item) => item.href && item.title?.trim());
  if (valid.length === 0) return null;
  // Duas manchetes só quando há notícia para as duas; senão, a manchete única de sempre.
  const leads = valid.slice(0, leadCount === 2 && valid.length >= 2 ? 2 : 1);
  const list = valid.slice(leads.length, leads.length + Math.max(0, listLimit));

  const section = (
    <section aria-labelledby={headingId} className={`@container ${className ?? ''}`}>
      <SectionHeading
        id={headingId}
        title={title}
        action={moreHref ? <SectionHeadingLink href={moreHref}>{moreLabel}</SectionHeadingLink> : null}
      />

      <div className="grid grid-cols-1 gap-8 @4xl:grid-cols-12 @4xl:gap-10">
        {leads.length === 2 ? (
          <div className="grid min-w-0 grid-cols-1 gap-8 @2xl:grid-cols-2 @2xl:gap-6 @4xl:col-span-8">
            {leads.map((item) => (
              <PairLead key={item.href} item={item} timeZone={timeZone} />
            ))}
          </div>
        ) : (
          <Lead item={leads[0]} timeZone={timeZone} />
        )}
        {list.length > 0 ? (
          <nav
            aria-label={`Mais ${title.toLowerCase()}`}
            // com duas manchetes elas ganham 8 colunas: a lista (miniatura + título) cabe bem em 4
            className={`min-w-0 ${leads.length === 2 ? '@4xl:col-span-4' : '@4xl:col-span-5'}`}
          >
            <ol className="@2xl:grid @2xl:grid-cols-2 @2xl:gap-x-8 @4xl:block">
              {list.map((item, i) => (
                <Row key={`${item.href}-${i}`} item={item} index={i + 1} timeZone={timeZone} />
              ))}
            </ol>
          </nav>
        ) : null}
      </div>
    </section>
  );

  if (!contained) return section;
  return <div className="mx-auto w-full max-w-[1600px] px-4 pb-14 sm:px-6 sm:pb-16">{section}</div>;
}
