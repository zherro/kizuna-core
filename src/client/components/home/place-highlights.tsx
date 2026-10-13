import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { useId, type CSSProperties } from 'react';
import { placeTone, type PlaceTone } from './place-highlights-tone';

export type PlaceHighlightItem = {
  href: string;
  title: string;
  /** Grupo/categoria do lugar (ex.: "Shopping"). Vira o chapéu e decide a cor do card. */
  kicker: string;
  summary?: string;
  /** URL da foto; sem ela o card mostra o gradiente da cor do grupo. */
  image?: string | null;
  /** Linha curta de apoio (ex.: endereço, bairro). */
  meta?: string;
};

export type PlaceHighlightsProps = {
  items: PlaceHighlightItem[];
  title?: string;
  /** Com `moreHref`, o cabeçalho ganha o link "Ver todos". */
  moreHref?: string;
  moreLabel?: string;
  /** Aplica o container da home (max-w-[1600px]). Default true. */
  contained?: boolean;
  className?: string;
};

const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * "Lugares da cidade" — bloco de engajamento da home: o primeiro lugar em destaque (foto
 * full-bleed, gradiente, chapéu, título e resumo) e os demais num índice ao lado: carrossel com
 * scroll-snap no celular, grade de 2 colunas no tablet e lista com miniatura no desktop.
 *
 * Contrato puro de dados (sem fetch): quem monta busca os lugares e entrega `items` prontos.
 * O chapéu de cada card tem a cor do grupo (`placeTone`, determinística pelo texto).
 * Sem itens, não renderiza nada.
 */
export function PlaceHighlights({
  items,
  title = 'Lugares da cidade',
  moreHref,
  moreLabel = 'Ver todos',
  contained = true,
  className,
}: PlaceHighlightsProps) {
  const headingId = useId();
  if (items.length === 0) return null;

  const [featured, ...rest] = items;
  const sectionClass = [
    contained ? 'mx-auto w-full max-w-[1600px] px-4 sm:px-6' : '',
    'pb-12',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section aria-labelledby={headingId} className={sectionClass}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-5 w-1 shrink-0 rounded-full"
            style={{ backgroundImage: placeTone(featured.kicker).wash }}
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

      <div
        className={
          rest.length > 0
            ? 'grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-8'
            : 'grid'
        }
      >
        <FeaturedPlace item={featured} />
        {rest.length > 0 ? (
          <ul
            className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:flex lg:flex-col lg:gap-1 [&::-webkit-scrollbar]:hidden"
          >
            {rest.map((item) => (
              <li key={item.href} className="w-[76%] shrink-0 snap-start sm:w-auto">
                <PlaceIndexCard item={item} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function toneVars(tone: PlaceTone): CSSProperties {
  return { '--place-ink': tone.ink, '--place-solid': tone.solid } as CSSProperties;
}

/** Foto do lugar, ou o gradiente do grupo com um pino quando não há foto. */
function PlaceImage({ item, tone, large }: { item: PlaceHighlightItem; tone: PlaceTone; large?: boolean }) {
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
        className={`absolute text-white/85 ${large ? 'right-[22%] top-[22%] h-20 w-20' : 'left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2'}`}
      />
    </div>
  );
}

function Kicker({ text, onPhoto }: { text: string; onPhoto?: boolean }) {
  if (onPhoto) {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--place-solid)] px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-white">
        {text}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-[var(--place-ink)]">
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-[2px] bg-[var(--place-solid)]" />
      {text}
    </span>
  );
}

function FeaturedPlace({ item }: { item: PlaceHighlightItem }) {
  const tone = placeTone(item.kicker);
  return (
    <Link
      href={item.href}
      style={toneVars(tone)}
      className={`group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl bg-muted shadow-lg shadow-black/10 transition-transform active:scale-[0.995] motion-reduce:active:scale-100 sm:aspect-[16/10] lg:aspect-auto lg:min-h-[32rem] ${FOCUS_RING}`}
    >
      <PlaceImage item={item} tone={tone} large />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to top, rgb(0 0 0 / 0.86) 0%, rgb(0 0 0 / 0.55) 38%, rgb(0 0 0 / 0.08) 72%, transparent 100%)',
        }}
      />
      <div className="relative z-10 p-5 sm:p-8">
        <Kicker text={item.kicker} onPhoto />
        <h3 className="mt-3 max-w-[18ch] text-balance font-display text-[clamp(1.85rem,4.2vw,3.25rem)] font-black leading-[1.02] tracking-[-0.025em] text-white decoration-2 underline-offset-[6px] group-hover:underline group-focus-visible:underline">
          {item.title}
        </h3>
        {item.summary ? (
          <p className="mt-3 line-clamp-3 max-w-[52ch] text-sm leading-6 text-white/85 sm:text-base sm:leading-7">
            {item.summary}
          </p>
        ) : null}
        {item.meta ? (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-white/70">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{item.meta}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function PlaceIndexCard({ item }: { item: PlaceHighlightItem }) {
  const tone = placeTone(item.kicker);
  return (
    <Link
      href={item.href}
      style={toneVars(tone)}
      className={`group flex h-full min-h-11 flex-col gap-3 rounded-2xl transition-colors active:bg-muted lg:flex-row lg:items-center lg:gap-4 lg:p-2.5 lg:hover:bg-muted/70 ${FOCUS_RING}`}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-muted lg:aspect-square lg:w-24">
        <PlaceImage item={item} tone={tone} />
      </div>
      <div className="min-w-0 px-0.5 pb-1 lg:px-0 lg:pb-0">
        <Kicker text={item.kicker} />
        <h3 className="mt-2 line-clamp-2 font-display text-lg font-bold leading-snug tracking-tight text-foreground decoration-[var(--place-solid)] decoration-2 underline-offset-4 group-hover:underline group-focus-visible:underline">
          {item.title}
        </h3>
        {item.meta ? (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.meta}</p>
        ) : null}
      </div>
    </Link>
  );
}
