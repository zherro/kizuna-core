'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Info, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useAuth } from '../../providers/auth-provider';
import { getStoredLocation } from '../../hooks/use-user-location';
import { LocationGate } from '../search/location-gate';
import { SearchFiltersPanel } from '../search/search-filters-panel';
import { useSearchFilters } from '../search/use-search-filters';
import type { ServiceResult } from '../search/search-types';
import { RequireAuthProvider, consumePendingAuthAction, useRequireAuth } from '../auth/require-auth';
import { SwipeCard, coverUrl } from './swipe-card';
import { useSwipeDeck } from './use-swipe-deck';
import { recordSwipe } from './swipe-api';
import { clearAnonSkips, readAnonSkips } from './anon-skips';

type Props = { basePath?: string; likedHref?: string };

export function SwipePage(props: Props) {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>}>
      <LocationGate>
        <RequireAuthProvider>
          <SwipePageInner {...props} />
        </RequireAuthProvider>
      </LocationGate>
    </Suspense>
  );
}

const THRESHOLD = 110;

function SwipePageInner({ basePath = '/descobrir', likedHref = '/curtidos' }: Props) {
  const stored = getStoredLocation();
  const location = useMemo(
    () => ({
      state: stored?.stateCode ?? '',
      cityId: stored && stored.cityId > 0 ? stored.cityId : null,
      cityName: stored?.cityName ?? null,
    }),
    [stored]
  );
  const { filters, setFilters, resetFilters, toSearchAdsBody } = useSearchFilters(location, basePath);
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const router = useRouter();

  const baseBody = useMemo(() => {
    const { p_seed, p_page, p_page_size, ...rest } = toSearchAdsBody(0);
    void p_seed;
    void p_page;
    void p_page_size;
    // o /busca filtra preço no cliente; o deck manda a faixa pro SQL (e ela entra no filterKey)
    return { ...rest, p_price_min: filters.priceMin, p_price_max: filters.priceMax };
  }, [toSearchAdsBody, filters.priceMin, filters.priceMax]);
  const filterKey = JSON.stringify(baseBody);

  const { cards, loading, exhausted, error, decide, drop, reset } = useSwipeDeck({
    baseBody,
    filterKey,
    loggedIn: Boolean(user),
  });
  const current = cards[0];
  const next = cards[1];

  const [liked, setLiked] = useState<ServiceResult[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const resetDrag = () => {
    setDrag({ x: 0, y: 0, active: false });
    startRef.current = null;
  };

  const like = () => {
    const card = current;
    if (!card) return;
    requireAuth(() => {
      setLiked((prev) => [...prev, card]);
      // roda no sucesso do login pelo modal, antes do re-render com o usuário: força a gravação
      decide('like', { loggedIn: true });
    }, `like:${card.uid}`);
    resetDrag();
  };
  const skip = () => {
    decide('skip');
    resetDrag();
  };

  // Uma vez por transição anônimo → logado (inclui a hidratação do /api/auth/me depois de um
  // reload): migra os passados do anônimo e aplica a curtida pendente que sobreviveu ao reload
  // (sessionStorage), gravando pelo uid — independente de qual card está no topo agora.
  const wasLoggedIn = useRef(false);
  useEffect(() => {
    if (!user) {
      wasLoggedIn.current = false;
      return;
    }
    if (wasLoggedIn.current) return;
    wasLoggedIn.current = true;
    const skips = readAnonSkips();
    if (skips.length) {
      recordSwipe(skips, 'skip')
        .then(clearAnonSkips)
        .catch((err) => console.warn('[swipe] falha ao migrar passados', err));
    }
    const pending = consumePendingAuthAction();
    if (pending?.startsWith('like:')) {
      const uid = pending.slice('like:'.length);
      recordSwipe([uid], 'like').catch((err) => console.warn('[swipe] falha ao gravar curtida pendente', err));
      const card = drop(uid);
      if (card) setLiked((prev) => [...prev, card]);
    }
  }, [user, drop]);

  const activeFilters =
    (filters.groupSlug ? 1 : 0) +
    (filters.categoryId ? 1 : 0) +
    filters.subcategoryIds.length +
    (filters.query ? 1 : 0) +
    (filters.priceMin != null || filters.priceMax != null ? 1 : 0);

  const style = useMemo(
    () => ({
      transform: `translate(${drag.x}px, ${drag.y * 0.35}px) rotate(${drag.x / 22}deg)`,
      transition: drag.active ? 'none' : 'transform 250ms ease',
    }),
    [drag]
  );

  const handlers: React.DOMAttributes<HTMLElement> = {
    onPointerDown: (e) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      startRef.current = { x: e.clientX, y: e.clientY };
      setDrag({ x: 0, y: 0, active: true });
    },
    onPointerMove: (e) => {
      if (!startRef.current) return;
      setDrag({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y, active: true });
    },
    onPointerUp: () => {
      if (!startRef.current) return;
      if (drag.x > THRESHOLD) like();
      else if (drag.x < -THRESHOLD) skip();
      else resetDrag();
    },
    onPointerCancel: () => resetDrag(),
  };

  const likedLink = user ? (
    <Link href={likedHref} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
      Curtidos
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => requireAuth(() => router.push(likedHref))}
      className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"
    >
      Curtidos
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-8 pt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Descobrir</h1>
          <p className="text-xs text-muted-foreground">Arraste para o lado ou use os botões</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="relative inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
            {activeFilters > 0 ? (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {activeFilters}
              </span>
            ) : null}
          </button>
          {likedLink}
        </div>
      </div>

      <div className="relative mt-5 h-[460px] select-none">
        {loading && !current ? <div className="h-full animate-pulse rounded-3xl bg-muted" /> : null}

        {!loading && !current && error ? (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Não foi possível carregar.</p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <RotateCcw className="h-4 w-4" /> Tentar de novo
            </button>
          </div>
        ) : null}

        {!loading && !current && !error && exhausted ? (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-border bg-card p-6 text-center">
            <Heart className="h-8 w-8 text-primary" />
            <h2 className="mt-3 font-serif text-xl font-bold text-foreground">Acabou por aqui</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mude os filtros ou volte mais tarde para ver novidades.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground"
              >
                Limpar filtros
              </button>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <RotateCcw className="h-4 w-4" /> Recomeçar
              </button>
            </div>
          </div>
        ) : null}

        {next ? <SwipeCard item={next} className="scale-[0.96] opacity-70" /> : null}
        {current ? (
          <SwipeCard
            item={current}
            dragX={drag.x}
            style={style}
            handlers={handlers}
            className="cursor-grab touch-none shadow-xl active:cursor-grabbing"
          />
        ) : null}
      </div>

      {current ? (
        <div className="mt-6 flex items-center justify-center gap-5">
          <button
            aria-label="Passar"
            onClick={skip}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-destructive shadow-sm transition-transform active:scale-90"
          >
            <X className="h-6 w-6" />
          </button>
          <Link
            aria-label="Ver detalhes"
            href={`/anuncios/${current.uid}`}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
          >
            <Info className="h-5 w-5" />
          </Link>
          <button
            aria-label="Curtir"
            onClick={like}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-90"
          >
            <Heart className="h-6 w-6" />
          </button>
        </div>
      ) : null}

      {liked.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-foreground">Curtidos agora</h3>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {liked.map((e) => (
              <Link key={e.uid} href={`/anuncios/${e.uid}`} className="w-32 shrink-0">
                {coverUrl(e.cover_file_id) ? (
                  <img src={coverUrl(e.cover_file_id)!} alt={e.title} className="h-20 w-32 rounded-xl object-cover" loading="lazy" />
                ) : (
                  <div className="h-20 w-32 rounded-xl bg-muted" />
                )}
                <p className="mt-1 line-clamp-2 text-xs font-medium text-foreground">{e.title}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {filtersOpen ? (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/40"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setFiltersOpen(false);
          }}
        >
          <div className="h-full w-full max-w-sm overflow-y-auto bg-background p-5 shadow-xl">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                aria-label="Fechar filtros"
                onClick={() => setFiltersOpen(false)}
                className="rounded-full p-1.5 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SearchFiltersPanel filters={filters} setFilters={setFilters} resetFilters={resetFilters} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
