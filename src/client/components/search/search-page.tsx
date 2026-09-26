'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, MapPin, Search, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { getStoredLocation } from '../../hooks/use-user-location';
import { LocationModal } from '../location-modal';
import { cn } from '../../../lib/utils';
import { AssistantIcon } from './assistant-icon';
import { LocationGate } from './location-gate';
import { SearchChat } from './search-chat';
import { SearchFiltersPanel } from './search-filters-panel';
import { SearchResultsView, type ResultsScope } from './search-results-view';
import {
  CategoryCarousel,
  type CategoryCarouselItem,
  type CategoryCarouselProps,
} from '../taxonomy/category-carousel';
import { useResourceOptions } from '../../hooks';
import { Typography } from '../ui/typography';
import {
  countActiveFilters,
  shouldHideCategoryCarousel,
  useSearchFilters,
} from './use-search-filters';
import {
  SEARCH_RPC,
  type ServiceResult,
  type SearchAdsBody,
  type SearchChatResponse,
} from './search-types';

export type SearchPageProps = {
  /** Rota em que a página está montada (os filtros vivem na URL). Padrão `/busca`. */
  basePath?: string;
  /**
   * Props repassadas ao `CategoryCarousel` (o mesmo componente da home, sem alteração) — passe as
   * mesmas da home (`variant`, `onlyWithListings`…) pra ficar igual; sem elas valem os padrões do
   * componente, como na home.
   * `hrefFor` é controlado pela página (mantém os filtros da URL).
   */
  categoryCarousel?: Omit<CategoryCarouselProps, 'hrefFor'>;
  /**
   * Segundo modo da página (ex.: "Pedir um serviço" — criar demanda). Quando informado, aparece um
   * toggle no topo e `?modo=pedir` troca a busca pelo conteúdo de `render`. O plugin `search` não
   * conhece demandas: quem monta a página injeta o fluxo. Sem ele, só há a busca.
   */
  requestMode?: {
    searchLabel?: string;
    requestLabel?: string;
    render: (ctx: { categoryId: number | null }) => ReactNode;
  };
};

export function SearchPage(props: SearchPageProps) {
  return (
    <Suspense
      fallback={<div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>}
    >
      <LocationGate>
        <SearchPageInner {...props} />
      </LocationGate>
    </Suspense>
  );
}

function priceOf(r: ServiceResult): number | null {
  const n = Number(r.price);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Teto de páginas replay-adas ao abrir um link direto tipo `?page=8` — protege contra um valor
 * absurdo na URL disparar dezenas de requests em sequência no mount. */
const MAX_REPLAY_PAGES = 10;

function SearchPageInner({
  basePath = '/busca',
  requestMode,
  categoryCarousel,
}: SearchPageProps) {
  const stored = getStoredLocation();
  const location = useMemo(
    () => ({
      state: stored?.stateCode ?? '',
      stateName: stored?.stateName ?? '',
      cityId: stored && stored.cityId > 0 ? stored.cityId : null,
      cityName: stored?.cityName ?? null,
      // 'ip' = detectado automaticamente (aproximado); vale destacar que é um palpite editável.
      autoDetected: stored?.source === 'ip',
    }),
    [stored]
  );

  const { filters, setFilters, resetFilters, applyAgentFilter, toSearchAdsBody } =
    useSearchFilters(location, basePath);

  const router = useRouter();
  const searchParams = useSearchParams();

  /** Atualiza só `?page=` na URL, preservando os demais filtros já presentes — usado pelo
   * "carregar mais" pra deixar a profundidade de paginação compartilhável/crawlável (o conteúdo
   * em si segue vindo do fetch client-side; isso só dá ao link uma URL própria por página). */
  const updatePageParam = useCallback(
    (page: number) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (page > 0) sp.set('page', String(page));
      else sp.delete('page');
      router.replace(`${basePath}?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams, basePath]
  );

  const [rawResults, setRawResults] = useState<ServiceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [scope, setScope] = useState<ResultsScope>('city');
  // corpo do RPC que "venceu" a cascata + seed dessa busca — a paginação continua da MESMA
  // consulta/ordem (novo seed a cada página traria duplicatas e ordem inconsistente).
  const effectiveBodyRef = useRef<SearchAdsBody | null>(null);
  const pageRef = useRef(0);
  const [heroInput, setHeroInput] = useState(filters.query ?? '');
  const [isLocationOpen, setLocationOpen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [desktopChatOpen, setDesktopChatOpen] = useState(false);
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(false);
  const [desktopPendingMessage, setDesktopPendingMessage] = useState<string | null>(null);
  const [mobilePendingMessage, setMobilePendingMessage] = useState<string | null>(null);
  const [showGreeting, setShowGreeting] = useState(false);
  const [bounceGreeting, setBounceGreeting] = useState(false);
  const [greetingDismissed, setGreetingDismissed] = useState(false);
  // Toggle "Buscar profissionais" / "Pedir um serviço" no topo da página — 'demanda' substitui
  // busca+resultados+assistente pelo fluxo de criar demanda (ver hero abaixo). Vive na URL
  // (`?modo=pedir`) pra ter link direto e o back do navegador desfazer a troca.
  const pageMode = useMemo<'buscar' | 'demanda'>(
    () => (requestMode && searchParams.get('modo') === 'pedir' ? 'demanda' : 'buscar'),
    [searchParams, requestMode]
  );
  const setPageMode = useCallback(
    (mode: 'buscar' | 'demanda') => {
      const sp = new URLSearchParams(searchParams.toString());
      if (mode === 'demanda') sp.set('modo', 'pedir');
      else sp.delete('modo');
      // push (não replace) — o toggle precisa entrar no histórico pro back do navegador desfazer.
      router.push(`${basePath}?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams, basePath]
  );

  // chave estável: dispara refetch quando qualquer filtro relevante muda (sem o seed)
  const bodyKey = useMemo(() => {
    const b = toSearchAdsBody(0);
    return JSON.stringify([
      b.p_state,
      b.p_city_id,
      b.p_city_ibge,
      b.p_group_category_slug,
      b.p_category_id,
      b.p_subcategories,
      b.p_query,
    ]);
  }, [toSearchAdsBody]);

  useEffect(() => {
    setHeroInput(filters.query ?? '');
  }, [filters.query]);

  // Balão de saudação do assistente (desktop) — chama atenção uma vez, some assim que o chat
  // abre ou o usuário fecha o balão, e não volta a aparecer depois disso.
  useEffect(() => {
    if (desktopChatOpen || greetingDismissed) return;
    const t = setTimeout(() => setShowGreeting(true), 1500);
    return () => clearTimeout(t);
  }, [desktopChatOpen, greetingDismissed]);

  useEffect(() => {
    if (desktopChatOpen) {
      setShowGreeting(false);
      setGreetingDismissed(true);
    }
  }, [desktopChatOpen]);

  useEffect(() => {
    if (!showGreeting) return;
    setBounceGreeting(true);
    const t = setTimeout(() => setBounceGreeting(false), 2000);
    return () => clearTimeout(t);
  }, [showGreeting]);

  const runSearch = useCallback(
    async (body: SearchAdsBody, signal: AbortSignal): Promise<ServiceResult[]> => {
      const res = await fetch(`/api/resources/${SEARCH_RPC}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
      const data = (await res.json().catch(() => null)) as { items?: unknown[] } | null;
      return Array.isArray(data?.items) ? (data.items as ServiceResult[]) : [];
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    const seed = Math.random() * 2 - 1;
    setLoading(true);

    (async () => {
      try {
        const base = toSearchAdsBody(seed);
        // 1) cidade + filtros
        let effective = base;
        let items = await runSearch(effective, controller.signal);
        let nextScope: ResultsScope = base.p_city_id ? 'city' : 'state';

        // 2) sem cidade
        if (items.length === 0 && base.p_city_id) {
          effective = { ...base, p_city_id: null, p_city_ibge: null };
          items = await runSearch(effective, controller.signal);
          nextScope = 'state';
        }
        // 3) só estado + texto (larga grupo/categoria/subcategoria)
        if (
          items.length === 0 &&
          (base.p_group_category_slug || base.p_category_id || base.p_subcategories)
        ) {
          effective = {
            ...base,
            p_city_id: null,
            p_city_ibge: null,
            p_group_category_slug: null,
            p_category_id: null,
            p_subcategories: null,
          };
          items = await runSearch(effective, controller.signal);
          nextScope = 'related';
        }
        // 4) larga também o texto — mostra o que houver no estado
        if (items.length === 0 && base.p_query) {
          effective = {
            ...base,
            p_city_id: null,
            p_city_ibge: null,
            p_group_category_slug: null,
            p_category_id: null,
            p_subcategories: null,
            p_query: null,
          };
          items = await runSearch(effective, controller.signal);
          nextScope = 'related';
        }
        if (items.length === 0) nextScope = 'empty';

        effectiveBodyRef.current = effective;
        pageRef.current = 0;

        // Link direto tipo `?...&page=3` (sitemap, compartilhamento, "voltar" do navegador)
        // — replay sequencial pra reconstruir a mesma lista concatenada que "carregar mais" teria
        // produzido, em vez de sempre reabrir na página 0. Só quando a página 0 já veio cheia
        // (senão não faz sentido pedir mais da mesma consulta).
        const requestedPage = Math.min(
          Math.max(0, Math.trunc(Number(searchParams.get('page')) || 0)),
          MAX_REPLAY_PAGES
        );
        let allItems = items;
        let moreAvailable = items.length >= effective.p_page_size;
        for (let page = 1; page <= requestedPage && moreAvailable; page += 1) {
          const more = await runSearch({ ...effective, p_page: page }, controller.signal);
          const seen = new Set(allItems.map((r) => r.uid));
          allItems = [...allItems, ...more.filter((r) => !seen.has(r.uid))];
          moreAvailable = more.length >= effective.p_page_size;
          pageRef.current = page;
        }

        setRawResults(allItems);
        setScope(nextScope);
        setHasMore(moreAvailable);
      } catch {
        /* abort ou rede — mantém estado anterior */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
    // `searchParams` de propósito fora das deps: só lemos `?page=` aqui pro replay do link
    // direto/inicial. Se entrasse na dependência, o próprio `updatePageParam` do "carregar mais"
    // (que também escreve em `searchParams`) disparava esse efeito de novo a cada página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyKey, runSearch, toSearchAdsBody]);

  const loadMore = useCallback(async () => {
    const body = effectiveBodyRef.current;
    if (!body || loadingMore) return;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const more = await runSearch({ ...body, p_page: nextPage }, new AbortController().signal);
      pageRef.current = nextPage;
      setRawResults((prev) => {
        const seen = new Set(prev.map((r) => r.uid));
        return [...prev, ...more.filter((r) => !seen.has(r.uid))];
      });
      setHasMore(more.length >= body.p_page_size);
      updatePageParam(nextPage);
    } catch {
      /* rede — mantém o que já tem, botão continua disponível */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, runSearch, updatePageParam]);

  // faixa de preço é client-side (a RPC de busca não tem params de preço)
  const results = useMemo(() => {
    let list = rawResults;
    if (filters.priceMin != null) {
      list = list.filter((r) => (priceOf(r) ?? Infinity) >= filters.priceMin!);
    }
    if (filters.priceMax != null) {
      list = list.filter((r) => (priceOf(r) ?? 0) <= filters.priceMax!);
    }
    if (filters.sort === 'price') {
      list = [...list].sort((a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity));
    }
    if (filters.sort === 'rating') {
      list = [...list].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    }
    return list;
  }, [rawResults, filters.priceMin, filters.priceMax, filters.sort]);

  const handleAgentResult = useCallback(
    (r: SearchChatResponse) => {
      if (r.filtro && !r.precisa_mais_info) applyAgentFilter(r.filtro);
    },
    [applyAgentFilter]
  );

  // xl+ = painel fixo do desktop; abaixo disso = sheet inferior. Decide no clique (não precisa
  // acompanhar resize — o usuário não muda a largura da janela entre digitar e clicar).
  const openChat = (text?: string) => {
    const trimmed = text?.trim() || undefined;
    const isDesktop =
      typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches;
    if (isDesktop) {
      setDesktopChatOpen(true);
      if (trimmed) setDesktopPendingMessage(trimmed);
    } else {
      setChatCollapsed(false);
      setFiltersOpen(false);
      if (trimmed) setMobilePendingMessage(trimmed);
    }
  };

  // chat e filtro (mobile) se alternam — abrir um minimiza o outro, pra tela nunca ficar com
  // dois painéis grandes disputando espaço.
  const toggleMobileChat = () => {
    setChatCollapsed((prev) => {
      const next = !prev;
      if (!next) setFiltersOpen(false);
      return next;
    });
  };

  const activeFilterCount = countActiveFilters(filters);
  // Carrossel de categorias sob a busca: some (com transição) só com categoria + mais um filtro.
  const hideCarousel = shouldHideCategoryCarousel(filters);
  const { options: categoryRows } = useResourceOptions<{
    id: string | number;
    categoryId: string | number;
    categoryName?: string;
  }>({ resource: 'category_stats' });
  const activeCategoryName = useMemo(
    () =>
      (categoryRows ?? []).find((row) => Number(row.categoryId) === filters.categoryId)
        ?.categoryName ?? null,
    [categoryRows, filters.categoryId]
  );
  const carouselHref = useCallback(
    (item: CategoryCarouselItem) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set('categoryId', String(item.id));
      sp.delete('subcategoryIds');
      sp.delete('page');
      return `${basePath}?${sp.toString()}`;
    },
    [searchParams, basePath]
  );
  const locationLabel = location.cityName || location.stateName || location.state;
  const collapseBase =
    'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none';

  return (
    <main className="min-h-screen bg-background pb-10 xl:pb-0">
      {/* Hero */}
      <section
        className={`border-b border-border bg-card/40 transition-[padding] duration-300 ${
          desktopChatOpen ? 'xl:pr-[400px]' : ''
        }`}
      >
        <div
          className={cn(
            'mx-auto w-full px-4 py-4 sm:py-5',
            pageMode === 'demanda' ? 'max-w-4xl text-left' : 'max-w-3xl text-center'
          )}
        >
          {/* Toggle "Buscar profissionais" / "Pedir um serviço" — funciona como o título da
              página: escolher "Pedir um serviço" substitui busca+resultados pelo fluxo de criar
              demanda (categoria + formulário), sem modal. */}
          {requestMode ? (
          <div
            className={cn(
              'mb-3 inline-flex rounded-full border border-border bg-muted p-1 text-sm',
              pageMode !== 'demanda' && 'mx-auto'
            )}
          >
            <button
              type="button"
              onClick={() => setPageMode('buscar')}
              className={cn(
                'rounded-full px-4 py-1.5 font-semibold transition',
                pageMode === 'buscar'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {requestMode.searchLabel ?? 'Buscar profissionais'}
            </button>
            <button
              type="button"
              onClick={() => setPageMode('demanda')}
              className={cn(
                'rounded-full px-4 py-1.5 font-semibold transition',
                pageMode === 'demanda'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {requestMode.requestLabel ?? 'Pedir um serviço'}
            </button>
          </div>
          ) : null}

          {pageMode === 'demanda' && requestMode ? (
            requestMode.render({ categoryId: filters.categoryId ?? null })
          ) : (
            <>
              <Typography.H4 font="display" className="text-muted-foreground">
                Buscar com IA
              </Typography.H4>
              <form
                className="mt-3 flex items-center gap-2 rounded-full border-2 border-primary/40 bg-background p-2 shadow-md transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15"
                onSubmit={(e) => {
                  e.preventDefault();
                  openChat(heroInput);
                  setHeroInput('');
                }}
              >
                <button
                  type="button"
                  onClick={() => setLocationOpen(true)}
                  aria-label="Trocar localização"
                  title={location.autoDetected ? 'Detectado automaticamente — clique para trocar' : 'Trocar localização'}
                  className="hidden h-12 shrink-0 items-center gap-1 rounded-full bg-muted px-3 text-xs font-medium text-foreground transition hover:bg-muted/70 sm:inline-flex"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span className="max-w-[9rem] truncate">{locationLabel}</span>
                </button>
                <input
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  placeholder="Descreva o que você precisa…"
                  className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground/70"
                />
                <button
                  type="button"
                  onClick={() => openChat(heroInput)}
                  aria-label="Falar com o assistente"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/20"
                >
                  <AssistantIcon className="h-[30px] w-[30px]" />
                </button>
                <button
                  type="submit"
                  aria-label="Buscar"
                  className="h-12 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:px-5"
                >
                  <Search className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">Buscar</span>
                </button>
              </form>
              {/* Localização no mobile (no desktop ela é o chip dentro da barra). */}
              <p className="mt-1.5 text-xs text-muted-foreground sm:hidden">
                Buscando em <span className="font-medium text-foreground">{locationLabel}</span>
                {location.autoDetected && <span className="italic"> (detectado automaticamente)</span>}
                {' — '}
                <button onClick={() => setLocationOpen(true)} className="underline hover:text-foreground">
                  trocar
                </button>
              </p>

              {/* Categoria ativa: entra (com transição) quando o carrossel sai. Clicar remove a
                  categoria — e o carrossel volta pra escolher outra. */}
              <div
                className={cn(collapseBase, hideCarousel ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}
                aria-hidden={!hideCarousel}
                inert={!hideCarousel}
              >
                <div className="overflow-hidden">
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => setFilters({ categoryId: null, subcategoryIds: [] })}
                      aria-label={`Remover a categoria ${activeCategoryName ?? ''} e escolher outra`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                    >
                      {activeCategoryName ?? 'Categoria'}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Carrossel de categorias logo abaixo da busca. Só some com categoria + mais um filtro —
            só com a categoria ele fica, pra quem está navegando entre elas. */}
        {pageMode === 'buscar' && (
          <div
            className={cn(collapseBase, hideCarousel ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100')}
            aria-hidden={hideCarousel}
            inert={hideCarousel}
          >
            <div className="overflow-hidden">
              {/* Sem o título "Categorias": só um filete suave separando a busca do carrossel. */}
              <hr className="w-full border-border/40" />
              <CategoryCarousel
                title=""
                className="w-full px-4 pb-6 pt-6"
                {...categoryCarousel}
                hrefFor={carouselHref}
              />
            </div>
          </div>
        )}
      </section>

      {pageMode === 'buscar' && (
        <>
      {/* Ações (mobile/tablet) — Filtros + Assistente logo abaixo da busca. `sticky` faz a barra
          descer com a página até o topo e então "flutuar" fixa enquanto o usuário rola (a busca
          some por cima). Some em xl+, onde o filtro é coluna fixa e o chat tem painel próprio. */}
      <div className="sticky top-14 z-30 flex justify-center gap-2 px-4 py-2 xl:hidden">
        <Sheet
          open={filtersOpen}
          onOpenChange={(open) => {
            setFiltersOpen(open);
            if (open) setChatCollapsed(true);
          }}
        >
          <SheetTrigger asChild>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 text-sm font-semibold shadow-md backdrop-blur lg:hidden"
              aria-label="Abrir filtros"
            >
              <Filter className="h-4 w-4" /> Filtros
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6 pt-6">
              <SearchFiltersPanel
                filters={filters}
                setFilters={setFilters}
                resetFilters={resetFilters}
              />
            </div>
            <div className="px-4 pb-8">
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-danger px-4 py-3 text-sm font-semibold text-white"
              >
                <X className="h-4 w-4" /> Fechar filtros
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <button
          type="button"
          onClick={toggleMobileChat}
          aria-label="Falar com o assistente"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md"
        >
          <AssistantIcon className="h-5 w-5" /> Assistente
        </button>
      </div>

      {/* Carrossel de anúncios (mobile) — prévia horizontal logo abaixo da busca; a listagem
          completa vem em seguida, na seção de conteúdo. */}
      <section className="mx-auto w-full max-w-[1900px] px-4 pt-4 lg:hidden">
        <SearchResultsView
          results={results}
          loading={loading}
          scope={scope}
          stateName={location.state}
          cityName={location.cityName}
          layout="strip"
          onClearFilters={resetFilters}
          onChangeLocation={() => setLocationOpen(true)}
        />
      </section>

      {/* Conteúdo */}
      <section
        className={`mx-auto w-full max-w-[1900px] px-4 py-6 transition-[padding] duration-300 ${
          desktopChatOpen ? 'xl:pr-[400px]' : ''
        }`}
      >
        <div
          className={`grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr] ${
            desktopChatOpen ? 'xl:grid-cols-1' : ''
          }`}
        >
          {/* Filtros (desktop) — coluna fixa em lg+; some em xl+ quando o chat abre (o painel do
              chat some com o espaço), vira botão flutuante (ver abaixo) pra não empurrar/disputar
              layout com o chat. */}
          <aside className={`hidden lg:block ${desktopChatOpen ? 'xl:hidden' : ''}`}>
            <div className="sticky top-4 rounded-2xl border border-border bg-card p-4">
              <SearchFiltersPanel
                filters={filters}
                setFilters={setFilters}
                resetFilters={resetFilters}
              />
            </div>
          </aside>

          {/* Resultados */}
          <div className="min-w-0">
            <SearchResultsView
              results={results}
              loading={loading}
              scope={scope}
              stateName={location.state}
              cityName={location.cityName}
              layout="grid"
              onClearFilters={resetFilters}
              onChangeLocation={() => setLocationOpen(true)}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          </div>
        </div>
      </section>

      {/* Assistente — painel fixo do desktop (xl+): não ocupa coluna do grid, só desliza por
          cima quando aberto, então abrir/fechar nunca rola nem redimensiona a página. */}
      <div
        className={`fixed right-4 top-20 z-40 hidden h-[calc(100vh-6rem)] w-[360px] transition-transform duration-300 xl:block ${
          desktopChatOpen ? 'translate-x-0' : 'pointer-events-none translate-x-[calc(100%+1rem)]'
        }`}
      >
        <SearchChat
          variant="sidebar"
          location={location}
          filtrosAtuais={{
            groupSlug: filters.groupSlug,
            categoryId: filters.categoryId,
            subcategoryIds: filters.subcategoryIds,
            query: filters.query,
          }}
          onAgentResult={handleAgentResult}
          onClose={() => {
            setDesktopChatOpen(false);
            setDesktopFiltersOpen(false);
          }}
          pendingMessage={desktopPendingMessage}
          onPendingMessageSent={() => setDesktopPendingMessage(null)}
        />
      </div>
      {!desktopChatOpen && (
        <>
          {showGreeting && (
            <div
              className={`fixed bottom-24 right-6 z-40 hidden w-56 rounded-2xl rounded-br-sm bg-primary p-3 text-sm font-medium text-primary-foreground shadow-lg xl:block ${
                bounceGreeting ? 'animate-bounce' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setShowGreeting(false);
                  setGreetingDismissed(true);
                }}
                aria-label="Fechar"
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary shadow hover:bg-primary-foreground/90"
              >
                <X className="h-3 w-3" />
              </button>
              Oi! Sou a Naví, posso te ajudar a achar algo? 👋
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              openChat();
              setShowGreeting(false);
              setGreetingDismissed(true);
            }}
            aria-label="Abrir assistente"
            className="fixed bottom-6 right-6 z-40 hidden h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg xl:flex"
          >
            <AssistantIcon className="h-6 w-6" /> Assistente
            {showGreeting && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-primary-foreground" />
              </span>
            )}
          </button>
        </>
      )}

      {/* Filtro flutuante (desktop, só quando o chat está aberto — substitui a coluna fixa, que
          some pra não disputar espaço/posição com o painel do chat). */}
      {desktopChatOpen && (
        <Sheet open={desktopFiltersOpen} onOpenChange={setDesktopFiltersOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Abrir filtros"
              className="fixed left-6 top-20 z-40 hidden h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg xl:flex"
            >
              <Filter className="h-4 w-4" /> Filtros
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary-foreground/20 px-1.5 text-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6 pt-6">
              <SearchFiltersPanel
                filters={filters}
                setFilters={setFilters}
                resetFilters={resetFilters}
              />
            </div>
            <div className="px-4 pb-8">
              <button
                type="button"
                onClick={() => setDesktopFiltersOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-danger px-4 py-3 text-sm font-semibold text-white"
              >
                <X className="h-4 w-4" /> Fechar filtros
              </button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Fundo do chat inferior (mobile) — o painel tem espaço próprio: em vez de sobrepor os
          anúncios por baixo, escurece o resto da página, então fica claro que é uma camada acima,
          não um card cortado ao meio. Clicar fora fecha, igual ao overlay do Sheet de filtros. */}
      {!chatCollapsed && (
        <div
          className="fixed inset-0 z-20 bg-black/30 xl:hidden"
          onClick={() => setChatCollapsed(true)}
        />
      )}

      {/* Chat inferior (abaixo de xl) — só monta quando aberto (o gatilho fica na barra de ações
          acima da busca). Ocupa a maior parte da tela pra dar uma visão única da conversa; o filtro
          continua aplicado por baixo. */}
      {!chatCollapsed && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[500px] xl:hidden">
          <SearchChat
            variant="sheet"
            collapsed={false}
            onToggleCollapsed={toggleMobileChat}
            location={location}
            filtrosAtuais={{
              groupSlug: filters.groupSlug,
              categoryId: filters.categoryId,
              subcategoryIds: filters.subcategoryIds,
              query: filters.query,
            }}
            onAgentResult={handleAgentResult}
            pendingMessage={mobilePendingMessage}
            onPendingMessageSent={() => setMobilePendingMessage(null)}
          />
        </div>
      )}
        </>
      )}

      <LocationModal
        open={isLocationOpen}
        onClose={() => {
          setLocationOpen(false);
          const loc = getStoredLocation();
          if (loc)
            setFilters({
              state: loc.stateCode,
              cityId: loc.cityId > 0 ? loc.cityId : null,
              cityName: loc.cityName || null,
            });
        }}
      />
    </main>
  );
}
