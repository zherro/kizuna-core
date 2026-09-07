'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AppMessages } from '@/i18n/messages';
import { HOME_CATEGORIES } from './mock-data';

type HomeMessages = AppMessages['home'];

export function CategoryRail({
  t,
  variant = 'classic',
}: {
  t: HomeMessages;
  variant?: 'classic' | 'compact';
}) {
  if (variant === 'compact') return <CategoryRailCompact t={t} />;
  return <CategoryRailClassic t={t} />;
}

/** Carrossel enxuto: cards verticais pequenos (ícone em círculo + label). */
function CategoryRailCompact({ t }: { t: HomeMessages }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-lg font-bold tracking-tight text-foreground">{t.categoriesTitle}</h2>
        <Link
          href="/busca"
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t.categoriesAll}
        </Link>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {HOME_CATEGORIES.map(({ slug, label, Icon }) => (
          <Link
            key={slug}
            href={`/busca?q=${encodeURIComponent(label)}`}
            className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card py-3 text-center transition-transform active:scale-95"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-semibold text-foreground">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CategoryRailClassic({ t }: { t: HomeMessages }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  const nudge = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em] text-foreground">
          {t.categoriesTitle}
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href="/busca"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t.categoriesAll}
          </Link>
          <div className="hidden gap-1 sm:flex">
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => nudge(-1)}
              disabled={atStart}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-opacity disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Proximo"
              onClick={() => nudge(1)}
              disabled={atEnd}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-opacity disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {HOME_CATEGORIES.map(({ slug, label, count, Icon }) => (
          <Link
            key={slug}
            href={`/busca?q=${encodeURIComponent(label)}`}
            className="group flex min-w-[200px] snap-start flex-col gap-4 rounded-2xl border border-border/70 bg-muted/50 p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-medium leading-snug text-foreground">{label}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {count} profissionais
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
