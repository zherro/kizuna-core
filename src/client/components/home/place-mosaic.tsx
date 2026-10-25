'use client';

import Link from 'next/link';
import { MapPin, Shuffle, X } from 'lucide-react';
import { useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { PlaceHighlightItem } from './place-highlights';
import { normalizePlaceKicker, placeTone, type PlaceTone } from './place-highlights-tone';
import {
  bentoTileKind,
  columnTileHeight,
  pickSurprise,
  resolveMosaicVariant,
  stripTileIsWide,
  uniqueKickers,
  type BentoTileKind,
  type PlaceMosaicVariant,
  type PlaceMosaicVariantProp,
} from './place-mosaic-layout';

export type { PlaceHighlightItem as PlaceMosaicItem } from './place-highlights';
export {
  mosaicDaySeed,
  resolveMosaicVariant,
  columnTileHeight,
  bentoTileKind,
  pickSurprise,
  type PlaceMosaicVariant,
  type PlaceMosaicVariantProp,
} from './place-mosaic-layout';

/** Todos os textos do bloco, para o projeto traduzir. Faltou algum → cai no pt-BR. */
export type PlaceMosaicLabels = {
  all?: string;
  surprise?: string;
  /** aria-label do grupo de chips. */
  filterBy?: string;
  /** Prefixo do aviso após o sorteio ("Sorteado: Nome"). */
  drawn?: string;
  /** Texto do link do aviso. */
  open?: string;
  close?: string;
};

const DEFAULT_LABELS: Required<PlaceMosaicLabels> = {
  all: 'Todos',
  surprise: 'Surpreenda-me',
  filterBy: 'Filtrar por tipo de lugar',
  drawn: 'Sorteado',
  open: 'Abrir lugar',
  close: 'Fechar',
};

export type PlaceMosaicProps = {
  items: PlaceHighlightItem[];
  /** `auto` escolhe a variante pela contagem e pela `seed` (determinístico). Default `auto`. */
  variant?: PlaceMosaicVariantProp;
  /** Semente do `auto` (ex.: `mosaicDaySeed()` calculado no servidor, para girar a cada dia). */
  seed?: string;
  title?: string;
  moreHref?: string;
  moreLabel?: string;
  /** Máximo de lugares exibidos (aplicado antes dos chips). */
  limit?: number;
  /** Aplica o container da home (max-w-[1600px]). Default true. */
  contained?: boolean;
  className?: string;
  labels?: PlaceMosaicLabels;
};

const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Só anima se o usuário não pediu movimento reduzido (e há matchMedia: SSR/jsdom → sem animação). */
function canAnimate(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * "Lugares da cidade" em mosaico — três arranjos (bento, colunas, faixas) para a home, com chips
 * de grupo que filtram, resumo sobre a foto no hover/foco e o botão "Surpreenda-me".
 *
 * "Surpreenda-me": em vez de navegar direto (um clique que tira o visitante da home sem aviso),
 * sorteia entre os lugares do filtro atual, rola até a peça e a destaca com um anel; um aviso
 * fixo no rodapé traz o link "Abrir lugar". O visitante vê o sorteado no contexto, pode sortear
 * de novo (nunca repete o anterior) e só navega se quiser.
 *
 * Contrato puro de dados (sem fetch). Sem itens, não renderiza nada.
 */
export function PlaceMosaic({
  items,
  variant = 'auto',
  seed = '',
  title = 'Lugares da cidade',
  moreHref,
  moreLabel = 'Ver todos',
  limit,
  contained = true,
  className,
  labels,
}: PlaceMosaicProps) {
  const headingId = useId();
  const text = { ...DEFAULT_LABELS, ...labels };
  const shown = useMemo(() => (limit && limit > 0 ? items.slice(0, limit) : items), [items, limit]);
  const kickers = useMemo(() => uniqueKickers(shown), [shown]);

  const [active, setActive] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [drawnHref, setDrawnHref] = useState<string | null>(null);
  const tiles = useRef(new Map<string, HTMLElement>());

  if (shown.length === 0) return null;

  const activeKey = active && kickers.some((k) => k.key === active) ? active : null;
  const visible = activeKey
    ? shown.filter((i) => normalizePlaceKicker(i.kicker) === activeKey)
    : shown;
  const resolved = resolveMosaicVariant(variant, visible.length, seed);
  const drawn = drawnHref ? (visible.find((i) => i.href === drawnHref) ?? null) : null;

  function selectFilter(key: string | null) {
    if (key === activeKey) return;
    setDrawnHref(null);
    if (!canAnimate()) {
      setActive(key);
      return;
    }
    setSwapping(true);
    window.setTimeout(() => {
      setActive(key);
      setSwapping(false);
    }, 140);
  }

  function surprise() {
    const pick = pickSurprise(visible, Math.random, drawnHref);
    if (!pick) return;
    setDrawnHref(pick.href);
    const el = tiles.current.get(pick.href);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({
        behavior: canAnimate() ? 'smooth' : 'auto',
        block: 'center',
        inline: 'center',
      });
    }
  }

  const registerTile = (href: string) => (el: HTMLElement | null) => {
    if (el) tiles.current.set(href, el);
    else tiles.current.delete(href);
  };

  const sectionClass = [
    '@container',
    contained ? 'mx-auto w-full max-w-[1600px] px-4 sm:px-6' : '',
    'pb-12',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const headTone = placeTone((visible[0] ?? shown[0]).kicker);

  return (
    <section aria-labelledby={headingId} className={sectionClass}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-5 w-1 shrink-0 rounded-full"
            style={{ backgroundImage: headTone.wash }}
          />
          <h2 id={headingId} className="font-display text-xl font-black leading-tight tracking-tight">
            {title}
          </h2>
        </div>
        {moreHref ? (
          <Link
            href={moreHref}
            className={`-mr-3 inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-muted ${FOCUS_RING}`}
          >
            {moreLabel}
          </Link>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {kickers.length > 1 ? (
          <div
            role="group"
            aria-label={text.filterBy}
            className={`flex min-w-0 gap-2 overflow-x-auto py-1 @2xl:w-auto @2xl:flex-1 ${contained ? '-mx-4 w-[calc(100%+2rem)] px-4 @2xl:mx-0' : 'w-full'} [scrollbar-width:none] @2xl:flex-wrap @2xl:overflow-visible @2xl:px-0 [&::-webkit-scrollbar]:hidden`}
          >
            <Chip pressed={activeKey === null} onClick={() => selectFilter(null)}>
              {text.all}
            </Chip>
            {kickers.map((k) => (
              <Chip
                key={k.key}
                pressed={activeKey === k.key}
                tone={placeTone(k.label)}
                onClick={() => selectFilter(k.key)}
              >
                {k.label}
              </Chip>
            ))}
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <button
          type="button"
          onClick={surprise}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-transform active:scale-95 motion-reduce:active:scale-100 ${FOCUS_RING}`}
        >
          <Shuffle aria-hidden="true" className="h-4 w-4" />
          {text.surprise}
        </button>
      </div>

      <div
        className={`transition-opacity duration-150 motion-reduce:transition-none ${swapping ? 'opacity-0' : 'opacity-100'}`}
      >
        <Mosaic
          variant={resolved}
          items={visible}
          drawnHref={drawnHref}
          registerTile={registerTile}
          contained={contained}
        />
      </div>

      {drawn ? (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[calc(var(--mobile-tab-h,0px)+4.25rem)] z-30 mx-auto flex md:bottom-4 max-w-md items-center gap-1 rounded-2xl bg-foreground py-1.5 pl-4 pr-1.5 text-background shadow-xl shadow-black/25"
        >
          <p className="min-w-0 flex-1 text-sm leading-tight">
            <span className="block text-xs opacity-70">{text.drawn}</span>
            <span className="block truncate font-semibold">{drawn.title}</span>
          </p>
          <Link
            href={drawn.href}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-xl bg-background px-4 text-sm font-semibold text-foreground ${FOCUS_RING}`}
          >
            {text.open}
          </Link>
          <button
            type="button"
            aria-label={text.close}
            onClick={() => setDrawnHref(null)}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${FOCUS_RING}`}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Chip({
  pressed,
  tone,
  onClick,
  children,
}: {
  pressed: boolean;
  tone?: PlaceTone;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      style={tone ? ({ '--place-solid': tone.solid } as CSSProperties) : undefined}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors ${FOCUS_RING} ${
        pressed
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-card text-foreground hover:bg-muted'
      }`}
    >
      {tone ? (
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-[2px] ${pressed ? 'bg-background' : 'bg-[var(--place-solid)]'}`}
        />
      ) : null}
      {children}
    </button>
  );
}

type RegisterTile = (href: string) => (el: HTMLElement | null) => void;

const BENTO_CELL: Record<BentoTileKind, string> = {
  hero: 'col-span-2 row-span-2 @2xl:row-span-3',
  wide: 'col-span-2',
  tall: 'row-span-2',
  small: '',
};

const COLUMN_ASPECT = { short: 'aspect-[4/3]', medium: 'aspect-square', tall: 'aspect-[3/4]' } as const;

function Mosaic({
  variant,
  items,
  drawnHref,
  registerTile,
  contained,
}: {
  variant: PlaceMosaicVariant;
  items: PlaceHighlightItem[];
  drawnHref: string | null;
  registerTile: RegisterTile;
  contained: boolean;
}) {
  if (variant === 'bento') {
    return (
      <ul className="grid auto-rows-[9rem] grid-flow-dense grid-cols-2 gap-2.5 @2xl:auto-rows-[10rem] @2xl:grid-cols-4 @2xl:gap-3 @5xl:auto-rows-[11.5rem]">
        {items.map((item, i) => {
          const kind = bentoTileKind(i);
          const big = kind === 'hero' || kind === 'wide';
          return (
            <li key={item.href} ref={registerTile(item.href)} className={`min-h-0 ${BENTO_CELL[kind]}`}>
              <Tile
                item={item}
                size={kind === 'hero' ? 'lg' : big ? 'md' : 'sm'}
                summary={big ? 'always' : 'hover'}
                drawn={drawnHref === item.href}
                className="h-full"
              />
            </li>
          );
        })}
      </ul>
    );
  }

  if (variant === 'columns') {
    return (
      <ul className="columns-2 gap-2.5 @2xl:columns-3 @2xl:gap-3 @5xl:columns-4">
        {items.map((item) => {
          const height = columnTileHeight(item.title);
          return (
            <li key={item.href} ref={registerTile(item.href)} className="mb-2.5 break-inside-avoid @2xl:mb-3">
              <Tile
                item={item}
                size={height === 'tall' ? 'md' : 'sm'}
                summary={height === 'tall' ? 'always' : 'hover'}
                drawn={drawnHref === item.href}
                className={COLUMN_ASPECT[height]}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul
      className={`flex snap-x snap-mandatory gap-2.5 overflow-x-auto py-2 [scrollbar-width:none] @3xl:grid @3xl:grid-cols-4 @3xl:gap-3 @3xl:overflow-visible @3xl:px-0 @3xl:py-0 [&::-webkit-scrollbar]:hidden ${
        contained ? '-mx-4 scroll-px-4 px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 @3xl:mx-0' : ''
      }`}
    >
      {items.map((item, i) => {
        const wide = stripTileIsWide(i);
        return (
          <li
            key={item.href}
            ref={registerTile(item.href)}
            className={`w-[72%] shrink-0 snap-start @xl:w-[44%] @3xl:w-auto ${wide ? '@3xl:col-span-2' : ''}`}
          >
            <Tile
              item={item}
              size={wide ? 'md' : 'sm'}
              summary={wide ? 'desktop' : 'hover'}
              drawn={drawnHref === item.href}
              className="aspect-[4/5] @3xl:aspect-auto @3xl:h-72"
            />
          </li>
        );
      })}
    </ul>
  );
}

type SummaryMode = 'always' | 'hover' | 'desktop';

/**
 * Resumo/meta sobre a foto. `always`: visível no touch e revelado no hover/foco em telas com
 * ponteiro; `hover`: só existe em telas com ponteiro (some no touch); `desktop`: como `always`,
 * mas só a partir de @3xl (no carrossel do celular fica oculto).
 */
const SUMMARY_BASE =
  'grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none [@media(hover:hover)]:grid-rows-[0fr] [@media(hover:hover)]:group-hover:grid-rows-[1fr] [@media(hover:hover)]:group-focus-visible:grid-rows-[1fr]';
const SUMMARY_CLASS: Record<SummaryMode, string> = {
  always: `${SUMMARY_BASE} grid-rows-[1fr]`,
  desktop: `hidden @3xl:grid ${SUMMARY_BASE} grid-rows-[1fr]`,
  hover: `hidden [@media(hover:hover)]:grid ${SUMMARY_BASE}`,
};

function toneVars(tone: PlaceTone): CSSProperties {
  return { '--place-ink': tone.ink, '--place-solid': tone.solid } as CSSProperties;
}

function Tile({
  item,
  size,
  summary,
  drawn,
  className,
}: {
  item: PlaceHighlightItem;
  size: 'lg' | 'md' | 'sm';
  summary: SummaryMode;
  drawn: boolean;
  className?: string;
}) {
  const tone = placeTone(item.kicker);
  const hasMore = Boolean(item.summary || item.meta);
  const titleClass =
    size === 'lg'
      ? 'text-[clamp(1.4rem,5vw,2.4rem)] leading-[1.04] tracking-[-0.02em] line-clamp-4'
      : size === 'md'
        ? 'text-lg leading-tight tracking-tight line-clamp-3 @2xl:text-xl'
        : 'text-sm leading-snug line-clamp-3 @2xl:text-base';

  return (
    <Link
      href={item.href}
      style={toneVars(tone)}
      className={`group relative isolate flex w-full flex-col justify-end overflow-hidden rounded-2xl bg-muted transition-shadow ${FOCUS_RING} ${
        drawn ? 'ring-4 ring-[var(--place-solid)] ring-offset-2 ring-offset-background' : ''
      } ${className ?? ''}`}
    >
      <TileImage item={item} tone={tone} large={size === 'lg'} />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to top, rgb(0 0 0 / 0.82) 0%, rgb(0 0 0 / 0.5) 42%, rgb(0 0 0 / 0.06) 78%, transparent 100%)',
        }}
      />
      <div className="relative z-10 p-3 @2xl:p-4">
        <span className="inline-flex max-w-full items-center rounded-full bg-[var(--place-solid)] px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-white">
          <span className="truncate">{item.kicker}</span>
        </span>
        <h3
          className={`mt-2 text-balance font-display font-black text-white decoration-2 underline-offset-4 group-hover:underline group-focus-visible:underline ${titleClass}`}
        >
          {item.title}
        </h3>
        {hasMore ? (
          <div className={SUMMARY_CLASS[summary]}>
            <div className="overflow-hidden">
              {item.summary ? (
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/85 @2xl:line-clamp-3 @2xl:text-sm @2xl:leading-6">
                  {item.summary}
                </p>
              ) : null}
              {item.meta ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-white/70">
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-1">{item.meta}</span>
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function TileImage({ item, tone, large }: { item: PlaceHighlightItem; tone: PlaceTone; large?: boolean }) {
  if (item.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fotos estáticas do conteúdo, tamanhos variados
      <img
        src={item.image}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.04]"
      />
    );
  }
  return (
    <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: tone.wash }}>
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 70% 30%, transparent 0 18%, rgb(255 255 255 / 0.18) 18.5% 19%, transparent 19.5% 31%, rgb(255 255 255 / 0.12) 31.5% 32%, transparent 32.5%)',
        }}
      />
      <MapPin
        strokeWidth={1.25}
        className={`absolute text-white/85 ${large ? 'right-[18%] top-[16%] h-16 w-16' : 'right-[14%] top-[14%] h-7 w-7'}`}
      />
    </div>
  );
}
