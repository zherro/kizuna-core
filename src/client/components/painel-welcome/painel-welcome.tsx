'use client';

import Link from 'next/link';
import { ArrowRight, Flame, Heart, Plus, Search, Sparkles, UserCircle } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../../lib/utils';
import { fetchLiked } from '../swipe/swipe-api';
import { coverUrl } from '../swipe/swipe-cover';
import type { LikedItem } from '../swipe/swipe-types';

export type PainelWelcomeAdvertise = {
  href: string;
  /** Texto do botão (ex.: "Anunciar"). */
  label: string;
  title?: string;
  text?: string;
};

export type PainelWelcomeProps = {
  /** Nome de exibição; só o primeiro nome entra na saudação. Sem nome, a saudação não o cita. */
  name?: string | null;
  discoverHref?: string;
  likedHref?: string;
  searchHref?: string;
  accountHref?: string;
  /** Convite leve a anunciar. `null`/omitido não mostra a faixa. */
  advertise?: PainelWelcomeAdvertise | null;
  /** Tag do título principal. Default `h1`; use `h2` quando a página já tem um `h1`. */
  headingAs?: 'h1' | 'h2';
  /** Busca os favoritos (padrão `fetchLiked` do swipe). Injetável para showcase e testes. */
  fetchLikedItems?: (page: number, pageSize: number) => Promise<LikedItem[]>;
  className?: string;
};

const LIKED_LIMIT = 12;

const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const FOCUS_RING_ON_HERO =
  'outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-primary';

/** Primeiro nome de um nome de exibição; `null` quando vazio. */
export function firstName(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}

/**
 * Home do painel para quem navega (não só para quem anuncia): hero de descoberta com o baralho
 * de capas, faixa "Seus favoritos", atalhos e, opcionalmente, um convite discreto a anunciar.
 *
 * Os favoritos são buscados no navegador; erro ou 401 contam como lista vazia e nunca quebram a
 * tela. O hero é o único bloco com gradiente — o convite a anunciar fica em tom neutro de propósito.
 */
export function PainelWelcome({
  name,
  discoverHref = '/descobrir',
  likedHref = '/painel/favoritos',
  searchHref = '/busca',
  accountHref = '/painel/minha-conta',
  advertise = null,
  headingAs = 'h1',
  fetchLikedItems = fetchLiked,
  className,
}: PainelWelcomeProps) {
  const [items, setItems] = useState<LikedItem[] | null>(null);
  const fetchRef = useRef(fetchLikedItems);
  fetchRef.current = fetchLikedItems;

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => fetchRef.current(1, LIKED_LIMIT))
      .then((list) => {
        if (alive) setItems(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <Hero
        name={name}
        discoverHref={discoverHref}
        searchHref={searchHref}
        headingAs={headingAs}
        items={items}
      />
      <LikedStrip items={items} likedHref={likedHref} discoverHref={discoverHref} />
      <Shortcuts likedHref={likedHref} searchHref={searchHref} accountHref={accountHref} />
      {advertise ? <AdvertiseInvite advertise={advertise} /> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- hero */

function Hero({
  name,
  discoverHref,
  searchHref,
  headingAs,
  items,
}: {
  name?: string | null;
  discoverHref: string;
  searchHref: string;
  headingAs: 'h1' | 'h2';
  items: LikedItem[] | null;
}) {
  const headingId = useId();
  const Heading = headingAs;
  const first = firstName(name);

  return (
    <section
      aria-labelledby={headingId}
      className="relative isolate overflow-hidden rounded-[var(--ui-radius-card-lg,1.5rem)] gradient-hero p-6 text-background shadow-lg shadow-primary/20 sm:p-8 lg:p-10"
    >
      <div className="flex items-center justify-between gap-8">
        <div className="min-w-0 max-w-xl">
          <Heading
            id={headingId}
            className="text-balance font-display text-[clamp(2rem,5vw,3.25rem)] font-black leading-[1.04] tracking-[-0.025em]"
          >
            {first ? `Bora, ${first}?` : 'Bora descobrir?'}
          </Heading>
          <p className="mt-3 text-base text-background/90 sm:text-lg">
            Arraste, curta e salve o que você quer fazer na cidade.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={discoverHref}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-background/90 ${FOCUS_RING_ON_HERO}`}
            >
              Descobrir no swipe
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={searchHref}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-background/60 px-5 text-sm font-semibold text-background transition-colors hover:bg-background/15 ${FOCUS_RING_ON_HERO}`}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Pesquisar
            </Link>
          </div>
        </div>
        <CardDeck items={items} />
      </div>
    </section>
  );
}

type DeckSlot = { deg: number; x: number; z: string; Icon: typeof Flame };

/** Esquerda, centro (por cima), direita. Rotação final de cada cartão; começam mais abertos. */
const DECK: DeckSlot[] = [
  { deg: -8, x: -44, z: 'z-0', Icon: Heart },
  { deg: 0, x: 0, z: 'z-10', Icon: Flame },
  { deg: 8, x: 44, z: 'z-0', Icon: Sparkles },
];
const DECK_START_SPREAD = 2.6;
/** Capa usada em cada posição: a mais recente no centro, depois esquerda e direita. */
const DECK_COVER_INDEX = [1, 0, 2];

/**
 * Baralho decorativo (só sm+). Com favoritos usa as 3 capas mais recentes; senão cartões com
 * gradiente e ícone. Um único movimento na carga: os cartões assentam da rotação aberta para a
 * final em ~600ms (sem transição com movimento reduzido).
 */
function CardDeck({ items }: { items: LikedItem[] | null }) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setSettled(true);
      return;
    }
    const t = window.setTimeout(() => setSettled(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  const covers = (items ?? []).filter((i) => i.cover_file_id).slice(0, 3);

  return (
    <div aria-hidden="true" className="relative hidden h-52 w-56 shrink-0 sm:block">
      {DECK.map((slot, slotIndex) => {
        const cover = covers[DECK_COVER_INDEX[slotIndex]];
        const src = cover ? coverUrl(cover.cover_file_id, 'thumb') : null;
        const deg = settled ? slot.deg : slot.deg * DECK_START_SPREAD;
        return (
          <div
            key={slotIndex}
            className={`absolute inset-0 m-auto flex h-44 w-32 items-center justify-center overflow-hidden rounded-2xl border-2 border-background/70 bg-background/20 text-background shadow-xl shadow-foreground/20 transition-transform duration-[600ms] ease-out motion-reduce:transition-none ${slot.z}`}
            style={{ transform: `translateX(${slot.x}px) rotate(${deg}deg)` }}
          >
            {src ? (
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <slot.Icon className="h-9 w-9" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ favoritos */

function SectionHeader({ id, title, action }: { id: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={id} className="font-display text-xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      {action}
    </div>
  );
}

function LikedStrip({
  items,
  likedHref,
  discoverHref,
}: {
  items: LikedItem[] | null;
  likedHref: string;
  discoverHref: string;
}) {
  const headingId = useId();
  const loading = items === null;
  const empty = items !== null && items.length === 0;

  return (
    <section aria-labelledby={headingId} aria-busy={loading}>
      <SectionHeader
        id={headingId}
        title="Seus favoritos"
        action={
          empty ? null : (
            <Link
              href={likedHref}
              className={`-mr-3 inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-muted ${FOCUS_RING}`}
            >
              Ver todos
            </Link>
          )
        }
      />

      {items === null ? (
        <ul aria-hidden="true" className="-mx-4 flex gap-3 overflow-hidden px-4 sm:mx-0 sm:px-0">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="w-40 shrink-0 sm:w-44">
              <div className="aspect-[4/5] animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-[var(--ui-radius-card-lg,1.5rem)] border border-dashed border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Heart className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="pt-2.5 text-sm text-muted-foreground">
              Nada salvo ainda. Arraste no swipe e guarde o que curtir.
            </p>
          </div>
          <Link
            href={discoverHref}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 ${FOCUS_RING}`}
          >
            Ir para o swipe
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 sm:mx-0 sm:scroll-pl-0 sm:px-0">
          {items.map((item) => {
            const src = coverUrl(item.cover_file_id, 'thumb');
            return (
              <li key={item.uid} className="w-40 shrink-0 snap-start sm:w-44">
                <Link
                  href={`/anuncios/${item.uid}`}
                  className={`group block min-h-11 rounded-2xl ${FOCUS_RING}`}
                >
                  <span className="block aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-muted">
                    {src ? (
                      <img
                        src={src}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Heart className="h-8 w-8" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className="mt-2 line-clamp-2 block text-sm font-semibold leading-snug text-foreground group-hover:underline group-focus-visible:underline">
                    {item.title}
                  </span>
                  {item.category ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {item.category}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------- atalhos */

function Shortcuts({
  likedHref,
  searchHref,
  accountHref,
}: {
  likedHref: string;
  searchHref: string;
  accountHref: string;
}) {
  const tiles = [
    { href: likedHref, Icon: Heart, title: 'Meus favoritos', text: 'Tudo que você curtiu, num lugar só' },
    { href: searchHref, Icon: Search, title: 'Buscar na cidade', text: 'Serviços, eventos e lugares perto de você' },
    { href: accountHref, Icon: UserCircle, title: 'Meu perfil', text: 'Complete seu perfil e seja encontrado' },
  ];

  return (
    <nav aria-label="Atalhos do painel">
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {tiles.map(({ href, Icon, title, text }) => (
          <li key={title}>
            <Link
              href={href}
              className={`group flex h-full min-h-11 items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50 ${FOCUS_RING}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-foreground group-hover:text-primary">{title}</span>
                <span className="block text-sm text-muted-foreground">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------- anunciar */

function AdvertiseInvite({ advertise }: { advertise: PainelWelcomeAdvertise }) {
  const headingId = useId();
  const {
    href,
    label,
    title = 'Tem um negócio, evento ou serviço?',
    text = 'Divulgue para quem está procurando na cidade.',
  } = advertise;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-[var(--ui-radius-card-lg,1.5rem)] border border-dashed border-border bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="min-w-0">
        <h2 id={headingId} className="font-display text-lg font-bold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
      <Link
        href={href}
        className={`inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border border-primary px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 sm:self-auto ${FOCUS_RING}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {label}
      </Link>
    </section>
  );
}
