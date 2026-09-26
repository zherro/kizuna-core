'use client';

import { useMemo } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useResourceOptions } from '../../hooks';
import { countActiveFilters } from './use-search-filters';
import type {
  SearchFilterPatch,
  SearchFilters,
  SearchSort,
} from './search-types';

type StatRow = {
  id: string | number;
  category_id: number | string;
  category_name: string;
  subcategory_id: number | string | null;
  subcategory_name: string | null;
};

type Props = {
  filters: SearchFilters;
  setFilters: (patch: SearchFilterPatch) => void;
  resetFilters: () => void;
};

export function SearchFiltersPanel({ filters, setFilters, resetFilters }: Props) {
  const { options: rows } = useResourceOptions<StatRow>({
    resource: 'vw_category_subcategory_stats',
  });

  const categories = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; subs: { id: number; name: string }[] }
    >();
    for (const row of rows ?? []) {
      const cid = Number(row.category_id);
      if (!Number.isFinite(cid) || cid <= 0) continue;
      const entry = map.get(cid) ?? {
        id: cid,
        name: String(row.category_name ?? `Categoria ${cid}`),
        subs: [],
      };
      const sid = Number(row.subcategory_id);
      if (Number.isFinite(sid) && sid > 0 && row.subcategory_name) {
        if (!entry.subs.some((s) => s.id === sid)) {
          entry.subs.push({ id: sid, name: String(row.subcategory_name) });
        }
      }
      map.set(cid, entry);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [rows]);

  const activeSubs = useMemo(
    () => categories.find((c) => c.id === filters.categoryId)?.subs ?? [],
    [categories, filters.categoryId]
  );

  const activeCount = countActiveFilters(filters);

  function toggleSub(id: number) {
    const next = filters.subcategoryIds.includes(id)
      ? filters.subcategoryIds.filter((s) => s !== id)
      : [...filters.subcategoryIds, id];
    setFilters({ subcategoryIds: next });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-5 w-5 text-primary sm:h-4 sm:w-4" />
        <h2 className="text-lg font-bold sm:text-sm">Filtros</h2>
        {/* Painel aberto: só uma bolinha avisa que há filtro ativo (o número fica no botão que
            abre/minimiza o filtro). */}
        {activeCount > 0 && (
          <span
            role="status"
            aria-label={`${activeCount} filtro${activeCount > 1 ? 's' : ''} aplicado${activeCount > 1 ? 's' : ''}`}
            className="ml-auto h-2.5 w-2.5 rounded-full bg-primary"
          />
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">
          Ordenar por
        </p>
        <select
          value={filters.sort}
          onChange={(e) => setFilters({ sort: e.target.value as SearchSort })}
          className="h-10 w-full rounded-md border border-input bg-background px-2.5 text-base sm:h-9 sm:px-2 sm:text-sm"
        >
          <option value="relevance">Relevância</option>
          <option value="price">Menor preço</option>
          <option value="rating">Melhor avaliação</option>
        </select>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">
          Busca por texto
        </p>
        <input
          type="text"
          placeholder="ex.: DJ pra casamento"
          value={filters.query ?? ''}
          onChange={(e) => setFilters({ query: e.target.value || null })}
          className="h-10 w-full rounded-md border border-input bg-background px-2.5 text-base sm:h-9 sm:px-2 sm:text-sm"
        />
      </div>

      {filters.groupSlug && (
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">
            Grupo
          </p>
          <button
            onClick={() => setFilters({ groupSlug: null })}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-4 py-2 text-sm text-primary sm:px-2.5 sm:py-1 sm:text-xs"
          >
            {filters.groupSlug.replace(/-/g, ' ')}
            <X className="h-4 w-4 sm:h-3 sm:w-3" />
          </button>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">
          Categoria
        </p>
        <div className="flex flex-col gap-1">
          {categories.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-md py-2 text-base sm:py-1 sm:text-sm"
            >
              <input
                type="radio"
                name="search-category"
                checked={filters.categoryId === c.id}
                onChange={() => setFilters({ categoryId: c.id, subcategoryIds: [] })}
                className="h-[18px] w-[18px] shrink-0 accent-primary sm:h-4 sm:w-4"
              />
              <span>{c.name}</span>
            </label>
          ))}
          {filters.categoryId != null && (
            <button
              onClick={() => setFilters({ categoryId: null, subcategoryIds: [] })}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:text-xs"
            >
              <X className="h-4 w-4 sm:h-3 sm:w-3" /> mudar categoria
            </button>
          )}
        </div>
      </div>

      {activeSubs.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">
            Especialidade
          </p>
          <div className="flex flex-wrap gap-2">
            {activeSubs.map((s) => {
              const on = filters.subcategoryIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSub(s.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition sm:px-2.5 sm:py-1 sm:text-xs ${
                    on
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary'
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">
          Faixa de preço (R$)
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="mín"
            value={filters.priceMin ?? ''}
            onChange={(e) =>
              setFilters({ priceMin: e.target.value ? Number(e.target.value) : null })
            }
            className="h-10 w-full rounded-md border border-input bg-background px-2.5 text-base sm:h-9 sm:px-2 sm:text-sm"
          />
          <span className="text-base text-muted-foreground sm:text-sm">—</span>
          <input
            type="number"
            min={0}
            placeholder="máx"
            value={filters.priceMax ?? ''}
            onChange={(e) =>
              setFilters({ priceMax: e.target.value ? Number(e.target.value) : null })
            }
            className="h-10 w-full rounded-md border border-input bg-background px-2.5 text-base sm:h-9 sm:px-2 sm:text-sm"
          />
        </div>
      </div>

      <button
        onClick={resetFilters}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-3 text-base hover:bg-accent sm:py-2 sm:text-sm"
      >
        <X className="h-5 w-5 sm:h-4 sm:w-4" /> Limpar filtros
      </button>
    </div>
  );
}
