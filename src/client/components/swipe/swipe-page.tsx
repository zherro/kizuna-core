'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Info, RotateCcw, Tags, X } from 'lucide-react';
import { useAuth } from '../../providers/auth-provider';
import { getStoredLocation } from '../../hooks/use-user-location';
import { LocationGate } from '../search/location-gate';
import { useSearchFilters } from '../search/use-search-filters';
import type { ServiceResult } from '../search/search-types';
import { RequireAuthProvider, consumePendingAuthAction, useRequireAuth } from '../auth/require-auth';
import { SwipeCard, coverUrl } from './swipe-card';
import { useSwipeDeck } from './use-swipe-deck';
import { trackEvent } from '../../analytics/analytics-api';
import { recordSwipe } from './swipe-api';
import { loadSwipeTopics, saveSwipeTopics } from './swipe-topics';
import { SwipeTopicPicker } from './swipe-topic-picker';

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
const EXIT_MS = 200;

/** Altura útil no mobile (≤500px): viewport menos header global e barra inferior. */
const MOBILE_SHELL =
  'max-[500px]:h-[calc(100dvh-var(--kz-header-h,4rem)-var(--mobile-tab-h,0px))] max-[500px]:overflow-hidden max-[500px]:pb-0';

/** No mobile a página não rola (estilo Tinder): trava o scroll do documento enquanto montada. */
function useLockMobileScroll() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 500px)');
    const html = document.documentElement;
    const prev = html.style.overflow;
    const apply = () => {
      html.style.overflow = mq.matches ? 'hidden' : prev;
    };
    apply();
    mq.addEventListener?.('change', apply);
    return () => {
      mq.removeEventListener?.('change', apply);
      html.style.overflow = prev;
    };
  }, []);
}

function SwipePageInner({ basePath = '/descobrir', likedHref = '/curtidos' }: Props) {
  useLockMobileScroll();
  // undefined = ainda lendo o localStorage (evita divergência SSR/hidratação)
  const [topics, setTopics] = useState<string[] | null | undefined>(undefined);
  const [picking, setPicking] = useState(false);
  const [liked, setLiked] = useState<ServiceResult[]>([]);

  useEffect(() => {
    setTopics(loadSwipeTopics());
  }, []);

  if (topics === undefined) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-4">
        <div className="h-[420px] animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }
  if (topics === null || picking) {
    return (
      <div className={`mx-auto w-full max-w-md ${MOBILE_SHELL}`}>
        <SwipeTopicPicker
          initial={topics ?? []}
          onConfirm={(slugs) => {
            saveSwipeTopics(slugs);
            setTopics(slugs);
            setPicking(false);
          }}
          onCancel={topics !== null ? () => setPicking(false) : undefined}
        />
      </div>
    );
  }
  return (
    <SwipeDeckView
      key={topics.join('|')}
      topics={topics}
      basePath={basePath}
      likedHref={likedHref}
      liked={liked}
      setLiked={setLiked}
      onChangeTopics={() => setPicking(true)}
    />
  );
}

type DeckViewProps = {
  topics: string[];
  basePath: string;
  likedHref: string;
  liked: ServiceResult[];
  setLiked: React.Dispatch<React.SetStateAction<ServiceResult[]>>;
  onChangeTopics: () => void;
};

function SwipeDeckView({ topics, basePath, likedHref, liked, setLiked, onChangeTopics }: DeckViewProps) {
  const stored = getStoredLocation();
  const location = useMemo(
    () => ({
      state: stored?.stateCode ?? '',
      cityId: stored && stored.cityId > 0 ? stored.cityId : null,
      cityName: stored?.cityName ?? null,
    }),
    [stored]
  );
  // só para montar o corpo base (localização); filtros não são exibidos nem sincronizados na URL
  const { toSearchAdsBody } = useSearchFilters(location, basePath);
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const router = useRouter();

  const baseBody = useMemo(() => {
    const { p_seed, p_page, p_page_size, ...rest } = toSearchAdsBody(0);
    void p_seed;
    void p_page;
    void p_page_size;
    return { ...rest, p_group_slugs: topics, p_price_min: null, p_price_max: null };
  }, [toSearchAdsBody, topics]);
  const filterKey = JSON.stringify(baseBody);

  const { cards, loading, exhausted, error, decide, drop, reset } = useSwipeDeck({
    baseBody,
    filterKey,
    loggedIn: Boolean(user),
  });
  const current = cards[0];
  const next = cards[1];
  const afterNext = cards[2];

  // --- arraste: tudo por ref + rAF, sem setState a cada pointermove ---
  const cardRef = useRef<HTMLElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const paint = useCallback(() => {
    rafRef.current = null;
    const el = cardRef.current;
    if (!el) return;
    const { x, y } = posRef.current;
    el.style.transform = `translate3d(${x}px, ${y * 0.35}px, 0) rotate(${x / 22}deg)`;
    const likeEl = el.querySelector<HTMLElement>('[data-swipe-like]');
    const passEl = el.querySelector<HTMLElement>('[data-swipe-pass]');
    if (likeEl) likeEl.style.opacity = String(Math.max(0, Math.min(1, x / THRESHOLD)));
    if (passEl) passEl.style.opacity = String(Math.max(0, Math.min(1, -x / THRESHOLD)));
  }, []);
  const schedulePaint = useCallback(() => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(paint);
  }, [paint]);

  const snapBack = useCallback(() => {
    startRef.current = null;
    posRef.current = { x: 0, y: 0 };
    const el = cardRef.current;
    if (el) el.style.transition = 'transform 250ms ease';
    schedulePaint();
  }, [schedulePaint]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    []
  );

  const like = () => {
    const card = current;
    if (!card) return;
    requireAuth(() => {
      setLiked((prev) => [...prev, card]);
      // roda no sucesso do login pelo modal, antes do re-render com o usuário: força a gravação
      decide('like', { loggedIn: true });
    }, `like:${card.uid}`);
    snapBack();
  };
  const skip = () => {
    decide('skip');
    snapBack();
  };

  // Uma vez por transição anônimo → logado (inclui a hidratação do /api/auth/me depois de um
  // reload): aplica a curtida pendente que sobreviveu ao reload
  // (sessionStorage), gravando pelo uid — independente de qual card está no topo agora.
  const wasLoggedIn = useRef(false);
  useEffect(() => {
    if (!user) {
      wasLoggedIn.current = false;
      return;
    }
    if (wasLoggedIn.current) return;
    wasLoggedIn.current = true;
    const pending = consumePendingAuthAction();
    if (pending?.startsWith('like:')) {
      const uid = pending.slice('like:'.length);
      recordSwipe([uid], 'like').catch((err) => console.warn('[swipe] falha ao gravar curtida pendente', err));
      trackEvent({ entityType: 'service', entityId: uid, event: 'favorite', source: 'other' });
      const card = drop(uid);
      if (card) setLiked((prev) => [...prev, card]);
    }
  }, [user, drop, setLiked]);

  // Pré-carrega as capas dos próximos cards (o 1º já está no DOM por baixo do topo)
  const preloadKey = [next, afterNext].map((c) => c?.cover_file_id ?? '').join(',');
  useEffect(() => {
    if (typeof Image === 'undefined') return;
    for (const c of [next, afterNext]) {
      const url = c ? coverUrl(c.cover_file_id) : null;
      if (url) {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadKey]);

  // handlers estáveis: leem like/skip/user pela ref
  const actionsRef = useRef({ like, skip, loggedIn: Boolean(user) });
  actionsRef.current = { like, skip, loggedIn: Boolean(user) };

  const flyOut = useCallback(
    (dir: 1 | -1) => {
      const el = cardRef.current;
      const { like: doLike, skip: doSkip, loggedIn } = actionsRef.current;
      const commit = dir > 0 ? doLike : doSkip;
      // curtir anônimo abre o modal de login: o card volta em vez de sair
      if (!el || (dir > 0 && !loggedIn)) {
        commit();
        return;
      }
      busyRef.current = true;
      startRef.current = null;
      el.style.transition = `transform ${EXIT_MS}ms ease-out`;
      posRef.current = { x: dir * (window.innerWidth + 200), y: posRef.current.y };
      schedulePaint();
      exitTimer.current = setTimeout(() => {
        busyRef.current = false;
        commit();
      }, EXIT_MS);
    },
    [schedulePaint]
  );

  const handlers = useMemo<React.DOMAttributes<HTMLElement>>(
    () => ({
      onPointerDown: (e) => {
        if (busyRef.current) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        startRef.current = { x: e.clientX, y: e.clientY };
        posRef.current = { x: 0, y: 0 };
        const el = cardRef.current;
        if (el) el.style.transition = 'none';
      },
      onPointerMove: (e) => {
        const s = startRef.current;
        if (!s) return;
        posRef.current = { x: e.clientX - s.x, y: e.clientY - s.y };
        schedulePaint();
      },
      onPointerUp: () => {
        if (!startRef.current) return;
        const x = posRef.current.x;
        if (x > THRESHOLD) flyOut(1);
        else if (x < -THRESHOLD) flyOut(-1);
        else snapBack();
      },
      onPointerCancel: () => snapBack(),
    }),
    [schedulePaint, snapBack, flyOut]
  );

  const likedLinkCls = 'rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground';
  const likedLink = user ? (
    <Link href={likedHref} className={likedLinkCls}>
      Curtidos{liked.length > 0 ? ` (${liked.length})` : ''}
    </Link>
  ) : (
    <button type="button" onClick={() => requireAuth(() => router.push(likedHref))} className={likedLinkCls}>
      Curtidos
    </button>
  );

  const emptyCardCls =
    'flex h-full flex-col items-center justify-center rounded-[var(--ui-radius-card-lg,1.5rem)] border-[length:var(--ui-border-w-card,1px)] border-border shadow-[shadow:var(--ui-shadow-item,0_0_#0000)] bg-card p-6 text-center';

  return (
    <div className={`mx-auto flex w-full max-w-md flex-col px-4 pb-8 pt-3 ${MOBILE_SHELL}`}>
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-serif text-xl font-bold leading-tight text-foreground sm:text-2xl">Descobrir</h1>
          <p className="truncate text-xs text-muted-foreground max-[500px]:hidden">
            Arraste para o lado ou use os botões
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onChangeTopics}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground"
          >
            <Tags className="h-3.5 w-3.5" /> Temas
            {topics.length > 0 ? (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {topics.length}
              </span>
            ) : null}
          </button>
          {likedLink}
        </div>
      </div>

      <div className="relative mt-3 min-h-[380px] select-none max-[500px]:mb-24 max-[500px]:flex-1 min-[501px]:mt-5 min-[501px]:h-[460px]">
        {loading && !current ? <div className="h-full animate-pulse rounded-3xl bg-muted" /> : null}

        {!loading && !current && error ? (
          <div className={emptyCardCls}>
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
          <div className={emptyCardCls}>
            <Heart className="h-8 w-8 text-primary" />
            <h2 className="mt-3 font-serif text-xl font-bold text-foreground">Acabou por aqui</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Troque os temas ou volte mais tarde para ver novidades.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={onChangeTopics}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground"
              >
                Trocar temas
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <RotateCcw className="h-4 w-4" /> Recomeçar
              </button>
            </div>
          </div>
        ) : null}

        {next ? <SwipeCard key={next.uid} item={next} className="scale-[0.96] opacity-70" /> : null}
        {current ? (
          <SwipeCard
            key={current.uid}
            ref={cardRef}
            item={current}
            handlers={handlers}
            className="cursor-grab shadow-xl active:cursor-grabbing"
          />
        ) : null}
      </div>

      {current ? (
        <div className="flex items-center justify-center gap-5 pt-6 max-[500px]:fixed max-[500px]:inset-x-0 max-[500px]:bottom-[var(--mobile-tab-h,0px)] max-[500px]:z-30 max-[500px]:gap-6 max-[500px]:bg-gradient-to-t max-[500px]:from-background max-[500px]:via-background/90 max-[500px]:to-transparent max-[500px]:px-4 max-[500px]:pb-[max(0.5rem,env(safe-area-inset-bottom))] max-[500px]:pt-4 max-[500px]:backdrop-blur-sm">
          <button
            aria-label="Passar"
            onClick={skip}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-destructive shadow-sm transition-transform active:scale-90 max-[500px]:h-16 max-[500px]:w-16"
          >
            <X className="h-6 w-6" />
          </button>
          <Link
            aria-label="Ver detalhes"
            href={`/anuncios/${current.uid}`}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm max-[500px]:h-14 max-[500px]:w-14"
          >
            <Info className="h-5 w-5" />
          </Link>
          <button
            aria-label="Curtir"
            onClick={like}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-90 max-[500px]:h-16 max-[500px]:w-16"
          >
            <Heart className="h-6 w-6" />
          </button>
        </div>
      ) : null}

      {liked.length > 0 ? (
        <div className="mt-8 max-[500px]:hidden">
          <h3 className="text-sm font-semibold text-foreground">Curtidos agora</h3>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {liked.map((e) => (
              <Link key={e.uid} href={`/anuncios/${e.uid}`} className="w-32 shrink-0">
                {coverUrl(e.cover_file_id) ? (
                  <img src={coverUrl(e.cover_file_id, 'thumb')!} alt={e.title} className="h-20 w-32 rounded-xl object-cover" loading="lazy" />
                ) : (
                  <div className="h-20 w-32 rounded-xl bg-muted" />
                )}
                <p className="mt-1 line-clamp-2 text-xs font-medium text-foreground">{e.title}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
