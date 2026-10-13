'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, SlidersHorizontal, X } from 'lucide-react';
import { countActiveFilters } from './use-search-filters';
import type { SearchFilterPatch, SearchFilters, SearchSort } from './search-types';
import {
  categoriesOfGroup,
  findCategory,
  findGroupBySlug,
  groupChangePatch,
  groupsWithCategories,
  resolveActiveGroup,
  subcategoryBlocks,
  summarizeActiveFilters,
  toggleCategory,
  toggleSubcategory,
  type FilterCategory,
} from './filters/filter-taxonomy';
import { sameCitySet } from './filters/filter-cities';
import { useFilterTaxonomy } from './filters/use-filter-taxonomy';
import { useFilterCities } from './filters/use-filter-cities';
import { FilterGroupLink } from './filters/filter-group-link';
import { FilterGroupList } from './filters/filter-group-list';
import { FilterCategoryList } from './filters/filter-category-list';
import { FilterSubcategoryChips } from './filters/filter-subcategory-chips';
import { FilterCityChips } from './filters/filter-city-chips';
import { Collapse, Enter, useMountedFlag, useRetained } from './filters/filter-motion';
import { CountBadge, FilterNotice, FilterSection, FilterSkeleton } from './filters/filter-parts';

type Props = {
  filters: SearchFilters;
  setFilters: (patch: SearchFilterPatch) => void;
  resetFilters: () => void;
  /** cidades em vigor (IBGE): `filters.cityIds ?? defaultCityIds` */
  effectiveCityIds: string[];
  /** padrão: cidade do cabeçalho + irmãs da região (IBGE) */
  defaultCityIds: string[];
  /** Esconde o título "Filtros" (o Sheet do mobile já tem o próprio) e deixa só o resumo. */
  hideTitle?: boolean;
};

/** O que o painel mostra "na hora", antes de a URL (fonte de verdade) devolver os novos filtros. */
type Override = Partial<Pick<SearchFilters, 'groupSlug' | 'categoryIds' | 'subcategoryIds' | 'cityIds'>>;

const FIELD =
  'h-11 w-full rounded-[var(--ui-radius-field,0.375rem)] border border-input bg-background px-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:px-2 sm:text-sm';

/**
 * Painel de filtros da busca, no estilo "OLX": o grupo é o link em destaque no topo (clicar troca a
 * visão para a lista de grupos), logo abaixo as categorias do grupo (multi-seleção), as
 * especialidades das marcadas e a localização em chips. Só compõe os blocos de `./filters/*`;
 * a regra de "o que aparece" está em `filter-taxonomy.ts`.
 */
export function SearchFiltersPanel({
  filters,
  setFilters,
  resetFilters,
  effectiveCityIds,
  defaultCityIds,
  hideTitle = false,
}: Props) {
  const { taxonomy, loading, error, retry } = useFilterTaxonomy();
  const { cities, loading: citiesLoading, error: citiesError } = useFilterCities();
  const ready = useMountedFlag();

  // Resposta imediata: a URL demora um ciclo pra voltar; até lá vale o que o usuário acabou de fazer.
  const [override, setOverride] = useState<Override | null>(null);
  useEffect(() => {
    setOverride(null);
  }, [filters]);
  const view: SearchFilters = override ? { ...filters, ...override } : filters;

  const apply = useCallback(
    (patch: SearchFilterPatch) => {
      const next: Override = {};
      if (patch.groupSlug !== undefined) next.groupSlug = patch.groupSlug;
      if (patch.categoryIds !== undefined) next.categoryIds = patch.categoryIds;
      if (patch.subcategoryIds !== undefined) next.subcategoryIds = patch.subcategoryIds;
      if (patch.cityIds !== undefined) next.cityIds = patch.cityIds;
      if (Object.keys(next).length > 0) setOverride((prev) => ({ ...prev, ...next }));
      setFilters(patch);
    },
    [setFilters]
  );

  // ─── visão: categorias do grupo × lista de grupos ───────────────────────────────────────
  const [picking, setPicking] = useState(false);
  const [direction, setDirection] = useState<'from-right' | 'from-left'>('from-right');
  /** grupo deduzido que o usuário "esvaziou" (desmarcou a última categoria) — só na exibição */
  const [stickySlug, setStickySlug] = useState<string | null>(null);
  const taxRef = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);

  const resolved = resolveActiveGroup(taxonomy, view);
  const activeGroup =
    resolved.group ?? (view.groupSlug ? null : findGroupBySlug(taxonomy, stickySlug));
  const visibleGroups = useMemo(() => groupsWithCategories(taxonomy), [taxonomy]);
  const hasGroups = visibleGroups.length > 0;
  const showGroups =
    hasGroups && (picking || (!activeGroup && view.categoryIds.length === 0));

  // Foco acompanha a troca de visão (só quando foi o usuário quem trocou).
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    const root = taxRef.current;
    const target =
      root?.querySelector<HTMLElement>('[data-autofocus]') ??
      root?.querySelector<HTMLElement>('button');
    target?.focus({ preventScroll: true });
  }, [showGroups]);

  const goToGroups = () => {
    focusPending.current = true;
    setDirection('from-right');
    setPicking(true);
  };
  const backToCategories = () => {
    focusPending.current = true;
    setDirection('from-left');
    setPicking(false);
  };
  const chooseGroup = (slug: string | null) => {
    if (slug !== null) {
      focusPending.current = true;
      setDirection('from-left');
    }
    setPicking(false);
    setStickySlug(null);
    apply(groupChangePatch(slug));
  };

  // ─── categorias do grupo ────────────────────────────────────────────────────────────────
  const categoryList = useMemo(() => {
    let base: FilterCategory[] = [];
    if (activeGroup) base = categoriesOfGroup(taxonomy, activeGroup.id);
    else if (!hasGroups) base = taxonomy.categories;
    const known = new Set(base.map((c) => c.id));
    const extra = view.categoryIds
      .map((id) => findCategory(taxonomy, id))
      .filter((c): c is FilterCategory => c !== null && !known.has(c.id));
    return [...base, ...extra];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxonomy, activeGroup, hasGroups, view.categoryIds.join(',')]);

  const rememberGroupIfEmptied = (nextCategoryIds: number[]) => {
    if (nextCategoryIds.length === 0 && resolved.deduced && resolved.group) {
      setStickySlug(resolved.group.slug);
    }
  };

  const onToggleCategory = (id: number) => {
    const next = toggleCategory(
      taxonomy,
      { categoryIds: view.categoryIds, subcategoryIds: view.subcategoryIds },
      id
    );
    rememberGroupIfEmptied(next.categoryIds);
    apply({ categoryIds: next.categoryIds, subcategoryIds: next.subcategoryIds });
  };

  const onClearCategories = () => {
    rememberGroupIfEmptied([]);
    apply({ categoryIds: [], subcategoryIds: [] });
  };

  // ─── especialidades ─────────────────────────────────────────────────────────────────────
  const blocks = subcategoryBlocks(taxonomy, view.categoryIds, view.subcategoryIds);
  const shownBlocks = useRetained(blocks);

  // ─── cidades ────────────────────────────────────────────────────────────────────────────
  const cityOverridden = override !== null && 'cityIds' in override;
  const rawCityIds = cityOverridden ? override.cityIds : filters.cityIds;
  const shownCityIds = rawCityIds ?? (cityOverridden ? defaultCityIds : effectiveCityIds);
  const customCities = rawCityIds != null && !sameCitySet(rawCityIds, defaultCityIds);

  // ─── resumo / limpar ────────────────────────────────────────────────────────────────────
  const activeCount = countActiveFilters(view);

  const onReset = () => {
    setStickySlug(null);
    setPicking(false);
    setOverride({ groupSlug: null, categoryIds: [], subcategoryIds: [], cityIds: null });
    resetFilters();
  };

  // ─── render ─────────────────────────────────────────────────────────────────────────────
  const taxonomyFailed = !loading && Boolean(error) && taxonomy.categories.length === 0;
  const taxonomyEmpty = !loading && !error && taxonomy.categories.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className={`flex items-center gap-2 ${hideTitle ? 'justify-end' : 'justify-between'}`}>
        {!hideTitle && (
          <div className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="size-5 text-primary sm:size-4" />
            <h2 className="text-lg font-bold sm:text-sm">Filtros</h2>
          </div>
        )}
        <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
          {summarizeActiveFilters(activeCount)}
        </p>
      </div>

      <div ref={taxRef} className="flex flex-col gap-4">
        {loading ? (
          <FilterSkeleton rows={5} />
        ) : taxonomyFailed ? (
          <FilterNotice
            tone="danger"
            action={
              <button
                type="button"
                onClick={retry}
                className="min-h-9 rounded text-sm font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Tentar de novo
              </button>
            }
          >
            Não deu para carregar as categorias. Confira sua conexão e tente de novo.
          </FilterNotice>
        ) : taxonomyEmpty ? (
          <FilterNotice>Nenhuma categoria disponível por enquanto.</FilterNotice>
        ) : showGroups ? (
          <Enter key="groups" variant={direction} animate={ready} className="flex flex-col gap-2">
            {activeGroup && (
              <button
                type="button"
                onClick={backToCategories}
                className="inline-flex min-h-11 items-center gap-1 self-start rounded px-1 text-sm font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Voltar para {activeGroup.name}
              </button>
            )}
            <FilterGroupList
              groups={visibleGroups}
              activeSlug={activeGroup?.slug ?? null}
              onSelect={chooseGroup}
            />
          </Enter>
        ) : (
          <Enter key="categories" variant={direction} animate={ready} className="flex flex-col gap-3">
            <FilterGroupLink
              name={activeGroup?.name ?? null}
              icon={activeGroup?.icon ?? null}
              fallbackLabel={hasGroups ? 'Todas as categorias' : 'Categorias'}
              onClick={hasGroups ? goToGroups : undefined}
            />
            {categoryList.length > 0 ? (
              <FilterCategoryList
                categories={categoryList}
                selectedIds={view.categoryIds}
                onToggle={onToggleCategory}
                onClear={onClearCategories}
                groupLabel={activeGroup?.name}
              />
            ) : (
              <FilterNotice
                action={
                  hasGroups ? (
                    <button
                      type="button"
                      onClick={goToGroups}
                      className="min-h-9 rounded text-sm font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Ver outros grupos
                    </button>
                  ) : undefined
                }
              >
                Este grupo ainda não tem categorias.
              </FilterNotice>
            )}
          </Enter>
        )}

        {/* só aparece na visão de categorias — na lista de grupos ficaria solta */}
        <Collapse open={blocks.length > 0 && !showGroups}>
          <FilterSection
            title="Especialidades"
            aside={
              view.subcategoryIds.length > 0 ? (
                <CountBadge>
                  {view.subcategoryIds.length === 1
                    ? '1 selecionada'
                    : `${view.subcategoryIds.length} selecionadas`}
                </CountBadge>
              ) : undefined
            }
          >
            <FilterSubcategoryChips
              blocks={shownBlocks}
              selectedIds={view.subcategoryIds}
              showCategoryLabel={view.categoryIds.length > 1}
              onToggle={(id) => apply({ subcategoryIds: toggleSubcategory(view.subcategoryIds, id) })}
            />
          </FilterSection>
        </Collapse>
      </div>

      <FilterSection title="Localização">
        <FilterCityChips
          selectedIds={shownCityIds}
          cities={cities}
          loading={citiesLoading}
          error={citiesError}
          isCustom={customCities}
          stateCode={filters.state || undefined}
          onChange={(next) => apply({ cityIds: next })}
          onResetDefault={() => apply({ cityIds: null })}
        />
      </FilterSection>

      <FilterSection title="Ordenar por">
        <select
          aria-label="Ordenar por"
          value={view.sort}
          onChange={(e) => setFilters({ sort: e.target.value as SearchSort })}
          className={FIELD}
        >
          <option value="relevance">Relevância</option>
          <option value="price">Menor preço</option>
          <option value="rating">Melhor avaliação</option>
        </select>
      </FilterSection>

      <FilterSection title="Busca por texto">
        <input
          type="text"
          aria-label="Busca por texto"
          placeholder="ex.: DJ pra casamento"
          value={view.query ?? ''}
          onChange={(e) => setFilters({ query: e.target.value || null })}
          className={FIELD}
        />
      </FilterSection>

      <FilterSection title="Faixa de preço (R$)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            aria-label="Preço mínimo"
            placeholder="mín"
            value={view.priceMin ?? ''}
            onChange={(e) =>
              setFilters({ priceMin: e.target.value ? Number(e.target.value) : null })
            }
            className={FIELD}
          />
          <span aria-hidden="true" className="text-base text-muted-foreground sm:text-sm">
            —
          </span>
          <input
            type="number"
            min={0}
            aria-label="Preço máximo"
            placeholder="máx"
            value={view.priceMax ?? ''}
            onChange={(e) =>
              setFilters({ priceMax: e.target.value ? Number(e.target.value) : null })
            }
            className={FIELD}
          />
        </div>
      </FilterSection>

      <Collapse open={activeCount > 0}>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--ui-radius-pill,0.375rem)] border border-border px-3 text-base outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:bg-muted motion-reduce:transition-none sm:min-h-9 sm:text-sm"
        >
          <X aria-hidden="true" className="size-5 sm:size-4" /> Limpar filtros
        </button>
      </Collapse>
    </div>
  );
}
